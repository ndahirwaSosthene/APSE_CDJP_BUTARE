"""APSE authoritative workflow extension. DHIS2 remains identity/analytics platform.
Private records stay here; only explicitly approved non-sensitive observations may be mirrored.
"""
import unicodedata,base64,contextlib,csv,hashlib,hmac,io,json,math,os,re,secrets,sqlite3,threading,uuid
from collections import Counter
from datetime import datetime,date,timedelta,timezone
from pathlib import Path
from cryptography.fernet import Fernet
ROOT=Path(__file__).resolve().parents[1]
CONFIG=json.loads((ROOT/'app/config.json').read_text(encoding="utf-8"))
FORMS={f['code']:f for f in CONFIG['forms']};FIELDS=CONFIG['fields']
NOW=lambda:datetime.now(timezone.utc).isoformat()
TODAY=lambda:datetime.now(timezone(timedelta(hours=2))).date().isoformat()
class Fault(Exception):
 def __init__(self,status,code,details=None):self.status=status;self.code=code;self.details=details

def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def digest(x):return hashlib.sha256(canonical(x).encode()).hexdigest()
def ratio(n,d,factor=100):return None if n is None or d in [None,0] else n/d*factor

def validate(form,values,event_date,config=None):
 CONFIG=config or globals()["CONFIG"];FORMS={f["code"]:f for f in CONFIG["forms"]};FIELDS=CONFIG["fields"]
 f=FORMS.get(form)
 if not f or not f.get('active',True):raise Fault(400,'unknown_form')
 if not isinstance(values,dict) or set(values)-set(f['fields']):raise Fault(400,'unknown_field')
 try:date.fromisoformat(event_date)
 except (TypeError,ValueError):raise Fault(400,'invalid_date')
 # State/approval are managed by server, never trusted from a form field.
 v={k:unicodedata.normalize('NFC',str(x)) for k,x in values.items() if x is not None and str(x)!='' and k not in ['state','approved','approval_ref']};errors=[]
 for k in f['required']:
  if not v.get(k):errors.append('required:'+k)
 for k,s in v.items():
  field=FIELDS[k]
  if len(s)>20000:errors.append('too_long:'+k)
  typ=field['type']
  if typ in ['NUMBER','INTEGER_ZERO_OR_POSITIVE','INTEGER_POSITIVE']:
   try:
    n=float(s)
    if not math.isfinite(n):raise ValueError()
    if typ.startswith('INTEGER') and not n.is_integer():raise ValueError()
    if typ=='INTEGER_ZERO_OR_POSITIVE' and n<0:raise ValueError()
    if typ=='INTEGER_POSITIVE' and n<=0:raise ValueError()
   except ValueError:errors.append('number:'+k)
  if typ=='BOOLEAN' and s not in ['true','false']:errors.append('boolean:'+k)
  if typ=='DATE':
   try:date.fromisoformat(s)
   except ValueError:errors.append('date:'+k)
  if field.get('options') and s not in [o['code'] for o in CONFIG['options'][field['options']]]:errors.append('option:'+k)
 nonnegative=['budget','in_kind','planned_cost','spent','committed','local','secured','quantity','unit_cost','hours','km_start','km_end','fuel','balance','group_a_n','group_a_d','group_b_n','group_b_d']
 for k in nonnegative:
  if k in v:
   try:
    if float(v[k])<0:errors.append('nonnegative:'+k)
   except ValueError:pass
 def number(k):
  try:return float(v[k])
  except (KeyError,ValueError):return None
 if v.get('start') and v.get('end') and v['start']>v['end']:errors.append('date_order')
 for k in ['severity','probability']:
  if k in v and (number(k) is None or not 1<=number(k)<=4):errors.append('range:'+k)
 if 'hours'in v and (number('hours') is None or number('hours')>24):errors.append('hours_max24')
 for group in [['women','men','undisclosed'],['age_u18','age_18_24','age_25_34','age_35_49','age_50_64','age_65','age_unknown']]:
  if number('total') is not None and all(number(k) is not None for k in group) and sum(number(k) for k in group)!=number('total'):errors.append('total_mismatch')
 for a,b in [('unique','total'),('active','volunteers'),('compliant','assessed'),('disability','total'),('group_a_n','group_a_d'),('group_b_n','group_b_d')]:
  if number(a)is not None and number(b)is not None and number(a)>number(b):errors.append('exceeds:'+a)
 if 'consent'in f['required'] and v.get('consent')!='true':errors.append('documented_basis_required')
 if v.get('axis') and v.get('result') and not v['result'].startswith(v['axis']+'.'):errors.append('axis_result_mismatch')
 if v.get('intervention') and v['intervention'] not in [x['code'] for x in CONFIG['interventions']]:errors.append('invalid_intervention')
 if v.get('intervention') and v.get('axis') and not v['intervention'].startswith(v['axis']+'.'):errors.append('axis_intervention_mismatch')
 if number('spent') is not None and number('budget')is not None and number('spent')>number('budget') and not v.get('reason'):errors.append('overspend_reason')
 if form=='F33':
  for k in ['departure','arrival']:
   if not re.fullmatch(r'\d{2}:\d{2}',v.get(k,'')):errors.append('time:'+k)
   else:
    hh,mm=map(int,v[k].split(':'))
    if hh>23 or mm>59 or hh<6 or hh>=18:errors.append('no_night_vehicle_travel:'+k)
  if v.get('departure') and v.get('arrival') and v['arrival']<v['departure']:errors.append('mission_time_order')
  if number('km_start')is not None and number('km_end')is not None and number('km_end')<number('km_start'):errors.append('odometer_order')
 if form=='F35' and v.get('movement') not in ['IN','OUT','COUNT']:errors.append('invalid_movement')
 if form=='F30' and v.get('decision') not in ['CONTINUE','ADAPT','SCALE','STOP']:errors.append('adaptation_decision')
 if form=='F42':
  kpi=next((k for k in json.loads((ROOT/'registers/kpi_dictionary.json').read_text(encoding="utf-8")) if k['code']==v.get('indicator')),None)
  if v.get('axis') and v.get('indicator','').split('-')[0]!=v['axis']:errors.append('indicator_axis_mismatch')
  if not kpi:errors.append('unknown_indicator')
  elif kpi['kind']not in ['count','median','gap'] and not v.get('denominator'):errors.append('required:denominator')
 if errors:raise Fault(422,'validation_failed',errors)
 return v

