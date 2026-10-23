import unittest,sys,tempfile,subprocess,signal,socket,urllib.request,urllib.error,json,shutil,base64
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from portable import unlock,Accounts,local_units
MASTER='Master-passphrase-12345';PASSWORD='Account-password-12345'
class PortableTests(unittest.TestCase):
 def test_vault_and_accounts_survive_folder_copy(self):
  with tempfile.TemporaryDirectory()as tmp:
   a=Path(tmp)/'first';b=Path(tmp)/'moved';keys=unlock(a,MASTER,True);accounts=Accounts(a,keys['encryption']);accounts.add('MEL',PASSWORD,['APSE_MEL'],['/LocalRoot01']);shutil.copytree(a,b);other=unlock(b,MASTER);self.assertEqual(keys,other);self.assertTrue(Accounts(b,other['encryption']).verify('MEL',PASSWORD));self.assertNotIn(keys['encryption'].encode(),(a/'vault.json').read_bytes())
   with self.assertRaises(ValueError):unlock(b,'incorrect-password')
 def test_local_units_are_known_parishes_not_native_dhis_bindings(self):self.assertEqual(len(local_units()),28);self.assertEqual(local_units()[0]['kind'],'CDJP');self.assertEqual(sum(x['kind']=='CPJP'for x in local_units()),27)
 def test_authenticated_import_and_data_after_relocation(self):
  B=Path(__file__).resolve().parents[1]
  with tempfile.TemporaryDirectory()as tmp:
   first=Path(tmp)/'First APSE';moved=Path(tmp)/'Other machine APSE'
   for name in ['app','service','registers','scripts','metadata']:shutil.copytree(B/name,first/name,ignore=shutil.ignore_patterns('__pycache__','*.zip'))
   def start(root,new):
    with socket.socket()as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    p=subprocess.Popen([sys.executable,str(root/'service/portable.py'),'--port',str(port),'--stdin-secrets','--no-browser'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);p.stdin.write(MASTER+'\n'+('MEL\n'+PASSWORD+'\n'if new else''));p.stdin.flush();line=p.stdout.readline();self.assertIn('APSE LOCAL',line);return p,'http://127.0.0.1:'+str(port)
   def stop(p):p.send_signal(signal.SIGINT);p.communicate(timeout=10)
   cookie=''
   def request(base,path,method='GET',body=None):
    r=urllib.request.Request(base+path,method=method,data=json.dumps(body).encode()if body is not None else None,headers={'Content-Type':'application/json','Origin':base,'X-APSE-Client':'web','Cookie':cookie})
    try:
     with urllib.request.urlopen(r,timeout=10)as response:return response.status,response.headers,response.read()
    except urllib.error.HTTPError as response:return response.code,response.headers,response.read()
   p,base=start(first,True)
   try:
    self.assertEqual(request(base,'/apse-service/config')[0],401);status,h,b=request(base,'/local/login','POST',dict(username='MEL',password='wrong'));self.assertEqual(status,401);status,h,b=request(base,'/local/login','POST',dict(username='MEL',password=PASSWORD));self.assertEqual(status,200);cookie=h['Set-Cookie'].split(';')[0];c=json.loads(request(base,'/apse-service/config')[2]);self.assertEqual(c['identity']['mode'],'LOCAL_PORTABLE')
    v=dict(event_date='2026-10-20',record='MOVE-1',axis='A1',result='A1.R1',activity='ACT',title='Test relocation',owner='MEL',total='0',women='0',men='0',undisclosed='0',work_type='OPERATIONAL',reason='Synthetic test');payload=dict(form='F07',unit='LocalRoot01',format='json',data=base64.b64encode(json.dumps([v]).encode()).decode());self.assertEqual(json.loads(request(base,'/apse-service/import/preview','POST',payload)[2])['valid'],1);r=json.loads(request(base,'/apse-service/import/commit','POST',payload)[2]);self.assertEqual(r['createdOrReused'],1);record=r['rows'][0]['id'];self.assertEqual(request(base,'/demo/login?role=MEL')[0],404)
   finally:stop(p)
   sys.path.insert(0,str(B/'scripts'));from pack_for_flash import archive_bytes
   import zipfile,io
   blob=archive_bytes(first)
   with zipfile.ZipFile(io.BytesIO(blob))as z:z.extractall(moved)
   moved=moved/first.name;p,base=start(moved,False)
   try:
    self.assertEqual(request(base,'/apse-service/config')[0],401);status,h,b=request(base,'/local/login','POST',dict(username='MEL',password=PASSWORD));cookie=h['Set-Cookie'].split(';')[0];export=json.loads(request(base,'/apse-service/export/data?format=json&approved=false&start=2026-09-01&end=2027-08-31')[2]);self.assertEqual(export['records'][0]['id'],record);request(base,'/local/logout','POST',{});self.assertEqual(request(base,'/apse-service/config')[0],401)
   finally:stop(p)
 def test_incomplete_data_does_not_generate_new_keys(self):
  with tempfile.TemporaryDirectory()as tmp:
   p=Path(tmp);(p/'apse.sqlite').write_bytes(b'existing')
   with self.assertRaises(ValueError):unlock(p,MASTER,True)
   self.assertFalse((p/'vault.json').exists())
 def test_integrity_verifier_detects_corrupt_copy(self):
  sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'));from verify_install import verify
  import hashlib
  with tempfile.TemporaryDirectory()as tmp:
   p=Path(tmp);(p/'app').mkdir();(p/'app/test.js').write_text('original');(p/'SHA256SUMS.json').write_text(json.dumps({'app/test.js':hashlib.sha256(b'original').hexdigest()}));self.assertEqual(verify(p),[]);(p/'app/test.js').write_text('changed');self.assertTrue(verify(p))
 def test_password_login_throttling(self):
  from portable import LocalSession
  with tempfile.TemporaryDirectory()as tmp:
   keys=unlock(tmp,MASTER,True);accounts=Accounts(tmp,keys['encryption']);accounts.add('MEL',PASSWORD,['APSE_MEL'],['/LocalRoot01']);s=LocalSession(accounts,local_units())
   for n in range(5):self.assertEqual(s.login('MEL','wrong')[1],401)
   self.assertEqual(s.login('MEL',PASSWORD)[1],429)
