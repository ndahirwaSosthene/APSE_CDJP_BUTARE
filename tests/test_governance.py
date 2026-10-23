import sys,unittest,tempfile,copy,os
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,Fault
from cryptography.fernet import Fernet
class GovernanceTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.e=Engine(self.t.name+'/db',Fernet.generate_key(),b'a'*32);self.mel={'id':'MEL','roles':['APSE_MEL'],'paths':['/ROOT']};self.staff={'id':'STAFF','roles':['APSE_STAFF'],'paths':['/ROOT/P1']};self.cpjp={'id':'CPJP','roles':['APSE_CPJP'],'paths':['/ROOT/P1']}
 def tearDown(self):self.e.db.close();self.t.cleanup()
 def fault(self,code,fn):
  with self.assertRaises(Fault) as cm:fn()
  self.assertEqual(cm.exception.code,code)
 def plan(self,**changes):
  v=dict(work_type='OPERATIONAL',record='PLAN1',axis='A1',result='A1.R1',objective='A1.OS',intervention='A1.I1',activity='ACT1',title='Test',start='2026-09-01',end='2027-08-31',owner='STAFF',ap='AP1',operation_ref='PAO-AP1-R010',plan_type='STAFF');v.update(changes);return v
 def create(self,form='F03',values=None,user=None):return self.e.create(user or self.staff,form,'P1','/ROOT/P1','2026-10-20',values or self.plan(),'UNIQUE_KEY_1234567890')
 def test_sources_and_four_language_titles(self):
  m=self.e.metadata();self.assertEqual(len(m['annual_tasks']),33);self.assertEqual(len(m['operational_lines']),25);self.assertEqual(len(m['organisation_units']),27)
  for cat in ['axes','objectives','results','interventions','annual_tasks','operational_lines']:
   for x in m[cat]:self.assertTrue({'fr','rw','en','sw'}<=set(x.get('labels',x.get('label',{}))))
 def test_only_selected_year_and_audience(self):
  self.assertEqual(len(self.e.planning(self.staff,'AP1','STAFF')['annual_tasks']),33);self.assertEqual(self.e.planning(self.staff,'AP2','STAFF')['annual_tasks'],[]);self.assertEqual(self.e.planning(self.cpjp,'AP1','CPJP')['annual_tasks'],[])
  self.fault('staff_plan_denied',lambda:self.e.planning(self.cpjp,'AP1','STAFF'))
 def test_valid_annual_plan(self):self.assertEqual(self.create()['values']['ap'],'AP1')
 def test_future_year_task_rejected_server_side(self):self.fault('operation_not_in_selected_annual_plan',lambda:self.create(values=self.plan(ap='AP2',start='2027-09-01',end='2028-08-31')))
 def test_date_outside_ap_rejected(self):self.fault('activity_outside_selected_ap',lambda:self.create(values=self.plan(end='2027-09-01')))
 def test_axis_objective_link_enforced(self):self.fault('plan_objective_mismatch',lambda:self.create(values=self.plan(objective='A2.OS')))
 def test_cpjp_cannot_use_staff_task(self):self.fault('operation_not_in_selected_annual_plan',lambda:self.create(user=self.cpjp,values=self.plan(plan_type='CPJP')))
 def test_cpjp_can_use_shared_ps_line(self):self.assertEqual(self.create(user=self.cpjp,values=self.plan(plan_type='CPJP',operation_ref='OP-A1-02'))['state'],'DRAFT')
 def test_only_mel_can_modify_metadata(self):
  x=self.e.metadata()['objectives'][0];self.fault('mel_metadata_only',lambda:self.e.put_metadata(self.staff,'objectives',x,0,'Test'))
 def test_metadata_version_audit_and_isolation(self):
  x=self.e.metadata()['objectives'][0];x['labels']['fr']='Objectif relu';r=self.e.put_metadata(self.mel,'objectives',x,0,'Relecture');self.assertEqual(r['_version'],1);self.fault('metadata_revision_conflict',lambda:self.e.put_metadata(self.mel,'objectives',x,0,'Stale'))
  self.assertEqual(self.e.configuration()['objectives'][0]['labels']['fr'],'Objectif relu') if self.e.configuration()['objectives'][0]['code']==x['code'] else self.assertTrue(any(a['labels']['fr']=='Objectif relu' for a in self.e.configuration()['objectives']))
  other=Engine(':memory:',Fernet.generate_key(),b'b'*32);self.assertNotEqual(other.metadata()['objectives'][0]['labels']['fr'],'Objectif relu');other.db.close();self.assertGreater(self.e.verify_audit()['entries'],0)
 def test_geographic_cycle_and_unknown_parent(self):
  x=self.e.metadata()['organisation_units'][0];x['parent']=x['code'];self.fault('metadata_parent_cycle',lambda:self.e.put_metadata(self.mel,'organisation_units',x,0,'Test'));x['parent']='MISSING';self.fault('unknown_parent',lambda:self.e.put_metadata(self.mel,'organisation_units',x,0,'Test'))
 def test_metadata_requires_four_languages_and_reason(self):
  x=self.e.metadata()['objectives'][0];self.fault('change_reason_required',lambda:self.e.put_metadata(self.mel,'objectives',x,0,''));del x['labels']['sw'];self.fault('four_language_labels_required',lambda:self.e.put_metadata(self.mel,'objectives',x,0,'Test'))
 def test_mel_can_correct_another_author_with_history(self):
  r=self.create();v=r['values'];v['title']='Correction MEL';new=self.e.edit(self.mel,r['id'],r['revision'],v,r['event_date']);self.assertEqual(new['revision'],2);self.assertEqual(new['author'],'STAFF');self.assertEqual(self.e.db.execute("SELECT actor FROM history WHERE action='EDIT'").fetchone()[0],'MEL')
 def test_feedback_encrypted_and_scope_protected(self):
  r=self.create();thread=self.e.add_feedback(self.mel,r['id'],'Clarifier la cible','AUTHOR');self.assertEqual(thread[0]['body']['text'],'Clarifier la cible');self.assertNotIn(b'Clarifier',self.e.db.execute('SELECT body FROM feedback').fetchone()[0]);outside={'id':'OUT','roles':['APSE_STAFF'],'paths':['/OTHER']};self.fault('access_denied',lambda:self.e.feedback_thread(outside,r['id']))
 def test_feedback_reply_parent_must_match_record(self):
  r=self.create();self.fault('invalid_feedback_parent',lambda:self.e.add_feedback(self.staff,r['id'],'Réponse','MEL','unknown'))
 def test_ai_disabled_without_model(self):
  r=self.create()
  with patch.dict(os.environ,{'APSE_OLLAMA_MODEL':''}):self.fault('local_ai_not_configured',lambda:self.e.assist(self.staff,r['id'],'Bonjour','grammar','fr'))
 def test_draft_never_counts_as_approved_budget(self):
  self.create(values=self.plan(budget='100'));d=self.e.strategy_dashboard(self.mel,'2026-09-01','2027-08-31','AP1');self.assertEqual(d['groups'][0]['pending'],1);self.assertEqual(d['groups'][0]['approvedBudgetRWF'],0)
 def test_inbox_routes_feedback_by_level(self):
  r=self.create();self.e.add_feedback(self.mel,r['id'],'Finance review','FINANCE');self.assertEqual(self.e.feedback_inbox(self.staff),[]);finance={'id':'FIN','roles':['APSE_FINANCE'],'paths':['/ROOT/P1']};self.assertEqual(len(self.e.feedback_inbox(finance)),1)
 def test_f07_needs_plan_or_explicit_reason(self):
  v=dict(work_type='OPERATIONAL',record='ACT',axis='A1',result='A1.R1',activity='ACT',title='Test',owner='STAFF',total='0',women='0',men='0',undisclosed='0');self.fault('approved_plan_or_unplanned_reason_required',lambda:self.create('F07',v))
 def test_ai_proposal_does_not_modify_record(self):
  import io,json
  r=self.create();settings=self.e.metadata()['settings'][0];settings['labels']={l:'System' for l in ['fr','en','rw','sw']};settings['aiEnabled']=True;self.e.put_metadata(self.mel,'settings',settings,0,'Enable local model')
  with patch.dict(os.environ,{'APSE_OLLAMA_MODEL':'synthetic-test-model'}),patch('urllib.request.urlopen',return_value=io.BytesIO(json.dumps({'response':'Texte corrigé'}).encode())) as request:
   d=self.e.assist(self.staff,r['id'],'Texte','grammar','fr');self.assertEqual(d['suggestion'],'Texte corrigé');self.assertTrue(d['requiresHumanReview']);self.assertEqual(request.call_args.args[0].full_url,'http://127.0.0.1:11434/api/generate')
  self.assertEqual(self.e.get(self.staff,r['id'])['revision'],1)
 def test_dynamic_field_is_validated_by_engine(self):
  f={'code':'test_note','label':{'fr':'Note','en':'Note','rw':'Icyitonderwa','sw':'Dokezo'},'type':'TEXT','active':True};self.e.put_metadata(self.mel,'fields',f,0,'New field');form=next(x for x in self.e.metadata()['forms'] if x['code']=='F03');form['fields'].append('test_note');self.e.put_metadata(self.mel,'forms',form,0,'Extend form');self.assertEqual(self.create(values=self.plan(test_note='Bonjour'))['values']['test_note'],'Bonjour')
if __name__=='__main__':unittest.main()
