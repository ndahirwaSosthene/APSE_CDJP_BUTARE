"""MEL-authored immutable collection schemas and scoped, expiring edit delegation."""
import json,re,uuid
from datetime import datetime,timezone,timedelta
class CollectionForms:
 def init_collections(self):
  self.db.executescript('''CREATE TABLE IF NOT EXISTS collection_schemas(code TEXT PRIMARY KEY,body TEXT NOT NULL,actor TEXT NOT NULL,time TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS collection_no_update BEFORE UPDATE ON collection_schemas BEGIN SELECT RAISE(ABORT,'immutable_schema');END;
CREATE TRIGGER IF NOT EXISTS collection_no_delete BEFORE DELETE ON collection_schemas BEGIN SELECT RAISE(ABORT,'immutable_schema');END;
CREATE TABLE IF NOT EXISTS collection_status(code TEXT PRIMARY KEY,active INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS edit_permissions(id TEXT PRIMARY KEY,record_id TEXT NOT NULL,grantee TEXT NOT NULL,revision INTEGER NOT NULL,expires TEXT NOT NULL,actor TEXT NOT NULL,reason BLOB NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
''')
 def collection_schemas(self):
  return [json.loads(r[0]) for r in self.db.execute('SELECT body FROM collection_schemas ORDER BY code')]
 def publish_collection(self,user,schema):
  from engine import Fault,NOW,canonical
  if 'APSE_MEL' not in self.roles(user):raise Fault(403,'mel_metadata_only')
  if not isinstance(schema,dict):raise Fault(422,'invalid_collection_schema')
  code=schema.get('code','')
  if not isinstance(code,str) or not re.fullmatch(r'C[A-Z0-9_]{2,30}',code):raise Fault(422,'collection_code_required')
  langs={'rw','en','fr','sw'}
  def labels(x):return isinstance(x,dict) and all(isinstance(x.get(k),str) and 0<len(x[k].strip())<=200 for k in langs)
  if not labels(schema.get('label')):raise Fault(422,'four_language_labels_required')
  if schema.get('defaultLanguage','rw') not in langs:raise Fault(422,'invalid_language')
  roles=schema.get('audienceRoles',[]);allowed={'APSE_CPJP','APSE_PARISH_REPORTER','APSE_CCJP','APSE_CEB','APSE_STAFF','APSE_SENSITIVE'}
  if not isinstance(roles,list) or not roles or set(roles)-allowed:raise Fault(422,'invalid_collection_audience')
  paths=schema.get('unitPaths',[])
  if not isinstance(paths,list) or not paths or len(paths)>100 or any(not isinstance(p,str) or not re.fullmatch(r'/[A-Za-z0-9_/.-]+',p) or not any(p==s or p.startswith(s+'/') for s in user.get('paths',[])) for p in paths):raise Fault(403,'collection_scope_denied')
  sensitive=schema.get('sensitive')
  if not isinstance(sensitive,bool):raise Fault(422,'classification_required')
  fields=schema.get('questions')
  if not isinstance(fields,list) or not 1<=len(fields)<=60:raise Fault(422,'collection_question_limit')
  seen=set();questions=[]
  for q in fields:
   if not isinstance(q,dict) or not re.fullmatch(r'[a-z][a-z0-9_]{0,35}',q.get('code','')) or q['code'] in seen:raise Fault(422,'invalid_question_code')
   if not labels(q.get('label')):raise Fault(422,'four_language_labels_required')
   if q.get('type') not in ['TEXT','LONG_TEXT','DATE','NUMBER','INTEGER_ZERO_OR_POSITIVE','BOOLEAN']:raise Fault(422,'invalid_field_type')
   if not isinstance(q.get('required',False),bool):raise Fault(422,'invalid_required_flag')
   seen.add(q['code']);questions.append(dict(code=q['code'],label=q['label'],type=q['type'],required=q.get('required',False)))
  clean=dict(code=code,label=schema['label'],defaultLanguage=schema.get('defaultLanguage','rw'),audienceRoles=sorted(set(roles)),unitPaths=sorted(set(paths)),sensitive=sensitive,questions=questions,schemaVersion=1)
  with self.tx():
   if code in self.form_map():raise Fault(409,'schema_immutable_use_new_code')
   self.db.execute('INSERT INTO collection_schemas VALUES(?,?,?,?)',(code,canonical(clean),user['id'],NOW()));self.audit(user,'COLLECTION_PUBLISHED',code,{'questions':len(questions),'scope':clean['unitPaths']})
  return clean
 def grant_edit(self,user,record,grantee,revision,hours,reason):
  from engine import Fault,NOW
  if 'APSE_MEL' not in self.roles(user):raise Fault(403,'mel_permission_only')
  if not isinstance(grantee,str) or not re.fullmatch(r'[A-Za-z0-9_.:@-]{1,120}',grantee):raise Fault(422,'invalid_grantee')
  if not isinstance(hours,int) or isinstance(hours,bool) or not 1<=hours<=168:raise Fault(422,'permission_hours_1_to_168')
  if not isinstance(reason,str) or not 1<=len(reason.strip())<=2000:raise Fault(422,'change_reason_required')
  with self.tx():
   r=self._row(record);self.check(user,r,True)
   if r['revision']!=revision:raise Fault(409,'revision_conflict')
   if r['state'] in ['APPROVED','LOCKED']:raise Fault(409,'amendment_required')
   pid=str(uuid.uuid4());expires=(datetime.now(timezone.utc)+timedelta(hours=hours)).isoformat()
   self.db.execute('INSERT INTO edit_permissions VALUES(?,?,?,?,?,?,?,0)',(pid,record,grantee,revision,expires,user['id'],self.enc(reason)))
   self.audit(user,'EDIT_PERMISSION_GRANTED',record,{'permission':pid,'grantee':grantee,'revision':revision,'expires':expires})
   return dict(id=pid,record=record,grantee=grantee,revision=revision,expires=expires)
 def delegated_edit(self,user,row):
  from engine import NOW
  return bool(self.db.execute('SELECT 1 FROM edit_permissions WHERE record_id=? AND grantee=? AND revision=? AND expires>? AND revoked=0',(row['id'],user['id'],row['revision'],NOW())).fetchone())
 def revoke_edit(self,user,pid):
  from engine import Fault
  if 'APSE_MEL' not in self.roles(user):raise Fault(403,'mel_permission_only')
  with self.tx():
   p=self.db.execute('SELECT * FROM edit_permissions WHERE id=?',(pid,)).fetchone()
   if not p:raise Fault(404,'permission_not_found')
   self.check(user,self._row(p['record_id']),True);self.db.execute('UPDATE edit_permissions SET revoked=1 WHERE id=?',(pid,));self.audit(user,'EDIT_PERMISSION_REVOKED',p['record_id'],{'permission':pid})
  return {'revoked':True}

 def set_collection_active(self,user,code,active):
  from engine import Fault
  if 'APSE_MEL' not in self.roles(user):raise Fault(403,'mel_metadata_only')
  if not isinstance(active,bool):raise Fault(422,'invalid_active_flag')
  with self.tx():
   f=self.form_map().get(code)
   if not f or not f.get('custom'):raise Fault(404,'collection_not_found')
   if not all(any(p==s or p.startswith(s+'/') for s in user.get('paths',[])) for p in f['unitPaths']):raise Fault(403,'collection_scope_denied')
   self.db.execute('INSERT INTO collection_status VALUES(?,?) ON CONFLICT(code) DO UPDATE SET active=excluded.active',(code,int(active)));self.audit(user,'COLLECTION_STATUS',code,{'active':active})
  return dict(code=code,active=active)
