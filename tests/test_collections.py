import json,sys,tempfile,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,Fault
from cryptography.fernet import Fernet
P='/RootUnit001/Parish00001'
def user(i,*roles,path=P):return dict(id=i,roles=list(roles),paths=[path])
class CollectionTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.e=Engine(self.tmp.name+'/x.sqlite',Fernet.generate_key(),b'a'*32);self.mel=user('MEL','APSE_MEL');self.cp=user('CP','APSE_CPJP');self.schema=json.loads((Path(__file__).resolve().parents[1]/'app/collection_templates.json').read_text())[1];self.schema.update(audienceRoles=['APSE_CPJP'],unitPaths=[P])
 def tearDown(self):self.e.db.close();self.tmp.cleanup()
 def fault(self,code,fn):
  with self.assertRaises(Fault) as cm:fn()
  self.assertEqual(cm.exception.code,code)
 def publish(self):return self.e.publish_collection(self.mel,self.schema)
 def create(self,actor=None):
  self.publish();prefix=self.schema['code'].lower()+'_';v=dict(work_type='OPERATIONAL',record='REPORT1',axis='A1',result='A1.R1',ap='AP1',volet='MEDIATION',evidence='PV1');v.update({prefix+k:val for k,val in dict(location='Synthetic place',activity_date='2026-10-20',outputs='Synthetic activity',facts='Verified synthetic facts').items()});return self.e.create(actor or self.cp,self.schema['code'],'Parish00001',P,'2026-10-20',v,str(uuid.uuid4()))
 def test_published_schema_dynamic(self):
  r=self.create();self.assertEqual(r['state'],'DRAFT');self.assertEqual(self.e.form_map()[r['form']]['defaultLanguage'],'rw');self.assertTrue(self.e.get(self.mel,r['id']))
 def test_mel_only_publish(self):self.fault('mel_metadata_only',lambda:self.e.publish_collection(self.cp,self.schema))
 def test_schema_cannot_be_rewritten(self):self.publish();self.fault('schema_immutable_use_new_code',self.publish)
 def test_all_labels_required(self):del self.schema['label']['sw'];self.fault('four_language_labels_required',self.publish)
 def test_out_of_scope_publish(self):self.schema['unitPaths']=['/Other'];self.fault('collection_scope_denied',self.publish)
 def test_role_restriction(self):r=self.create();self.fault('access_denied',lambda:self.e.get(user('CEB','APSE_CEB'),r['id']))
 def test_scope_restriction(self):r=self.create();self.fault('access_denied',lambda:self.e.get(user('CP2','APSE_CPJP',path='/RootUnit001/Parish00002'),r['id']))
 def test_sensitive_requires_sensitive_role(self):self.schema['sensitive']=True;self.fault('validation_failed',self.create)
 def test_cpjp_cannot_edit_without_permission(self):r=self.create();self.fault('mel_edit_permission_required',lambda:self.e.edit(self.cp,r['id'],1,r['values'],r['event_date']))
 def test_single_revision_permission(self):
  r=self.create();self.e.grant_edit(self.mel,r['id'],'CP',1,24,'Correction request');self.assertTrue(self.e.get(self.cp,r['id'])['editAllowed']);r=self.e.edit(self.cp,r['id'],1,r['values'],r['event_date']);self.assertEqual(r['revision'],2);self.fault('mel_edit_permission_required',lambda:self.e.edit(self.cp,r['id'],2,r['values'],r['event_date']))
 def test_revoke(self):
  r=self.create();p=self.e.grant_edit(self.mel,r['id'],'CP',1,1,'Correction');self.e.revoke_edit(self.mel,p['id']);self.assertFalse(self.e.get(self.cp,r['id'])['editAllowed'])
 def test_expired_permission(self):
  r=self.create();self.e.grant_edit(self.mel,r['id'],'CP',1,1,'Correction');self.e.db.execute("UPDATE edit_permissions SET expires='2000-01-01T00:00:00+00:00'");self.assertFalse(self.e.get(self.cp,r['id'])['editAllowed'])
 def test_grant_does_not_grant_read_scope(self):
  r=self.create();self.e.grant_edit(self.mel,r['id'],'OTHER',1,1,'Correction');self.fault('access_denied',lambda:self.e.edit(user('OTHER','APSE_CPJP',path='/Other'),r['id'],1,r['values'],r['event_date']))
 def test_non_mel_cannot_grant(self):r=self.create();self.fault('mel_permission_only',lambda:self.e.grant_edit(self.cp,r['id'],'CP',1,1,'Correction'))
 def test_schema_survives_reopen(self):
  self.publish();self.assertEqual(self.e.db.execute('SELECT COUNT(*) FROM collection_schemas').fetchone()[0],1);self.assertTrue(self.e.verify_audit())
 def test_review_invalidated_by_delegated_edit(self):
  r=self.create();r=self.e.transition(self.cp,r['id'],1,'SUBMITTED','Ready');r=self.e.transition(self.mel,r['id'],r['revision'],'MEL_VALIDATED','Checked');self.e.grant_edit(self.mel,r['id'],'CP',r['revision'],1,'Correction');r=self.e.edit(self.cp,r['id'],r['revision'],r['values'],r['event_date']);self.assertEqual(r['state'],'SUBMITTED')

 def test_custom_import_export_templates(self):
  r=self.create()
  for fmt in ['csv','xlsx','json']:
   data,mime=self.e.export_transfer(self.cp,r['form'],'2026-09-01','2027-08-31',None,fmt,False,False,'rw',True);self.assertTrue(data)
  prefix=r['form'].lower()+'_';row=dict(r['values'],record='IMPORT2',event_date=r['event_date']);raw=json.dumps([row]).encode()
  result=self.e.import_transfer(self.cp,r['form'],r['unit'],P,raw,'json');self.assertEqual(result['errors'],0);self.assertEqual(result['createdOrReused'],1)
 def test_required_question_enforced(self):
  r=self.create();v=dict(r['values']);del v[r['form'].lower()+'_facts'];self.fault('validation_failed',lambda:self.e.create(self.cp,r['form'],r['unit'],P,r['event_date'],v,str(uuid.uuid4())))
 def test_no_native_metadata_mutation_of_published_schema(self):
  self.publish();f=self.e.form_map()[self.schema['code']];self.fault('schema_immutable_use_new_code',lambda:self.e.put_metadata(self.mel,'forms',f,0,'Unsafe revision'))
 def test_sensitive_form_requires_sensitive_access_even_when_shared(self):
  self.schema['sensitive']=True;self.publish();row=dict(form=self.schema['code'],path=P,author='CP');self.assertFalse(self.e.can(self.cp,row));self.assertTrue(self.e.can(user('CP','APSE_CPJP','APSE_SENSITIVE'),row))

 def test_close_and_reopen_collection(self):
  r=self.create();self.e.set_collection_active(self.mel,r['form'],False);self.assertFalse(self.e.form_map()[r['form']]['active']);self.fault('unknown_form',lambda:self.e.create(self.cp,r['form'],r['unit'],P,r['event_date'],dict(r['values'],record='NEW'),str(uuid.uuid4())));self.assertEqual(self.e.get(self.cp,r['id'])['id'],r['id']);self.e.set_collection_active(self.mel,r['form'],True);self.assertTrue(self.e.form_map()[r['form']]['active'])
