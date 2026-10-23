import json,sys,tempfile,uuid,unittest,sqlite3
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,Fault
from cryptography.fernet import Fernet
P='/ROOT/P1'
def user(i,*roles,path=P):return dict(id=i,roles=list(roles),paths=[path])
class CaptureTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.e=Engine(self.tmp.name+'/x.sqlite',Fernet.generate_key(),b'x'*32);self.mel=user('MEL','APSE_MEL');self.cp=user('CP','APSE_CPJP');self.staff=user('STAFF','APSE_STAFF');self.specialist=user('SP','APSE_PARISH_REPORTER')
 def tearDown(self):self.e.db.close();self.tmp.cleanup()
 def fault(self,code,fn):
  with self.assertRaises(Fault)as cm:fn()
  self.assertEqual(cm.exception.code,code)
 def values(self,**kw):
  v=dict(work_type='OPERATIONAL',axis='A1',result='A1.R1',activity='Test',title='Réconciliation – Ubumwe n’ubwiyunge',owner='CP',total='10',women='6',men='4',undisclosed='0',disability='2',reason='Synthetic unplanned activity',evidence='PV');v.update(kw);return v
 def create(self,actor=None,**kw):return self.e.create(actor or self.cp,'F07','P1',P,'2026-10-20',self.values(**kw),'AUTOMATIC_KEY_1234567890')
 def draft(self,**kw):
  p=dict(id=str(uuid.uuid4()),revision=0,form='F07',event_date='2026-10-20',values={'title':'Écoute à l’échelle locale – Ubumwe'},language='rw',requestKey=str(uuid.uuid4()));p.update(kw);return p
 def test_record_auto_code_is_stable(self):r=self.create();self.assertTrue(r['values']['record'].startswith('APSE-F07-'));self.assertEqual(r['id'],self.create()['id'])
 def test_program_and_project_codes_automatic(self):
  for category,prefix in [('projects','PRJ-'),('programs','PRG-')]:
   p=dict(code='',labels={l:'Éducation et réconciliation'for l in ['rw','en','fr','sw']},start='2026-09-01',end='2031-08-31',axes=['A1'],partners=[],active=True);saved=self.e.put_metadata(self.mel,category,p,0,'Register source');self.assertTrue(saved['code'].startswith(prefix))
 def test_program_classification(self):
  p=self.e.put_metadata(self.mel,'programs',dict(code='',labels={l:'Programme'for l in ['fr','en','rw','sw']},start='2026-09-01',end='2031-08-31',axes=['A1'],partners=[],active=True),0,'Test');r=self.create(work_type='PROGRAM',program=p['code']);self.assertEqual(r['values']['work_type'],'PROGRAM')
 def test_program_and_other_require_explanation(self):self.fault('program_required',lambda:self.create(work_type='PROGRAM'));self.fault('classification_reason_required',lambda:self.create(work_type='OTHER'));self.assertEqual(self.create(work_type='OTHER',classification_reason='Cross-cutting work')['state'],'DRAFT')
 def test_cp_only_annual_planning(self):
  for f in ['F04','F05','F43']:self.assertFalse(self.e.can(self.cp,dict(form=f,unit='P1',path=P,author='CP'),True));self.assertTrue(self.e.can(self.staff,dict(form=f,unit='P1',path=P,author='STAFF'),True))
 def test_geography_has_verified_names(self):g=self.e.configuration()['geography'];self.assertEqual(len(g['districts']),4);self.assertEqual(len(g['sectors']),51);self.assertEqual(len(g['cells']),259);self.assertEqual(len(self.e.configuration()['ccjpRegister']),101)
 def test_multi_geography_without_small_limit(self):
  g=self.e.geo;d=g['districts'][0]['code'];sectors=[x['code']for x in g['sectors']if x['parent']==d][:4];cells=[x['code']for x in g['cells']if x['parent']in sectors][:5];r=self.create(district=d,sector=','.join(sectors),cell=','.join(cells));self.assertEqual(len(r['values']['cell'].split(',')),5)
 def test_geography_parent_mismatch(self):g=self.e.geo;self.fault('sector_parent_mismatch',lambda:self.create(district=g['districts'][0]['code'],sector=next(x['code']for x in g['sectors']if x['parent']!=g['districts'][0]['code'])))
 def test_working_draft_incomplete_encrypted(self):p=self.draft();r=self.e.save_working_draft(self.cp,p,'P1',P);self.assertEqual(r['revision'],1);b=self.e.db.execute('SELECT body FROM working_drafts').fetchone()[0];self.assertNotIn('Écoute'.encode(),b);self.assertEqual(self.e.draft_listing(self.cp)[0]['payload']['values'],p['values'])
 def test_mel_oversees_scoped_foreign_drafts(self):p=self.draft();self.e.save_working_draft(self.cp,p,'P1',P);self.assertEqual(len(self.e.draft_listing(self.mel)),1);self.assertEqual(self.e.draft_listing(user('OTHER','APSE_CPJP')),[]);self.assertEqual(self.e.draft_listing(user('OUT','APSE_MEL',path='/OUT')),[])
 def test_draft_revision_conflict(self):p=self.draft();self.e.save_working_draft(self.cp,p,'P1',P);self.fault('draft_revision_conflict',lambda:self.e.save_working_draft(self.cp,p,'P1',P))
 def test_mel_change_preserves_owner_history(self):p=self.draft();self.e.save_working_draft(self.cp,p,'P1',P);p.update(revision=1,values={'title':'Correction MEL'});self.e.save_working_draft(self.mel,p,'P1',P);r=self.e.draft_listing(self.mel)[0];self.assertEqual(r['owner'],'CP');self.assertEqual(self.e.db.execute('SELECT COUNT(*)FROM draft_history').fetchone()[0],2)
 def test_draft_trash_restore_retains_values(self):p=self.draft();self.e.save_working_draft(self.cp,p,'P1',P);self.e.draft_action(self.cp,p['id'],1,'TRASH');self.assertEqual(self.e.draft_listing(self.cp),[]);self.assertEqual(len(self.e.draft_listing(self.mel,'TRASH')),1);self.e.draft_action(self.mel,p['id'],2,'RESTORE');self.assertEqual(self.e.draft_listing(self.cp)[0]['payload']['values'],p['values'])
 def test_business_record_recycle_and_restore(self):r=self.create();r=self.e.recycle_record(self.mel,r['id'],1,False,'Duplicate test entry');self.assertEqual(self.e.listing(self.mel,'2026-09-01','2027-08-31'),[]);self.assertEqual(len(self.e.recycle_listing(self.mel)),1);self.fault('record_in_recycle_bin',lambda:self.e.transition(self.mel,r['id'],r['revision'],'SUBMITTED','Test'));r=self.e.recycle_record(self.mel,r['id'],r['revision'],True,'Restore original');self.assertEqual(len(self.e.listing(self.cp,'2026-09-01','2027-08-31')),1)
 def test_non_mel_cannot_recycle_record(self):r=self.create();self.fault('mel_recycle_only',lambda:self.e.recycle_record(self.cp,r['id'],1,False,'Test'))
 def test_history_is_append_only(self):p=self.draft();self.e.save_working_draft(self.cp,p,'P1',P)
 # No permanent-delete operation is exposed.
 def test_draft_history_delete_rejected(self):
  p=self.draft();self.e.save_working_draft(self.cp,p,'P1',P)
  with self.assertRaises(sqlite3.IntegrityError):self.e.db.execute('DELETE FROM draft_history')
 def test_v8_names_and_sensitivity_required_for_submission(self):r=self.create(capture_profile='V8');self.fault('preparation_names_required',lambda:self.e.transition(self.cp,r['id'],1,'SUBMITTED','Ready'))
 def strict(self,**kw):v=dict(capture_profile='V8',preparer_mode='PAIR',preparer_1='Person One',preparer_2='Person Two',reporter_level='CDJP',cnv_checked='true',dnh_checked='true',trauma_checked='true',sensitivity_notes='Accessible venue and inclusive pastoral communication');v.update(kw);return v
 def test_committee_exact_seven_names(self):r=self.create(**self.strict(preparer_mode='COMMITTEE',reporter_level='COMMITTEE'));self.fault('preparation_names_required',lambda:self.e.transition(self.cp,r['id'],1,'SUBMITTED','Ready'))
 def test_specialist_reports_through_independent_committee(self):
  r=self.create(actor=self.specialist,**self.strict(reporter_level='SPECIALIST',volet='MEDIATION'));self.fault('invalid_transition',lambda:self.e.transition(self.specialist,r['id'],1,'SUBMITTED','Bypass'))
  r=self.e.transition(self.specialist,r['id'],1,'CPJP_REVIEW','To committee');r=self.e.transition(self.cp,r['id'],r['revision'],'SUBMITTED','Committee reviewed');r=self.e.transition(self.mel,r['id'],r['revision'],'MEL_VALIDATED','Checked');self.assertEqual(r['state'],'MEL_VALIDATED')
 def test_gender_disaggregation_must_be_complete(self):r=self.create(actor=self.staff,**self.strict(disability=''));self.fault('gender_disability_disaggregation_required',lambda:self.e.transition(self.staff,r['id'],1,'SUBMITTED','Ready'))
 def test_no_false_sensitivity_attestation(self):r=self.create(actor=self.staff,**self.strict(dnh_checked='false'));self.fault('sensitivity_review_required',lambda:self.e.transition(self.staff,r['id'],1,'SUBMITTED','Ready'))
 def test_unicode_roundtrip_without_reencoding_data(self):r=self.create();self.assertEqual(self.e.get(self.mel,r['id'])['values']['title'],'Réconciliation – Ubumwe n’ubwiyunge')

 def test_parish_cannot_bypass_committee_using_cdjp_label(self):
  r=self.create(actor=self.specialist,**self.strict());self.fault('parish_report_requires_cpjp_committee',lambda:self.e.transition(self.specialist,r['id'],1,'SUBMITTED','Bypass attempt'))
 def test_field_report_without_volet_routes_through_committee(self):
  r=self.create(actor=self.specialist,**self.strict(reporter_level='FIELD'));r=self.e.transition(self.specialist,r['id'],1,'CPJP_REVIEW','Field facts');self.assertEqual(r['state'],'CPJP_REVIEW')
 def test_geography_metadata_edit_keeps_codes(self):
  entry=dict(self.e.metadata()['geography_units'][0]);code=entry['code'];entry['labels']={l:'Nyanza'for l in ['fr','en','rw','sw']};self.e.put_metadata(self.mel,'geography_units',entry,0,'Verify local name');self.assertEqual(self.e.geography()['districts'][0]['code'],code)
 def test_import_generates_missing_record_code(self):
  row=dict(self.values(),event_date='2026-10-20');raw=json.dumps([row]).encode();result=self.e.import_transfer(self.mel,'F07','P1',P,raw,'json');self.assertEqual(result['errors'],0);r=self.e.listing(self.mel,'2026-09-01','2027-08-31')[0];self.assertTrue(r['values']['record'].startswith('APSE-F07-'));self.assertEqual(r['values']['capture_profile'],'V8')

 def test_reversible_legacy_metadata_labels_repaired_without_rewriting_records(self):
  axis=dict(self.e.metadata()['axes'][0]);expected=axis['labels']['fr'];axis['labels']=dict(axis['labels'],fr=expected.encode('utf-8').decode('cp1252'));self.e.put_metadata(self.mel,'axes',axis,0,'Legacy Windows metadata test');self.assertEqual(self.e.configuration()['options']['axis'][0]['label']['fr'],expected)
  raw='RÃ©conciliation as actually typed';r=self.create(title=raw);self.assertEqual(self.e.get(self.mel,r['id'])['values']['title'],raw)
 def test_valid_french_circumflex_not_corrupted(self):
  from unicode_text import metadata_text
  self.assertEqual(metadata_text('Âge – Évaluation et résilience'),'Âge – Évaluation et résilience')

 def test_ps_budget_approved(self):
  d=self.e.planning(self.mel,'AP1','STAFF');self.assertEqual(d['budgetNotice'],'APPROVED_PS_BUDGET');self.assertTrue(all(x['amountStatus']=='APPROVED_PS_BUDGET'for x in d['operational_lines']))
 def test_staff_performance_private_and_missing_not_zero(self):
  rows=[dict(id='week',form='F05',event_date='2026-10-19',values=dict(owner='STAFF',start='2026-10-19',end='2026-10-23',target=10,output_unit='sessions',record='W1')),dict(id='actual',form='F07',event_date='2026-10-24',values=dict(owner='STAFF',task_ref='week',outputs=4,output_unit='sessions',evidence='PV')),dict(id='month',form='F43',values=dict(owner='OTHER',end='2026-10-31'))]
  original=self.e.listing;self.e.listing=lambda *a,**k:rows
  try:
   d=self.e.staff_performance(self.staff,'2026-10-01','2026-10-31');self.assertEqual(len(d['assignments']),1);a=d['assignments'][0];self.assertEqual(a['achievementPercent'],40);self.assertEqual(a['onTimeReports'],0)
   self.assertEqual(self.e.staff_performance(self.staff,'2026-10-01','2026-10-31','F43')['assignments'],[])
   rows.pop(1);self.assertIsNone(self.e.staff_performance(self.mel,'2026-10-01','2026-10-31')['assignments'][0]['outputs'])
  finally:self.e.listing=original
 def test_staff_performance_cp_denied(self):self.fault('staff_performance_denied',lambda:self.e.staff_performance(self.cp,'2026-10-01','2026-10-31'))
