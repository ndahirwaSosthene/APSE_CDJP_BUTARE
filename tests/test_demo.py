"""Exercise the real loopback demo entry point over HTTP with synthetic data."""
import json,signal,socket,subprocess,sys,unittest,urllib.request
from pathlib import Path
class DemoSmokeTest(unittest.TestCase):
 def test_demo_preparation_to_approval_and_feedback(self):
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  root=Path(__file__).resolve().parents[1];process=subprocess.Popen([sys.executable,str(root/'scripts/demo_offline.py'),'--port',str(port)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  try:
   self.assertIn('DEMO ONLY',process.stdout.readline());base='http://127.0.0.1:'+str(port)
   def req(path,role='MEL',method='GET',body=None):
    r=urllib.request.Request(base+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'Cookie':'apse_demo='+role,'Origin':base,'X-APSE-Client':'web','Content-Type':'application/json','Idempotency-Key':'DEMO_SMOKE_KEY_1234567890'})
    with urllib.request.urlopen(r,timeout=10)as response:return response.read()
   self.assertIn(b'governance.js',req('/api/apps/apse/operations.html'));self.assertEqual(json.loads(req('/apse-service/config'))['defaultLanguage'],'fr')
   self.assertEqual(json.loads(req('/apse-service/planning?ap=AP2&audience=STAFF','STAFF'))['annual_tasks'],[])
   v=dict(preparer_mode='PAIR',preparer_1='Synthetic preparer',preparer_2='Synthetic colleague',reporter_level='CDJP',cnv_checked='true',dnh_checked='true',trauma_checked='true',sensitivity_notes='Synthetic inclusive pastoral measures',work_type='OPERATIONAL',record='SMOKE-PLAN',axis='A1',result='A1.R1',objective='A1.OS',intervention='A1.I1',activity='SMOKE',title='Synthetic plan',start='2026-09-01',end='2027-08-31',owner='DEMO_STAFF',ap='AP1',operation_ref='PAO-AP1-R010',plan_type='STAFF',budget='100',evidence='SYNTHETIC-PV')
   r=json.loads(req('/apse-service/records','STAFF','POST',dict(form='F03',unit='DemoUnit001',event_date='2026-10-20',values=v)))
   for role,target in [('STAFF','SUBMITTED'),('MEL','MEL_VALIDATED'),('COORDINATOR','VERIFIED'),('DIRECTION','APPROVED')]:r=json.loads(req('/apse-service/records/'+r['id']+'/transition',role,'POST',dict(revision=r['revision'],target=target,reason='Synthetic check')))
   self.assertEqual(r['state'],'APPROVED');self.assertEqual(len(r['reviews']),4)
   req('/apse-service/feedback','MEL','POST',dict(record=r['id'],text='Synthetic feedback',recipient='AUTHOR'));self.assertEqual(len(json.loads(req('/apse-service/inbox','STAFF'))['feedback']),1)
   d=json.loads(req('/apse-service/strategy?start=2026-09-01&end=2027-08-31'));self.assertEqual(d['groups'][0]['approvedBudgetRWF'],100)
  finally:
   process.send_signal(signal.SIGINT);process.communicate(timeout=10)
