import unittest,sys,tempfile,copy,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,Fault
from cryptography.fernet import Fernet
class V4Tests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.e=Engine(self.t.name+'/db',Fernet.generate_key(),b'q'*32);self.staff=self.u('STAFF','APSE_STAFF');self.mel=self.u('MEL','APSE_MEL');self.coordinator=self.u('COORD','APSE_COORDINATION');self.director=self.u('DIR','APSE_DIRECTION')
 def tearDown(self):self.e.db.close();self.t.cleanup()
 def u(self,id,role):return dict(id=id,roles=[role],paths=['/ROOT'])
 def fault(self,code,fn):
  with self.assertRaises(Fault)as cm:fn()
  self.assertEqual(cm.exception.code,code)
 def create(self,form='F03',extra=None):
  v=dict(record='P1',axis='A1',result='A1.R1',objective='A1.OS',intervention='A1.I1',activity='TEST',title='Test',start='2026-09-01',end='2027-08-31',owner='STAFF',ap='AP1',operation_ref='OP-A1-02',plan_type='STAFF',work_type='OPERATIONAL',target='10',output_unit='sessions',budget='1000',evidence='SYNTHETIC') if form=='F03' else dict(record='A1',axis='A1',result='A1.R1',activity='TEST',title='Test',owner='STAFF',work_type='OPERATIONAL',total='0',women='0',men='0',undisclosed='0',evidence='SYNTHETIC') if form=='F07' else dict(record='E1',budget='1000',spent='200',evidence='SYNTHETIC',work_type='OPERATIONAL')
  v.update(extra or {});return self.e.create(self.mel if form=='F19' else self.staff,form,'UNIT','/ROOT/UNIT','2026-10-20',v,('KEY_'+v['record']).ljust(20,'x'))
 def step(self,r,target,user):return self.e.transition(user,r['id'],r['revision'],target,'Checked')
 def approve(self,r):
  for target,user in [('SUBMITTED',self.mel if r['author']=='MEL' else self.staff),('MEL_VALIDATED',self.mel),('VERIFIED',self.coordinator),('APPROVED',self.director)]:r=self.step(r,target,user)
  return r
 def test_cpjp_structure_exact(self):
  x=self.e.metadata()['cpjp_governance'][0];self.assertEqual(sum(x['count']for x in x['committeeSeats']),6);self.assertEqual(x['chaplain'],'CHAPLAIN');self.assertEqual(x['supervisedBy'],'CURE');self.assertEqual(len(self.e.metadata()['volets']),4)
 def test_ccjp_ceb_and_reporter_never_plan(self):
  for role in ['APSE_CCJP','APSE_CEB','APSE_PARISH_REPORTER']:self.fault('planning_cdjp_cpjp_only',lambda:self.e.planning(self.u('X',role),'AP1','CPJP'))
 def test_coordinator_cannot_skip_mel(self):
  r=self.step(self.create(),'SUBMITTED',self.staff);self.fault('invalid_transition',lambda:self.step(r,'VERIFIED',self.coordinator));self.fault('review_role_required',lambda:self.step(r,'MEL_VALIDATED',self.coordinator))
 def test_cure_cannot_approve(self):
  r=self.step(self.create(),'SUBMITTED',self.staff);r=self.step(r,'MEL_VALIDATED',self.mel);r=self.step(r,'VERIFIED',self.coordinator);self.fault('review_role_required',lambda:self.step(r,'APPROVED',self.u('CURE','APSE_CURE')))
 def test_mel_edit_invalidates_coordinator_verification(self):
  r=self.step(self.create(),'SUBMITTED',self.staff);r=self.step(r,'MEL_VALIDATED',self.mel);r=self.step(r,'VERIFIED',self.coordinator);r=self.e.edit(self.mel,r['id'],r['revision'],dict(r['values'],title='Corrected'),r['event_date']);self.assertEqual(r['state'],'SUBMITTED');self.fault('invalid_transition',lambda:self.step(r,'APPROVED',self.director))
 def test_project_requires_active_registry(self):self.fault('active_project_required',lambda:self.create(extra=dict(work_type='PROJECT',project='UNKNOWN')))
 def test_operational_cannot_claim_project(self):self.fault('operational_cannot_have_project',lambda:self.create(extra=dict(project='X')))
 def test_unknown_partner_rejected(self):self.fault('unknown_partner',lambda:self.create(extra=dict(partners='UNKNOWN')))
 def test_project_and_partner_can_be_registered_by_mel(self):
  labels={l:'Synthetic'for l in ['fr','rw','en','sw']};self.e.put_metadata(self.mel,'partners',dict(code='PART1',labels=labels,active=True),0,'Test');self.e.put_metadata(self.mel,'projects',dict(code='PROJ1',labels=labels,start='2026-09-01',end='2027-08-31',axes=['A1'],partners=['PART1'],active=True),0,'Test');r=self.create(extra=dict(work_type='PROJECT',project='PROJ1',partners='PART1'));self.assertEqual(r['values']['project'],'PROJ1')
 def test_effectiveness_and_efficiency_from_linked_approved_rows(self):
  p=self.approve(self.create());self.approve(self.create('F07',dict(plan_ref=p['id'],outputs='5',output_unit='sessions')));self.approve(self.create('F19',dict(plan_ref=p['id'])));d=self.e.portfolio_dashboard(self.mel,'2026-09-01','2027-08-31');k=d['performance'][0];self.assertEqual(k['effectivenessPercent'],50);self.assertEqual(k['costPerOutputRWF'],40);self.assertEqual(k['budgetExecutionPercent'],20)
 def test_missing_actuals_are_null(self):
  self.approve(self.create());k=self.e.portfolio_dashboard(self.mel,'2026-09-01','2027-08-31')['performance'][0];self.assertIsNone(k['effectivenessPercent']);self.assertIsNone(k['costPerOutputRWF'])
 def test_mismatched_output_units_rejected(self):
  p=self.approve(self.create());self.fault('linked_plan_output_unit_mismatch',lambda:self.create('F07',dict(plan_ref=p['id'],outputs='5',output_unit='people')))

 def test_negative_output_target_rejected(self):self.fault('negative_output_target',lambda:self.create(extra=dict(target='-1')))
 def test_legacy_verified_record_cannot_bypass_mel(self):
  r=self.create();self.e.db.execute("UPDATE records SET state='VERIFIED' WHERE id=?",(r['id'],));self.fault('current_mel_validation_required',lambda:self.step(r,'APPROVED',self.director))
 def test_known_ceb_unit_cannot_plan_even_with_mel(self):
  entry=dict(code='CEB-SYN',labels={l:'Synthetic' for l in ['fr','en','rw','sw']},kind='CEB',dhis2_uid='DemoUnit001',parent=None,active=True);self.e.put_metadata(self.mel,'organisation_units',entry,0,'Test');self.assertFalse(self.e.can(self.mel,dict(form='F03',path='/ROOT/UNIT',unit='DemoUnit001',author='MEL'),True))
