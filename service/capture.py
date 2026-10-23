"""Encrypted working drafts, recoverable removal and language-independent capture rules."""
import json,re,uuid,hashlib,unicodedata
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
class Capture:
 def init_capture(self):
  self.db.executescript('''CREATE TABLE IF NOT EXISTS working_drafts(id TEXT PRIMARY KEY,owner TEXT NOT NULL,form TEXT NOT NULL,unit TEXT NOT NULL,path TEXT NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,body BLOB NOT NULL,updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS draft_history(id INTEGER PRIMARY KEY,draft_id TEXT NOT NULL,actor TEXT NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,body BLOB NOT NULL,time TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS draft_history_no_update BEFORE UPDATE ON draft_history BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TRIGGER IF NOT EXISTS draft_history_no_delete BEFORE DELETE ON draft_history BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TABLE IF NOT EXISTS record_recycle(id INTEGER PRIMARY KEY,record_id TEXT NOT NULL,active INTEGER NOT NULL,actor TEXT NOT NULL,reason BLOB NOT NULL,time TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS recycle_no_update BEFORE UPDATE ON record_recycle BEGIN SELECT RAISE(ABORT,'append_only');END;
CREATE TRIGGER IF NOT EXISTS recycle_no_delete BEFORE DELETE ON record_recycle BEGIN SELECT RAISE(ABORT,'append_only');END;''')
  self.geo=json.loads((ROOT/'registers/geography.json').read_text(encoding='utf-8'))
 def geography(self):
  out={k:v for k,v in self.geo.items()if k not in ['districts','sectors','cells']};m=self.metadata()
  for group,kind in [('districts','DISTRICT'),('sectors','SECTOR'),('cells','CELL')]:out[group]=[dict(code=x['code'],name=x['labels'].get('rw')or x['labels']['fr'],parent=x.get('parent'))for x in m.get('geography_units',[])if x.get('kind')==kind and x.get('active',True)]
  for group in ['districts','sectors','cells']:out[group].sort(key=lambda x:x['code'])
  return out
 def generated_record_code(self,user,form,unit,key):return 'APSE-'+form+'-'+hashlib.sha256(json.dumps([user['id'],form,unit,key],ensure_ascii=False).encode()).hexdigest()[:20].upper()
 def validate_capture(self,user,form,v,event_date,submitting=False):
  from engine import Fault
  roles=self.roles(user)
  if form in ['F04','F05','F43'] and not roles&{'APSE_MEL','APSE_STAFF','APSE_COORDINATION','APSE_DIRECTION','APSE_FINANCE','APSE_HR'}:raise Fault(403,'cpjp_annual_planning_only')
  if form=='F03' and v.get('plan_type')=='CPJP' and not roles&{'APSE_CPJP','APSE_MEL','APSE_COORDINATION','APSE_DIRECTION','APSE_STAFF'}:raise Fault(403,'planning_cdjp_cpjp_only')
  if v.get('ap'):
   year=next((y for y in self.metadata()['years']if y['code']==v['ap'] and y.get('active',True)),None)
   if not year:raise Fault(422,'unknown_ap')
   if form in ['F03','F04','F05','F43'] and any(not year['start']<=v.get(k,event_date)<=year['end']for k in ['start','end']):raise Fault(422,'activity_outside_selected_ap')
  def selected(key):return [x.strip()for x in v.get(key,'').split(',')if x.strip()]
  geo=self.geography()
  districts=selected('district');sectors=selected('sector');cells=selected('cell')
  for key,items,parents,required in [('district',geo['districts'],None,None),('sector',geo['sectors'],districts,'district'),('cell',geo['cells'],sectors,'sector')]:
   values=selected(key)
   if not values:continue
   index={x['code']:x for x in items}
   if len(values)!=len(set(values)) or any(code not in index for code in values):raise Fault(422,'invalid_'+key+'_selection')
   if required and (not parents or any(index[code]['parent']not in parents for code in values)):raise Fault(422,key+'_parent_mismatch')
  if v.get('capture_profile')=='V8':
   if v.get('preparer_mode') and v['preparer_mode']not in ['COMMITTEE','PAIR']:raise Fault(422,'invalid_preparation_mode')
   if v.get('reporter_level') and v['reporter_level']not in ['SPECIALIST','FIELD','COMMITTEE','CDJP']:raise Fault(422,'invalid_reporter_level')
   if v.get('reporter_level')=='COMMITTEE' and not roles&{'APSE_CPJP','APSE_MEL'}:raise Fault(403,'cpjp_committee_role_required')
   if v.get('reporter_level')=='SPECIALIST' and not v.get('volet'):raise Fault(422,'specialist_volet_required')
   if submitting:
    count=7 if v.get('preparer_mode')=='COMMITTEE' else 2
    if not v.get('preparer_mode')or any(not v.get('preparer_'+str(i),'').strip()for i in range(1,count+1)):raise Fault(422,'preparation_names_required',{'count':count})
    names=[unicodedata.normalize('NFC',v['preparer_'+str(i)]).strip().casefold()for i in range(1,count+1)]
    if len(set(names))!=count:raise Fault(422,'distinct_preparation_names_required')
    if v.get('reporter_level')=='COMMITTEE' and v.get('preparer_mode')!='COMMITTEE':raise Fault(422,'committee_seven_names_required')
    if any(v.get(k)!='true'for k in ['cnv_checked','dnh_checked','trauma_checked']) or not v.get('sensitivity_notes','').strip():raise Fault(422,'sensitivity_review_required')
    if (form=='F07'or v.get('total')not in [None,'']) and any(v.get(k)in [None,'']for k in ['total','women','men','undisclosed','disability']):raise Fault(422,'gender_disability_disaggregation_required')
   if submitting and not roles&{'APSE_MEL','APSE_STAFF','APSE_COORDINATION','APSE_DIRECTION','APSE_FINANCE','APSE_HR'}:
    allowed={'SPECIALIST','FIELD','COMMITTEE'}if 'APSE_CPJP'in roles else{'SPECIALIST','FIELD'}
    if v.get('reporter_level')not in allowed:raise Fault(403,'parish_report_requires_cpjp_committee')
  return v
 def save_working_draft(self,user,payload,unit,path):
  from engine import Fault,NOW
  if not isinstance(payload,dict):raise Fault(422,'invalid_draft')
  did=payload.get('id','')
  try:uuid.UUID(did)
  except (ValueError,AttributeError,TypeError):raise Fault(422,'invalid_draft_id')
  form=payload.get('form');f=self.form_map().get(form)
  if not f:raise Fault(422,'unknown_form')
  self.check(user,dict(form=form,unit=unit,path=path,author=user['id']),True)
  if not f.get('active',True):raise Fault(422,'collection_closed')
  values=payload.get('values',{})
  if not isinstance(values,dict)or set(values)-set(f['fields'])or any(not isinstance(x,(str,int,float,bool))or len(str(x))>20000 for x in values.values())or len(json.dumps(values))>350000:raise Fault(422,'invalid_draft_values')
  event=payload.get('event_date')
  try:date.fromisoformat(event)
  except (ValueError,TypeError):raise Fault(422,'invalid_date')
  safe=dict(form=form,unit=unit,event_date=event,values=values,record_id=payload.get('record_id'),base_revision=payload.get('base_revision'),language=payload.get('language','rw'),requestKey=payload.get('requestKey'))
  if safe['language']not in ['rw','en','fr','sw']:raise Fault(422,'invalid_language')
  if safe['record_id']:
   r=self._row(safe['record_id']);self.check(user,r)
   if r['form']!=form or r['unit']!=unit:raise Fault(422,'draft_record_mismatch')
  with self.tx():
   old=self.db.execute('SELECT * FROM working_drafts WHERE id=?',(did,)).fetchone()
   if old:
    self.check(user,dict(form=old['form'],unit=old['unit'],path=old['path'],author=old['owner']))
    if old['owner']!=user['id'] and 'APSE_MEL'not in self.roles(user):raise Fault(403,'draft_owner_or_mel_required')
    if old['form']!=form or old['unit']!=unit:raise Fault(409,'draft_identity_immutable')
    if payload.get('revision')!=old['revision']:raise Fault(409,'draft_revision_conflict')
    if old['status']!='ACTIVE':raise Fault(409,'draft_not_active')
   elif payload.get('revision',0)!=0:raise Fault(409,'draft_revision_conflict')
   revision=(old['revision']if old else 0)+1;stamp=NOW();owner=old['owner']if old else user['id'];body=self.enc(safe)
   self.db.execute('INSERT INTO working_drafts VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,body=excluded.body,updated=excluded.updated',(did,owner,form,unit,path,revision,'ACTIVE',body,stamp))
   self.db.execute('INSERT INTO draft_history(draft_id,actor,revision,status,body,time)VALUES(?,?,?,?,?,?)',(did,user['id'],revision,'ACTIVE',body,stamp));self.audit(user,'AUTOSAVE_DRAFT',did,{'revision':revision,'owner':owner})
   return dict(id=did,revision=revision,updated=stamp,status='ACTIVE')
 def draft_listing(self,user,status='ACTIVE'):
  from engine import Fault
  if status not in ['ACTIVE','TRASH','COMMITTED']:raise Fault(422,'invalid_draft_status')
  out=[]
  with self.tx():
   for r in self.db.execute('SELECT * FROM working_drafts WHERE status=? ORDER BY updated DESC',(status,)):
    if r['owner']!=user['id']and'APSE_MEL'not in self.roles(user):continue
    if not self.can(user,dict(form=r['form'],unit=r['unit'],path=r['path'],author=r['owner'])):continue
    out.append(dict(id=r['id'],owner=r['owner'],form=r['form'],unit=r['unit'],revision=r['revision'],status=r['status'],updated=r['updated'],payload=self.dec(r['body'])))
   self.audit(user,'LIST_WORKING_DRAFTS','DRAFTS',{'status':status,'count':len(out)})
  return out
 def draft_action(self,user,did,revision,action):
  from engine import Fault,NOW
  with self.tx():
   r=self.db.execute('SELECT * FROM working_drafts WHERE id=?',(did,)).fetchone()
   if not r:raise Fault(404,'draft_not_found')
   self.check(user,dict(form=r['form'],unit=r['unit'],path=r['path'],author=r['owner']))
   if r['owner']!=user['id']and'APSE_MEL'not in self.roles(user):raise Fault(403,'draft_owner_or_mel_required')
   if revision!=r['revision']:raise Fault(409,'draft_revision_conflict')
   mapping={'TRASH':('ACTIVE','TRASH'),'RESTORE':('TRASH','ACTIVE'),'COMMIT':('ACTIVE','COMMITTED')}
   if action not in mapping or r['status']!=mapping[action][0]:raise Fault(409,'invalid_draft_transition')
   state=mapping[action][1];stamp=NOW();self.db.execute('UPDATE working_drafts SET status=?,revision=revision+1,updated=? WHERE id=?',(state,stamp,did));self.db.execute('INSERT INTO draft_history(draft_id,actor,revision,status,body,time)VALUES(?,?,?,?,?,?)',(did,user['id'],revision+1,state,r['body'],stamp));self.audit(user,'DRAFT_'+action,did,{'revision':revision+1});return dict(id=did,revision=revision+1,status=state)
 def is_trashed(self,i):
  row=self.db.execute('SELECT active FROM record_recycle WHERE record_id=? ORDER BY id DESC LIMIT 1',(i,)).fetchone();return bool(row and row['active'])
 def recycle_record(self,user,i,revision,restore,reason):
  from engine import Fault,NOW
  if 'APSE_MEL'not in self.roles(user):raise Fault(403,'mel_recycle_only')
  if not isinstance(reason,str)or not reason.strip()or len(reason)>2000:raise Fault(422,'change_reason_required')
  with self.tx():
   r=self._row(i);self.check(user,r)
   if r['revision']!=revision:raise Fault(409,'revision_conflict')
   if r['state']in ['APPROVED','LOCKED']:raise Fault(409,'approved_record_cannot_be_trashed')
   if self.is_trashed(i)!=restore:raise Fault(409,'recycle_state_conflict')
   self.db.execute('INSERT INTO record_recycle(record_id,active,actor,reason,time)VALUES(?,?,?,?,?)',(i,int(not restore),user['id'],self.enc(reason),NOW()));self.db.execute('UPDATE records SET revision=revision+1,updated=? WHERE id=?',(NOW(),i));self.audit(user,'RECORD_RESTORED'if restore else'RECORD_TRASHED',i,{'reasonHash':hashlib.sha256(reason.encode()).hexdigest()});return self.serial(self._row(i))
 def recycle_listing(self,user):
  from engine import Fault
  if 'APSE_MEL'not in self.roles(user):raise Fault(403,'mel_recycle_only')
  with self.tx():
   out=[self.serial(r)for r in self.db.execute('SELECT * FROM records ORDER BY updated DESC')if self.is_trashed(r['id'])and self.can(user,r)];self.audit(user,'LIST_RECYCLE','RECYCLE',{'count':len(out)});return out