from governance import Governance
from transfers import Transfers
from collection_forms import CollectionForms
from capture import Capture
from v1_redesign import V1Redesign

class Engine(Governance,Transfers,CollectionForms,Capture,V1Redesign):
 def __init__(self,path,key,audit_key):
  if len(audit_key)<32:raise ValueError('Audit key must be at least 32 bytes')
  self.crypto=Fernet(key);self.audit_key=audit_key;self.lock=threading.RLock();self.db=sqlite3.connect(path,check_same_thread=False,isolation_level=None);self.db.row_factory=sqlite3.Row
  self.db.executescript('''PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;
CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,form TEXT NOT NULL,unit TEXT NOT NULL,path TEXT NOT NULL,event_date TEXT NOT NULL,author TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL,version INTEGER NOT NULL,parent TEXT,body BLOB NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,record_id TEXT NOT NULL,revision INTEGER NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,body BLOB NOT NULL,time TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS history_no_update BEFORE UPDATE ON history BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TRIGGER IF NOT EXISTS history_no_delete BEFORE DELETE ON history BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TABLE IF NOT EXISTS requests(author TEXT NOT NULL,key TEXT NOT NULL,fingerprint TEXT NOT NULL,record_id TEXT NOT NULL,PRIMARY KEY(author,key));
CREATE TABLE IF NOT EXISTS transitions(id INTEGER PRIMARY KEY,record_id TEXT NOT NULL,actor TEXT NOT NULL,stage TEXT NOT NULL,reason BLOB NOT NULL,time TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS completions(record_id TEXT PRIMARY KEY,actor TEXT NOT NULL,body BLOB NOT NULL,time TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,record_id TEXT NOT NULL,severity INTEGER NOT NULL,created TEXT NOT NULL,acknowledged_by TEXT,acknowledged_at TEXT);
CREATE TABLE IF NOT EXISTS report_snapshots(id TEXT PRIMARY KEY,record_id TEXT NOT NULL,format TEXT NOT NULL,language TEXT NOT NULL,mime TEXT NOT NULL,digest TEXT NOT NULL,body BLOB NOT NULL,created TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS snapshots_no_update BEFORE UPDATE ON report_snapshots BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TRIGGER IF NOT EXISTS snapshots_no_delete BEFORE DELETE ON report_snapshots BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY,record_id TEXT NOT NULL,actor TEXT NOT NULL,mime TEXT NOT NULL,digest TEXT NOT NULL,body BLOB NOT NULL,time TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,time TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,object_id TEXT NOT NULL,body TEXT NOT NULL,previous TEXT NOT NULL,mac TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE INDEX IF NOT EXISTS rec_filter ON records(unit,form,state,event_date);
''')
  self.init_capture()
  self.init_collections()
  self.init_governance()
  self.init_v1()
 @contextlib.contextmanager
 def tx(self):
  with self.lock:
   self.db.execute('BEGIN IMMEDIATE')
   try:yield;self.db.execute('COMMIT')
   except Exception:self.db.execute('ROLLBACK');raise
 def enc(self,x):return self.crypto.encrypt(canonical(x).encode())
 def dec(self,x):return json.loads(self.crypto.decrypt(x))
 def roles(self,user):return set(user.get('roles',[]))
 def can(self,user,row,write=False):
  roles=self.roles(user);form=self.form_map()[row['form']]
  if not any(row['path']==p or row['path'].startswith(p+'/') for p in user.get('paths',[])):return False
  if not roles:return False
  if row['form']in ['F04','F05','F43'] and not roles&{'APSE_MEL','APSE_STAFF','APSE_COORDINATION','APSE_DIRECTION','APSE_FINANCE','APSE_HR'}:return False
  if dict(row).get('id')and self.is_trashed(row['id'])and'APSE_MEL'not in roles:return False
  if row['form'] in ['F03','F04','F05','F43'] and write:
   if not roles&{'APSE_MEL','APSE_STAFF','APSE_CPJP','APSE_COORDINATION','APSE_DIRECTION','APSE_FINANCE','APSE_HR'}:return False
   if any(x.get('dhis2_uid')==dict(row).get('unit') and x.get('kind') in ['CCJP','CEB'] for x in self.metadata()['organisation_units']):return False
  if 'APSE_MEL' in roles:return True
  if form.get('custom'):
   if not roles&({'APSE_MEL','APSE_COORDINATION','APSE_DIRECTION'}|set(form['audienceRoles'])):return False
   if not any(row['path']==p or row['path'].startswith(p+'/') for p in form['unitPaths']):return False
  self_owned=bool(dict(row).get('author')==user['id'] and row['form']in ['F31','F32'])
  if form['sensitive'] and not self_owned:
   allowed={'APSE_SENSITIVE','APSE_COORDINATION','APSE_DIRECTION'}
   if row['form']in ['F19','F34','F35','F36']:allowed|={'APSE_FINANCE'}
   if row['form']in ['F02','F31','F32','F37','F39']:allowed|={'APSE_HR'}
   if row['form']=='F25':allowed|={'APSE_MEL','APSE_EVALUATOR'}
   if not roles&allowed:return False
  if write and not roles&{'APSE_PARISH_REPORTER','APSE_MEL','APSE_CPJP','APSE_CCJP','APSE_CEB','APSE_FINANCE','APSE_SENSITIVE','APSE_HR','APSE_COORDINATION','APSE_COMMUNICATION','APSE_DIRECTION','APSE_STAFF'}:return False
  # Organisational management forms stay at authorised management roles.
  if row['form']in ['F01','F02','F19','F20','F24','F25','F31','F32','F34','F35','F36','F37','F39','F40'] and not self_owned and write and not roles&{'APSE_MEL','APSE_FINANCE','APSE_HR','APSE_COORDINATION','APSE_SENSITIVE','APSE_DIRECTION'}:return False
  return True
 def check(self,user,row,write=False):
  if not self.can(user,row,write):raise Fault(403,'access_denied')
  if write and dict(row).get('id')and self.is_trashed(row['id']):raise Fault(409,'record_in_recycle_bin')
 def audit(self,user,action,oid,body=None):
  old=self.db.execute('SELECT mac FROM audit ORDER BY seq DESC LIMIT 1').fetchone();previous=old['mac'] if old else 'GENESIS';stamp=NOW();payload=canonical(body or {});s=canonical([stamp,user['id'],action,oid,payload,previous]);mac=hmac.new(self.audit_key,s.encode(),hashlib.sha256).hexdigest()
  self.db.execute('INSERT INTO audit(time,actor,action,object_id,body,previous,mac)VALUES(?,?,?,?,?,?,?)',(stamp,user['id'],action,oid,payload,previous,mac))
  if action in ['CREATE','EDIT','TRANSITION','AMEND','VERIFY_ACTION_CLOSED']:
   row=self.db.execute('SELECT * FROM records WHERE id=?',(oid,)).fetchone()
   if row:self.db.execute('INSERT INTO history(record_id,revision,actor,action,body,time)VALUES(?,?,?,?,?,?)',(oid,row['revision'],user['id'],action,self.enc(self.serial(row)),stamp))
 def verify_audit(self):
  with self.lock:
   previous='GENESIS';n=0
   for r in self.db.execute('SELECT * FROM audit ORDER BY seq'):
    s=canonical([r['time'],r['actor'],r['action'],r['object_id'],r['body'],r['previous']]);expected=hmac.new(self.audit_key,s.encode(),hashlib.sha256).hexdigest()
    if r['previous']!=previous or not hmac.compare_digest(expected,r['mac']):raise Fault(500,'audit_integrity_failure')
    previous=r['mac'];n+=1
   return dict(entries=n,head=previous)
 def _row(self,i):
  r=self.db.execute('SELECT * FROM records WHERE id=?',(i,)).fetchone()
  if not r:raise Fault(404,'record_not_found')
  return r
 def serial(self,r):
  d={k:r[k] for k in r.keys() if k!='body'};d['values']=self.dec(r['body']);d['reviews']=[dict(actor=x['actor'],stage=x['stage'],time=x['time'],reason=self.dec(x['reason'])) for x in self.db.execute('SELECT * FROM transitions WHERE record_id=? ORDER BY id',(r['id'],))];comp=self.db.execute('SELECT * FROM completions WHERE record_id=?',(r['id'],)).fetchone();d['completion']=None if not comp else dict(actor=comp['actor'],time=comp['time'],values=self.dec(comp['body']));return d
 def get(self,user,i):
  with self.tx():
   r=self._row(i);self.check(user,r);self.audit(user,'READ',i);return dict(self.serial(r),editAllowed=('APSE_MEL' in self.roles(user) or self.delegated_edit(user,r)))
 def _links(self,user,values,form):
  for key in ['linked_record','lesson_ref']:
   if values.get(key):
    linked=self._row(values[key]);self.check(user,linked)
    if key=='lesson_ref' and (linked['form']!='F29' or linked['state']not in ['APPROVED','LOCKED']):raise Fault(422,'approved_lesson_required')
    if not self.form_map()[form]['sensitive'] and self.form_map()[linked['form']]['sensitive']:raise Fault(422,'anonymised_learning_source_required')
 def create(self,user,form,unit,path,event_date,values,key):
  if not re.fullmatch(r'[A-Za-z0-9_-]{16,100}',key or ''):raise Fault(400,'idempotency_key_required')
  # Unit paths are resolved from DHIS2 by HTTP adapter, never trusted from browser.
  if isinstance(values,dict)and not values.get('record'):values=dict(values,record=self.generated_record_code(user,form,unit,key))
  v=self.validate_plan(user,form,values,event_date,unit);row=dict(form=form,unit=unit,path=path,author=user['id']);self.check(user,row,True);
  if form in ['F31','F32']and not self.roles(user)&{'APSE_HR','APSE_MEL'}and v.get('owner')!=user['id']:raise Fault(403,'own_staff_record_only')
  if form=='F24' and v.get('title')=='R13':raise Fault(422,'results_report_requires_reporting_builder')
  fingerprint=digest([form,unit,event_date,v])
  with self.tx():
   req=self.db.execute('SELECT * FROM requests WHERE author=? AND key=?',(user['id'],key)).fetchone()
   if req:
    if req['fingerprint']!=fingerprint:raise Fault(409,'idempotency_conflict')
    self.check(user,self._row(req['record_id']));return self.serial(self._row(req['record_id']))
   self._links(user,v,form)
   # Business key duplicate requires human resolution, not a silent merge.
   for r in self.db.execute('SELECT body FROM records WHERE form=? AND unit=? AND parent IS NULL',(form,unit)):
    if self.dec(r['body']).get('record')==v.get('record'):raise Fault(409,'duplicate_business_code')
   i=str(uuid.uuid4());stamp=NOW();self.db.execute('INSERT INTO records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(i,form,unit,path,event_date,user['id'],'DRAFT',1,1,None,self.enc(v),stamp,stamp));self.db.execute('INSERT INTO requests VALUES(?,?,?,?)',(user['id'],key,fingerprint,i));self.audit(user,'CREATE',i,{'form':form,'content_digest':digest(v)});
   if form=='F17'and int(v.get('severity',0))>=3:self.db.execute('INSERT INTO notifications VALUES(?,?,?,?,NULL,NULL)',(str(uuid.uuid4()),i,int(v['severity']),NOW()))
   return self.serial(self._row(i))
 def edit(self,user,i,revision,values,event_date):
  with self.tx():
   r=self._row(i);self.check(user,r,True)
   if r['form']=='F24' and self.dec(r['body']).get('title')=='R13':raise Fault(409,'results_report_requires_new_snapshot')
   if 'APSE_MEL' not in self.roles(user) and not self.delegated_edit(user,r):raise Fault(403,'mel_edit_permission_required')
   if r['revision']!=revision:raise Fault(409,'revision_conflict')
   if r['state'] not in ['DRAFT','CORRECTION'] and not (('APSE_MEL' in self.roles(user) or self.delegated_edit(user,r)) and r['state'] in ['SUBMITTED','MEL_VALIDATED','VERIFIED']):raise Fault(409,'amendment_required')
   if r['state'] in ['SUBMITTED','MEL_VALIDATED','VERIFIED']:self.db.execute("UPDATE records SET state='SUBMITTED' WHERE id=?",(i,))
   v=self.validate_plan(user,r['form'],values,event_date,r['unit']);
   if r['form']in ['F31','F32']and not self.roles(user)&{'APSE_HR','APSE_MEL'}and v.get('owner')!=user['id']:raise Fault(403,'own_staff_record_only')
   self._links(user,v,r['form']);self.db.execute('UPDATE records SET body=?,event_date=?,revision=revision+1,updated=? WHERE id=?',(self.enc(v),event_date,NOW(),i));self.audit(user,'EDIT',i,{'before':digest(self.dec(r['body'])),'after':digest(v)});
   if r['form']=='F17'and int(v.get('severity',0))>=3 and int(v.get('severity',0))>int(self.dec(r['body']).get('severity',0)):self.db.execute('INSERT INTO notifications VALUES(?,?,?,?,NULL,NULL)',(str(uuid.uuid4()),i,int(v['severity']),NOW()))
   return self.serial(self._row(i))
 def transition(self,user,i,revision,target,reason):
  if not reason or len(reason)>2000:raise Fault(422,'review_reason_required')
  roles=self.roles(user)
  with self.tx():
   r=self._row(i);self.check(user,r);v=self.dec(r['body']);state=r['state']
   if self.is_trashed(i):raise Fault(409,'record_in_recycle_bin')
   if r['revision']!=revision:raise Fault(409,'revision_conflict')
   submit_target='CPJP_REVIEW'if v.get('reporter_level')in ['SPECIALIST','FIELD']else'SUBMITTED'
   flow={'DRAFT':(submit_target,set()),'CORRECTION':(submit_target,set()),'CPJP_REVIEW':('SUBMITTED',{'APSE_CPJP'}),'SUBMITTED':('MEL_VALIDATED',{'APSE_MEL'}),'MEL_VALIDATED':('VERIFIED',{'APSE_COORDINATION'}),'VERIFIED':('APPROVED',{'APSE_DIRECTION'}),'APPROVED':('LOCKED',{'APSE_DIRECTION'})}
   if target=='CORRECTION':
    if state not in ['SUBMITTED','MEL_VALIDATED','VERIFIED'] or not roles&{'APSE_MEL','APSE_DIRECTION','APSE_COORDINATION'}:raise Fault(403,'transition_denied')
   else:
    if state not in flow or flow[state][0]!=target:raise Fault(409,'invalid_transition')
    permitted=flow[state][1]
    if target in ['SUBMITTED','CPJP_REVIEW']:
     self.check(user,r,True)
     if state=='CPJP_REVIEW':
      if not roles&{'APSE_CPJP'} or r['author']==user['id']:raise Fault(403,'independent_cpjp_committee_required')
     elif r['author']!=user['id']:raise Fault(403,'author_only')
    elif not roles&permitted:raise Fault(403,'review_role_required')
   if target not in ['SUBMITTED','CPJP_REVIEW','MEL_VALIDATED','CORRECTION'] and r['author']==user['id']:raise Fault(403,'independent_reviewer_required')
   if target in ['VERIFIED','APPROVED']:
    stages=list(self.db.execute('SELECT id,stage FROM transitions WHERE record_id=? ORDER BY id',(i,)))
    submitted=max((x['id'] for x in stages if x['stage']=='SUBMITTED'),default=0)
    mel=max((x['id'] for x in stages if x['stage']=='MEL_VALIDATED'),default=0)
    if mel<=submitted:raise Fault(409,'current_mel_validation_required')
    if target=='APPROVED' and not any(x['stage']=='VERIFIED' and x['id']>mel for x in stages):raise Fault(409,'current_coordinator_verification_required')
   if target=='APPROVED':
    reviewers={x[0] for x in self.db.execute("SELECT actor FROM transitions WHERE record_id=? AND stage IN('MEL_VALIDATED','VERIFIED')",(i,))}
    if user['id']in reviewers:raise Fault(403,'independent_approver_required')
    if r['form']=='F24' and v.get('title')=='R13':
     from rbm import NARRATIVE
     try:narrative=json.loads(v.get('method','{}'))
     except ValueError:raise Fault(422,'results_narrative_required')
     if not v.get('evidence','').startswith('snapshot:') or not self.db.execute('SELECT 1 FROM report_snapshots WHERE id=? AND record_id=?',(v.get('evidence','')[9:],i)).fetchone():raise Fault(422,'results_report_snapshot_required')
     if any(not narrative.get(k) for k in NARRATIVE):raise Fault(422,'results_narrative_required')
    if not v.get('evidence'):raise Fault(422,'evidence_required_for_approval')
    # For learning-use approval, the referenced lesson is still approved and accessible.
    self._links(user,v,r['form'])
   if target in ['SUBMITTED','CPJP_REVIEW']:
    self.validate_capture(user,r['form'],v,r['event_date'],submitting=True)
    self.validate_plan(user,r['form'],v,r['event_date'],r['unit'])
    # Resubmission starts a fresh review cycle; old audit trail stays intact.
   self.db.execute('UPDATE records SET state=?,revision=revision+1,updated=? WHERE id=?',(target,NOW(),i));self.db.execute('INSERT INTO transitions(record_id,actor,stage,reason,time)VALUES(?,?,?,?,?)',(i,user['id'],target,self.enc({'reason':reason}),NOW()));self.audit(user,'TRANSITION',i,{'from':state,'to':target,'reason_digest':digest(reason)});return self.serial(self._row(i))
 def amend(self,user,i,reason):
  if not reason:raise Fault(422,'amendment_reason_required')
  with self.tx():
   r=self._row(i);self.check(user,r,True)
   if r['form']=='F24' and self.dec(r['body']).get('title')=='R13':raise Fault(409,'results_report_requires_new_snapshot')
   if r['author']!=user['id'] and 'APSE_MEL' not in self.roles(user):raise Fault(403,'author_or_mel_required')
   if r['state']not in ['APPROVED','LOCKED']:raise Fault(409,'not_final')
   if self.db.execute('SELECT 1 FROM records WHERE parent=?',(i,)).fetchone():raise Fault(409,'amendment_exists')
   new=str(uuid.uuid4());stamp=NOW();self.db.execute('INSERT INTO records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(new,r['form'],r['unit'],r['path'],r['event_date'],user['id'],'DRAFT',1,r['version']+1,i,r['body'],stamp,stamp));self.audit(user,'AMEND',new,{'parent':i,'reason_digest':digest(reason)});return self.serial(self._row(new))
 def close_action(self,user,i,values):
  with self.tx():
   r=self._row(i);self.check(user,r);v=self.dec(r['body'])
   if not self.roles(user)&{'APSE_REVIEWER','APSE_MEL','APSE_DIRECTION','APSE_CURE'}:raise Fault(403,'review_role_required')
   if user['id']in [r['author'],v.get('owner')]:raise Fault(403,'independent_verification_required')
   if r['state']not in ['APPROVED','LOCKED'] or not v.get('action'):raise Fault(409,'approved_action_required')
   if not values.get('effect') or not values.get('evidence'):raise Fault(422,'effect_and_evidence_required')
   if self.db.execute('SELECT 1 FROM completions WHERE record_id=?',(i,)).fetchone():raise Fault(409,'already_closed')
   self.db.execute('INSERT INTO completions VALUES(?,?,?,?)',(i,user['id'],self.enc({'effect':str(values['effect'])[:20000],'evidence':str(values['evidence'])[:1000]}),NOW()));self.audit(user,'VERIFY_ACTION_CLOSED',i,{'effect_digest':digest(values['effect'])});return self.serial(self._row(i))
 def listing(self,user,start,end,form=None,unit=None,approved=False):
  try:
   if date.fromisoformat(start)>date.fromisoformat(end):raise ValueError()
  except (ValueError,TypeError):raise Fault(400,'invalid_range')
  with self.tx():
   sql='SELECT r.* FROM records r WHERE event_date>=? AND event_date<=?';params=[start,end]
   if form:sql+=' AND form=?';params.append(form)
   if unit:sql+=' AND unit=?';params.append(unit)
   if approved:
    sql+=" AND state IN('APPROVED','LOCKED') AND NOT EXISTS(SELECT 1 FROM records newer WHERE newer.parent=r.id AND newer.state IN('APPROVED','LOCKED'))"
   rows=[self.serial(r) for r in self.db.execute(sql+' ORDER BY event_date,id',params) if self.can(user,r)and not self.is_trashed(r['id'])]
   self.audit(user,'LIST',form or 'ALL',{'start':start,'end':end,'count':len(rows),'approved':approved});return rows
 def dashboard(self,user,start,end):
  allrows=self.listing(user,start,end);rows=self.listing(user,start,end,approved=True);today=TODAY();pending=[r for r in rows if r['values'].get('action') and r['values'].get('due','9999')<today and not r['completion']]
  def total(form,key):
   vv=[float(r['values'][key]) for r in rows if r['form']==form and r['values'].get(key)not in [None,'']];return sum(vv) if vv else None
  spend=total('F19','spent');budget=total('F03','budget');local=total('F19','local');lessons=[r for r in rows if r['form']=='F29'];uses=[r for r in rows if r['form']=='F30'];closed=[r for r in uses if r['completion']]
  indicators=self.indicators(rows)
  balances={}
  for r in sorted([r for r in rows if r['form']=='F35'],key=lambda r:(r['event_date'],r['created'])):
   v=r['values'];key=r['unit']+':'+v['asset'];q=float(v.get('quantity',0));movement=v.get('movement');balances[key]=q if movement=='COUNT'else balances.get(key,0)+(q if movement=='IN'else -q)
  operations=dict(assetRecords=sum(r['form']=='F34'for r in rows),stockBalances=balances,contractsExpiring=sum(r['form']=='F37'and bool(r['values'].get('expiry'))and r['values']['expiry']<=today for r in rows),leaveRecords=sum(r['form']=='F32'for r in rows),lateProcurements=sum(r['form']=='F36'and r['values'].get('due','9999')<today and not r['values'].get('delivery') for r in rows),missions=sum(r['form']=='F33'for r in rows),capacityActions=sum(r['form']=='F38'for r in rows),performanceReviews=sum(r['form']=='F39'for r in rows))
  return dict(start=start,end=end,indicators=indicators,operations=operations,states=dict(Counter(r['state'] for r in allrows)),approvedRecords=len(rows),byAxis=dict(Counter(r['values'].get('axis','UNASSIGNED') for r in rows)),activities=sum(r['form']=='F07' for r in rows),attendances=total('F07','total'),uniquePeople=None,budget=budget,spent=spend,localContribution=local,budgetExecution=ratio(spend,budget),hours=total('F31','hours'),learning=dict(questions=sum(r['form']=='F27' for r in rows),reviews=sum(r['form']=='F28' for r in rows),validatedLessons=len(lessons),adaptations=len(uses),verifiedAdaptations=len(closed),learningUseRate=ratio(len({r['values']['lesson_ref'] for r in uses}&{r['id']for r in lessons}),len(lessons)),verifiedAdaptationRate=ratio(len(closed),len(uses))),overdueActions=[dict(id=r['id'],form=r['form'],due=r['values']['due']) for r in pending],criticalAlerts=[dict(id=r['id'],form=r['form']) for r in allrows if r['form']=='F17' and float(r['values'].get('severity',0))>=3 and not r['completion']],limitations=['Scope reflects current user permissions','Attendance totals are not deduplicated people','No observations means null, not zero','Financial totals use F19 only; plans are not double-counted'])
 def indicators(self,rows):
  import statistics
  dictionary=json.loads((ROOT/'registers/kpi_dictionary.json').read_text(encoding="utf-8"));out=[]
  for item in dictionary:
   observations=[r for r in rows if r['form']=='F42' and r['values'].get('indicator')==item['code']]
   kind=item['kind'];n=sum(float(r['values']['numerator'])for r in observations)if observations else None
   ds=[float(r['values']['denominator'])for r in observations if r['values'].get('denominator')not in [None,'']];d=sum(ds)if ds else None
   if kind=='median':value=statistics.median(float(r['values']['numerator'])for r in observations)if observations else None
   elif kind=='count':value=n
   elif kind=='gap':
    eq=[r for r in rows if r['form']=='F41'];values=[]
    for r in eq:
     v=r['values']
     try:
      a=ratio(float(v['group_a_n']),float(v['group_a_d']));b=ratio(float(v['group_b_n']),float(v['group_b_d']))
      if a is not None and b is not None:values.append(dict(record=r['id'],gapPercentagePoints=a-b,theme=v.get('theme')))
     except (KeyError,ValueError):pass
    value=values or None
   else:value=ratio(n,d,1 if kind=='unit'else 100)
   out.append(dict(code=item['code'],label=item['label'],kind=kind,numerator=n,denominator=d,value=value,observations=len(observations)))
  return out
 def alerts(self,user):
  with self.tx():
   out=[]
   for n in self.db.execute('SELECT * FROM notifications WHERE acknowledged_at IS NULL ORDER BY severity DESC,created'):
    r=self._row(n['record_id'])
    if self.can(user,r):out.append(dict(id=n['id'],record=r['id'],severity=n['severity'],created=n['created']))
   self.audit(user,'READ_ALERTS','INBOX',{'count':len(out)});return out
 def acknowledge_alert(self,user,i):
  with self.tx():
   n=self.db.execute('SELECT * FROM notifications WHERE id=?',(i,)).fetchone()
   if not n:raise Fault(404,'alert_not_found')
   self.check(user,self._row(n['record_id']))
   if not self.roles(user)&{'APSE_SENSITIVE'}:raise Fault(403,'safeguarding_role_required')
   self.db.execute('UPDATE notifications SET acknowledged_by=?,acknowledged_at=? WHERE id=?',(user['id'],NOW(),i));self.audit(user,'ACKNOWLEDGE_ALERT',i);return dict(acknowledged=True)
 def results_report_rows(self,user,start,end,unit=None):
  try:
   if date.fromisoformat(start)>date.fromisoformat(end):raise ValueError()
  except (ValueError,TypeError):raise Fault(422,'invalid_range')
  with self.lock:
   rows=[]
   for r in self.db.execute("SELECT r.* FROM records r WHERE state IN('APPROVED','LOCKED') AND NOT EXISTS(SELECT 1 FROM records n WHERE n.parent=r.id AND n.state IN('APPROVED','LOCKED'))"):
    if not self.can(user,r) or (unit and unit!=r['unit'] and unit not in r['path'].split('/')):continue
    x=self.serial(r);v=x['values']
    if r['form']=='F03':
     if v.get('start','9999')<=end and v.get('end','0000')>=start:rows.append(x)
    elif start<=r['event_date']<=end:rows.append(x)
   self.audit(user,'RESULTS_REPORT_SOURCES',unit or 'AUTHORISED_SCOPE',{'start':start,'end':end,'count':len(rows)})
   return rows
 def freeze_report(self,user,unit,path,code,language,fmt,start,end,narrative=None):
  if not self.roles(user)&{'APSE_MEL','APSE_DIRECTION'}:raise Fault(403,'report_manager_required')
  from reports import generate
  # The same database transaction fixes the source selection and snapshot atomically.
  with self.tx():
   rows=[self.serial(r)for r in self.db.execute("SELECT r.* FROM records r WHERE event_date>=? AND event_date<=? AND state IN('APPROVED','LOCKED') AND NOT EXISTS(SELECT 1 FROM records n WHERE n.parent=r.id AND n.state IN('APPROVED','LOCKED'))",(start,end))if self.can(user,r)]
   if code=='R13':
    from rbm import narrative_checked
    narrative=narrative_checked(narrative);rows=self.results_report_rows(user,start,end,unit)
   data,mime=generate(rows,code,language,fmt,start,end,self.configuration(),narrative);rid=str(uuid.uuid4());sid=str(uuid.uuid4());stamp=NOW();row=dict(form='F24',unit=unit,path=path);self.check(user,row,True);values=dict(record='REPORT-'+sid,title=code,start=start,end=end,owner=user['id'],evidence='snapshot:'+sid,method='Frozen approved source extract; independently review this report record')
   if code=='R13':values['method']=canonical(narrative);values['reason']='PS result-based report; immutable narrative and source snapshot'
   self.db.execute('INSERT INTO records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(rid,'F24',unit,path,TODAY(),user['id'],'DRAFT',1,1,None,self.enc(values),stamp,stamp));self.db.execute('INSERT INTO report_snapshots VALUES(?,?,?,?,?,?,?,?)',(sid,rid,fmt,language,mime,hashlib.sha256(data).hexdigest(),self.crypto.encrypt(data),stamp));self.audit(user,'CREATE',rid,{'snapshot':sid,'sourceRecords':len(rows)});self.audit(user,'FREEZE_REPORT',sid,{'record':rid,'sha256':hashlib.sha256(data).hexdigest()});return dict(snapshot=sid,record=self.serial(self._row(rid)),sha256=hashlib.sha256(data).hexdigest())
 def report_snapshot(self,user,sid):
  with self.tx():
   snapshot=self.db.execute('SELECT * FROM report_snapshots WHERE id=?',(sid,)).fetchone()
   if not snapshot:raise Fault(404,'snapshot_not_found')
   row=self._row(snapshot['record_id']);self.check(user,row)
   if not self.roles(user)&{'APSE_MEL','APSE_COORDINATION','APSE_DIRECTION','APSE_FINANCE'}:raise Fault(403,'report_reader_required')
   self.audit(user,'READ_FROZEN_REPORT',sid);return dict(mime=snapshot['mime'],data=self.crypto.decrypt(snapshot['body']),format=snapshot['format'],state=row['state'],sha256=snapshot['digest'])
 def add_evidence(self,user,i,mime,data):
  if len(data)>10*1024*1024:raise Fault(413,'file_too_large')
  valid={'application/pdf':data.startswith(b'%PDF-'),'image/png':data.startswith(b'\x89PNG\r\n\x1a\n'),'image/jpeg':data.startswith(b'\xff\xd8\xff')}
  if not valid.get(mime):raise Fault(415,'unsupported_evidence_type')
  with self.tx():
   r=self._row(i);self.check(user,r,True)
   if ('APSE_MEL' not in self.roles(user) and not self.delegated_edit(user,r)) or r['state']not in ['DRAFT','CORRECTION']:raise Fault(403,'draft_author_only')
   eid=str(uuid.uuid4());self.db.execute('INSERT INTO evidence VALUES(?,?,?,?,?,?,?)',(eid,i,user['id'],mime,hashlib.sha256(data).hexdigest(),self.crypto.encrypt(data),NOW()));self.audit(user,'ATTACH_EVIDENCE',eid,{'record':i,'bytes':len(data)});return dict(id=eid,digest=hashlib.sha256(data).hexdigest(),reference='evidence:'+eid)
 def evidence(self,user,eid):
  with self.tx():
   e=self.db.execute('SELECT * FROM evidence WHERE id=?',(eid,)).fetchone()
   if not e:raise Fault(404,'evidence_not_found')
   self.check(user,self._row(e['record_id']));self.audit(user,'READ_EVIDENCE',eid);return e['mime'],self.crypto.decrypt(e['body'])
