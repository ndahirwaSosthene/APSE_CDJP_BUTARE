import sys,unittest,threading,json,urllib.request,urllib.error,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
import server
from cryptography.fernet import Fernet
from engine import Engine,Fault
class HTTPTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();server.ENGINE=Engine(self.t.name+'/data.db',Fernet.generate_key(),b'a'*32);server.PUBLIC='https://test.example';server.identity=lambda headers:dict(id='USER1',roles=['APSE_MEL'],paths=['/ROOT/UNIT'],units=[dict(id='UNIT',name='Test',path='/ROOT/UNIT')]);server.upstream=lambda path,headers:dict(organisationUnits=[dict(id='UNIT',name='Test',path='/ROOT/UNIT')])if path.startswith('organisationUnits.json')else dict(id='UNIT',path='/ROOT/UNIT');self.s=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);self.thread=threading.Thread(target=self.s.serve_forever,daemon=True);self.thread.start();self.url='http://127.0.0.1:'+str(self.s.server_port)+server.PREFIX
 def tearDown(self):self.s.shutdown();self.thread.join();self.s.server_close();server.ENGINE.db.close();self.t.cleanup()
 def request(self,path,method='GET',body=None,origin='https://test.example',client='web'):
  req=urllib.request.Request(self.url+path,data=json.dumps(body).encode()if body else None,method=method,headers={'Content-Type':'application/json','X-APSE-Client':client,'Origin':origin,'Idempotency-Key':'TEST_KEY_1234567890'})
  try:
   with urllib.request.urlopen(req)as r:return r.status,r.headers,r.read()
  except urllib.error.HTTPError as r:return r.code,r.headers,r.read()
 def body(self):return dict(form='F07',unit='UNIT',event_date='2026-10-19',values=dict(work_type='OPERATIONAL',record='A1',axis='A1',result='A1.R1',activity='ACT1',title='Test',reason='Synthetic unplanned test',owner='USER1',total='0',women='0',men='0',undisclosed='0',evidence='PV'))
 def test_csrf_origin(self):status,_,_=self.request('/records','POST',self.body(),origin='https://evil.example');self.assertEqual(status,403)
 def test_custom_header_required(self):status,_,_=self.request('/records','POST',self.body(),client='');self.assertEqual(status,403)
 def test_http_creation_and_list(self):
  status,headers,data=self.request('/records','POST',self.body());self.assertEqual(status,201);self.assertEqual(headers['Cache-Control'],'no-store');record=json.loads(data);self.assertEqual(record['state'],'DRAFT');status,_,data=self.request('/records?start=2026-09-01&end=2026-11-30');self.assertEqual(len(json.loads(data)['records']),1)
 def test_server_does_not_trust_body_unit_path(self):
  b=self.body();b['path']='/EVIL';status,_,data=self.request('/records','POST',b);self.assertEqual(status,201);self.assertEqual(json.loads(data)['path'],'/ROOT/UNIT')
 def test_config_contains_four_languages_and_strategy(self):
  status,_,data=self.request('/config');c=json.loads(data);self.assertEqual(len(c['strategicResults']),13);self.assertEqual(c['languages'],['rw','en','fr','sw'])
 def test_annual_catalog_and_server_period(self):
  status,_,data=self.request('/planning?ap=AP2&audience=STAFF');self.assertEqual(status,200);self.assertEqual(json.loads(data)['annual_tasks'],[])
  status,_,data=self.request('/period?kind=final&date=2026-10-20');self.assertEqual(json.loads(data)['start'],'2031-04-01')
 def test_metadata_requires_mel_on_write(self):
  status,_,data=self.request('/metadata');self.assertEqual(status,200);m=json.loads(data);entry=m['objectives'][0];server.identity=lambda headers:dict(id='STAFF',roles=['APSE_STAFF'],paths=['/ROOT/UNIT']);status,_,_=self.request('/metadata','POST',dict(category='objectives',entry=entry,version=0,reason='Test'));self.assertEqual(status,403)
 def test_report_is_real_docx(self):
  status,h,data=self.request('/report?format=docx&language=fr&code=R05&start=2026-09-01&end=2026-11-30');self.assertEqual(status,200);self.assertTrue(data.startswith(b'PK'));self.assertIn('attachment',h['Content-Disposition'])
 def test_collection_publish_config_and_permission_endpoints(self):
  schema=json.loads((Path(__file__).resolve().parents[1]/'app/collection_templates.json').read_text())[1];schema.update(audienceRoles=['APSE_CPJP'],unitPaths=['/ROOT/UNIT'])
  status,_,data=self.request('/collections','POST',schema);self.assertEqual(status,201)
  status,_,data=self.request('/config');self.assertIn(schema['code'],[f['code'] for f in json.loads(data)['forms']])
  status,_,data=self.request('/records','POST',self.body());r=json.loads(data)
  status,_,data=self.request('/edit-permissions','POST',dict(record=r['id'],grantee='OTHER',revision=r['revision'],hours=1,reason='Correction'));self.assertEqual(status,201);pid=json.loads(data)['id']
  status,_,data=self.request('/edit-permissions/revoke','POST',dict(id=pid));self.assertEqual(status,200)
 def test_utf8_transport_and_working_draft_routes(self):
  status,h,data=self.request('/config');self.assertIn('charset=utf-8',h['Content-Type']);self.assertIn('réconciliation',data.decode('utf-8'))
  import uuid
  draft=dict(id=str(uuid.uuid4()),revision=0,form='F07',unit='UNIT',event_date='2026-10-20',language='fr',values={'title':'Écoute à l’échelle locale'})
  status,_,data=self.request('/working-drafts','POST',draft);self.assertEqual(status,200);status,_,data=self.request('/working-drafts');self.assertEqual(json.loads(data)['drafts'][0]['payload']['values']['title'],draft['values']['title'])
if __name__=='__main__':unittest.main(verbosity=2)
