import sys,unittest,tempfile,sqlite3,io,zipfile,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,Fault,validate,ratio
from cryptography.fernet import Fernet
from reports import generate
from openpyxl import load_workbook
P='/RootUnit001/Parish00001'
def user(name,*roles,path=P):return dict(id=name,roles=list(roles),paths=[path])
class Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.key=Fernet.generate_key();self.e=Engine(self.temp.name+'/data.db',self.key,b'x'*32)
  self.author=user('author','APSE_MEL','APSE_FINANCE','APSE_SENSITIVE','APSE_HR');self.reviewer=user('reviewer','APSE_COORDINATION','APSE_REVIEWER','APSE_FINANCE','APSE_SENSITIVE','APSE_HR');self.finance=user('finance','APSE_FINANCE','APSE_SENSITIVE','APSE_HR');self.mel=user('mel','APSE_MEL','APSE_FINANCE','APSE_SENSITIVE','APSE_HR');self.director=user('director','APSE_DIRECTION','APSE_FINANCE','APSE_SENSITIVE','APSE_HR')
 def tearDown(self):self.e.db.close();self.temp.cleanup()
 def create(self,form='F07',v=None,key='a'*20,actor=None):
  values=v or dict(record='ACT-001',axis='A1',result='A1.R1',activity='ACT-001',title='Training',owner='author',total='10',women='6',men='4',undisclosed='0',evidence='PV-001')
  if form in ['F03','F07']:values.setdefault('work_type','OPERATIONAL')
  if form=='F07':values.setdefault('reason','Authorized unplanned synthetic activity')
  return self.e.create(actor or self.author,form,'Parish00001',P,'2026-10-19',values,key)
 def step(self,r,target,actor):return self.e.transition(actor,r['id'],r['revision'],target,'Reviewed evidence')
 def approve(self,r):
  r=self.step(r,'SUBMITTED',self.author);r=self.step(r,'MEL_VALIDATED',self.mel);r=self.step(r,'VERIFIED',self.reviewer);return self.step(r,'APPROVED',self.director)
 def fault(self,code,fn):
  with self.assertRaises(Fault)as cm:fn()
  self.assertEqual(cm.exception.code,code)
 def test_creation_idempotent(self):
  r=self.create();same=self.create();self.assertEqual(r['id'],same['id']);self.assertEqual(self.e.db.execute('SELECT COUNT(*)FROM records').fetchone()[0],1)
 def test_idempotency_payload_conflict(self):
  self.create();self.fault('idempotency_conflict',lambda:self.create(v=dict(record='OTHER',axis='A1',result='A1.R1',activity='X',title='X',owner='author',total='0',women='0',men='0',undisclosed='0')))
 def test_duplicate_business_key(self):self.create();self.fault('duplicate_business_code',lambda:self.create(key='b'*20))
 def test_scope_cannot_be_crossed(self):
  r=self.create();self.fault('access_denied',lambda:self.e.get(user('other','APSE_MEL',path='/RootUnit001/Parish00002'),r['id']))
 def test_sensitive_permission(self):
  r=self.create('F09',dict(record='CASE1',case='random-code',consent='true',evidence='PRIVATE'))
  self.fault('access_denied',lambda:self.e.get(user('ceB','APSE_CEB'),r['id']))
 def test_strategic_axis_result_mismatch(self):
  self.fault('validation_failed',lambda:self.create(v=dict(record='X',axis='A1',result='A2.R1',activity='X',title='X',owner='a',total=0,women=0,men=0,undisclosed=0)))
 def test_negative_and_mismatched_participation(self):
  self.fault('validation_failed',lambda:validate('F07',dict(record='A',axis='A1',result='A1.R1',activity='X',title='X',owner='a',total=1,women=2,men=0,undisclosed=0),'2026-10-19'))
 def test_no_night_vehicle(self):
  self.fault('validation_failed',lambda:validate('F33',dict(record='M1',owner='a',asset='CAR1',departure='05:00',arrival='19:00'),'2026-10-19'))
 def test_timesheet_bounds(self):self.fault('validation_failed',lambda:validate('F31',dict(record='T1',owner='a',hours='25'),'2026-10-19'))
 def test_author_cannot_verify(self):
  r=self.step(self.create(),'SUBMITTED',self.author);r=self.step(r,'MEL_VALIDATED',self.mel);mixed=dict(self.author,roles=['APSE_COORDINATION']);self.fault('independent_reviewer_required',lambda:self.step(r,'VERIFIED',mixed))
 def test_skip_workflow_rejected(self):r=self.create();self.fault('invalid_transition',lambda:self.step(r,'APPROVED',self.director))
 def test_optimistic_locking(self):
  r=self.create();self.e.edit(self.author,r['id'],r['revision'],r['values'],r['event_date']);self.fault('revision_conflict',lambda:self.e.edit(self.author,r['id'],r['revision'],r['values'],r['event_date']))
 def test_submitted_immutable(self):
  r=self.step(self.create(),'SUBMITTED',self.author);self.assertEqual(self.e.edit(self.author,r['id'],r['revision'],r['values'],r['event_date'])['state'],'SUBMITTED')
 def test_independent_approver(self):
  r=self.step(self.create(),'SUBMITTED',self.author);r=self.step(r,'MEL_VALIDATED',self.mel);r=self.step(r,'VERIFIED',self.reviewer);mixed=dict(self.mel,roles=['APSE_MEL','APSE_DIRECTION']);self.fault('independent_approver_required',lambda:self.step(r,'APPROVED',mixed))
 def test_approved_lock_and_amend(self):
  r=self.approve(self.create());r=self.step(r,'LOCKED',self.director);a=self.e.amend(self.author,r['id'],'Correction with audit');self.assertEqual(a['version'],2);self.assertEqual(a['state'],'DRAFT');self.assertEqual(a['parent'],r['id']);self.assertEqual(self.e.get(self.author,r['id'])['state'],'LOCKED')
 def test_full_history_retained(self):
  r=self.create();v=dict(r['values'],title='NEW');self.e.edit(self.author,r['id'],r['revision'],v,r['event_date']);rows=self.e.db.execute('SELECT body FROM history WHERE record_id=? ORDER BY id',(r['id'],)).fetchall();self.assertEqual(self.e.dec(rows[0]['body'])['values']['title'],'Training');self.assertEqual(self.e.dec(rows[1]['body'])['values']['title'],'NEW')
 def test_approved_only_dashboard(self):
  r=self.create();self.assertEqual(self.e.dashboard(self.author,'2026-09-01','2026-11-30')['activities'],0);self.approve(r);d=self.e.dashboard(self.author,'2026-09-01','2026-11-30');self.assertEqual(d['activities'],1);self.assertEqual(d['attendances'],10);self.assertIsNone(d['uniquePeople'])
 def test_finance_separate_from_plans(self):
  r=self.create('F19',dict(record='B1',budget='100',spent='80',local='20',evidence='INVOICE'));self.approve(r);d=self.e.dashboard(self.author,'2026-09-01','2026-11-30');self.assertIsNone(d['budgetExecution']);self.assertEqual(d['spent'],80)
 def test_crypto_at_rest(self):
  r=self.create('F09',dict(record='SECRET-CASE',case='SENSITIVE-CODE',consent='true'));raw=self.e.db.execute('SELECT body FROM records').fetchone()[0];self.assertNotIn(b'SENSITIVE-CODE',raw);self.assertEqual(self.e.dec(raw)['case'],'SENSITIVE-CODE')
 def test_audit_chain_and_immutability(self):
  self.create();self.assertGreater(self.e.verify_audit()['entries'],0)
  with self.assertRaises(sqlite3.IntegrityError):self.e.db.execute('DELETE FROM audit')
 def test_evidence_mime_and_rights(self):
  r=self.create();self.fault('unsupported_evidence_type',lambda:self.e.add_evidence(self.author,r['id'],'application/pdf',b'notpdf'))
  ev=self.e.add_evidence(self.author,r['id'],'application/pdf',b'%PDF-1.4\ncontent');mime,data=self.e.evidence(self.author,ev['id']);self.assertEqual(mime,'application/pdf');self.assertTrue(data.startswith(b'%PDF'))
 def test_learning_use_requires_validated_lesson(self):
  self.fault('record_not_found',lambda:self.create('F30',dict(record='ADAPT1',axis='A1',lesson_ref='unknown',decision='ADAPT',action='Revise sessions',owner='author',due='2026-11-01')))
 def test_learning_end_to_end(self):
  review=self.approve(self.create('F28',dict(record='AAR1',axis='A1',activity='A1-ACT',finding='Attendance fell during harvest',lesson='Change meeting times in harvest season',evidence='PV-AAR1')))
  lesson=self.approve(self.create('F29',dict(record='LESSON1',axis='A1',linked_record=review['id'],lesson='Schedule outside farm work',evidence='PV-LESSON'),key='b'*20))
  action=self.approve(self.create('F30',dict(record='ADAPT1',axis='A1',lesson_ref=lesson['id'],decision='ADAPT',action='Change time',owner='author',due='2026-11-01',evidence='DECISION'),key='c'*20))
  self.fault('independent_verification_required',lambda:self.e.close_action(self.author,action['id'],dict(effect='Better attendance',evidence='FOLLOWUP')))
  self.e.close_action(self.reviewer,action['id'],dict(effect='Better attendance verified with attendance sheets',evidence='FOLLOWUP'))
  d=self.e.dashboard(self.author,'2026-09-01','2026-11-30');self.assertEqual(d['learning']['validatedLessons'],1);self.assertEqual(d['learning']['verifiedAdaptations'],1);self.assertEqual(d['learning']['learningUseRate'],100)
 def test_report_formats_all_profiles_languages(self):
  r=self.approve(self.create());rows=self.e.listing(self.author,'2026-09-01','2026-11-30',approved=True)
  for code in ['R'+str(i).zfill(2)for i in range(1,13)]:
   for lang in ['rw','en','fr','sw']:
    for fmt in ['docx','xlsx','csv']:
     data,mime=generate(rows,code,lang,fmt,'2026-09-01','2026-11-30');self.assertGreater(len(data),10)
     if fmt in ['docx','xlsx']:self.assertIsNone(zipfile.ZipFile(io.BytesIO(data)).testzip())
 def test_sensitive_details_excluded_from_export(self):
  r=self.approve(self.create('F09',dict(record='SECRET',case='DO-NOT-EXPORT',consent='true',evidence='PRIVATE')))
  rows=self.e.listing(self.author,'2026-09-01','2026-11-30',approved=True);data,_=generate(rows,'R05','en','csv','2026-09-01','2026-11-30');self.assertNotIn(b'DO-NOT-EXPORT',data)
 def test_frozen_report_is_immutable(self):
  r=self.approve(self.create());snapshot=self.e.freeze_report(self.author,'Parish00001',P,'R05','fr','docx','2026-09-01','2026-11-30');a=self.e.report_snapshot(self.author,snapshot['snapshot']);self.assertTrue(a['data'].startswith(b'PK'));self.assertEqual(a['state'],'DRAFT')
  with self.assertRaises(sqlite3.IntegrityError):self.e.db.execute('DELETE FROM report_snapshots')
 def test_indicator_recalculation_from_approved_observations(self):
  a=self.approve(self.create('F42',dict(record='OBS1',indicator='A1-K3',numerator='8',denominator='10',method='Confirmed referral access',evidence='LIST1')))
  d=self.e.dashboard(self.author,'2026-09-01','2026-11-30');k=next(i for i in d['indicators']if i['code']=='A1-K3');self.assertEqual(k['value'],80)
 def test_amendment_does_not_double_count(self):
  r=self.approve(self.create());a=self.e.amend(self.author,r['id'],'Correct attendance');v=dict(a['values'],total='12',women='7',men='5');a=self.e.edit(self.author,a['id'],a['revision'],v,a['event_date']);self.approve(a);self.assertEqual(self.e.dashboard(self.author,'2026-09-01','2026-11-30')['attendances'],12)
 def test_zero_denominator_observation_stays_unavailable(self):
  self.approve(self.create('F42',dict(record='ZERO1',indicator='A1-K3',numerator='0',denominator='0',method='No eligible referrals',evidence='LIST1')))
  d=self.e.dashboard(self.author,'2026-09-01','2026-11-30');self.assertIsNone(next(i for i in d['indicators']if i['code']=='A1-K3')['value'])
 def test_critical_alert_routed_and_acknowledged(self):
  r=self.create('F17',dict(record='INC1',case='PSEUDO1',consent='true',severity='4',probability='2',evidence='SAFE'))
  alerts=self.e.alerts(self.author);self.assertEqual(len(alerts),1);self.assertEqual(len(self.e.alerts(user('OTHER','APSE_MEL'))),1);self.e.acknowledge_alert(self.reviewer,alerts[0]['id']);self.assertEqual(self.e.alerts(self.author),[])
 def test_staff_owns_timesheets_only(self):
  staff=user('STAFF1','APSE_STAFF');r=self.create('F31',dict(record='TIME1',owner='STAFF1',hours='8'),actor=staff);self.fault('access_denied',lambda:self.e.get(user('STAFF2','APSE_STAFF'),r['id']));self.e.grant_edit(self.mel,r['id'],'STAFF1',r['revision'],1,'Test owner guard');v=dict(r['values'],owner='STAFF2');self.fault('own_staff_record_only',lambda:self.e.edit(staff,r['id'],r['revision'],v,r['event_date']))
 def test_no_division_zero(self):self.assertIsNone(ratio(1,0));self.assertEqual(ratio(0,10),0)
if __name__=='__main__':unittest.main(verbosity=2)
