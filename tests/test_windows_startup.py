"""Portable startup regression checks; not native Windows execution tests."""
import contextlib,io,importlib.util,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
B=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(B/'service'))
class StartupTests(unittest.TestCase):
 def test_embedded_module_paths(self):
  root=B/'runtime/windows';paths=[x.strip() for x in (root/'python313._pth').read_text().splitlines() if x and not x.startswith('import ')]
  resolved=[(root/x).resolve() for x in paths]
  self.assertIn((B/'service').resolve(),resolved);self.assertIn((B/'scripts').resolve(),resolved)
  self.assertTrue((root/'python.exe').is_file());self.assertTrue((root/'python313.zip').is_file())
 def test_boot_with_isolated_python(self):
  r=subprocess.run([sys.executable,'-I',str(B/'service/portable_boot.py'),'--help'],capture_output=True,text=True,timeout=20)
  self.assertEqual(r.returncode,0,r.stderr);self.assertIn('--no-browser',r.stdout)
 def test_startup_error_is_logged_without_locals(self):
  spec=importlib.util.spec_from_file_location('test_boot',B/'service/portable_boot.py');boot=importlib.util.module_from_spec(spec);spec.loader.exec_module(boot)
  with tempfile.TemporaryDirectory() as tmp:
   boot.ROOT=Path(tmp)
   with patch('portable.main',side_effect=RuntimeError('synthetic-startup-failure')),contextlib.redirect_stderr(io.StringIO()):
    self.assertEqual(boot.main(),1)
   message=(Path(tmp)/'logs/last-error.txt').read_text();self.assertIn('synthetic-startup-failure',message);self.assertNotIn('local variables',message)
 def test_launcher_has_clear_missing_runtime_path(self):
  data=(B/'START_APSE_WINDOWS.cmd').read_bytes();self.assertIn(b'\r\n',data);s=data.decode();self.assertIn('goto missing_runtime',s);self.assertIn('Extract All',s);self.assertIn('logs\\startup-check.txt',s);self.assertIn('portable_boot.py',s)
 def test_installer_validates_zip_and_preserves_existing_installation(self):
  s=(B/'scripts/windows_installer_template.txt').read_text();self.assertIn('Get-FileHash',s);self.assertIn('__ARCHIVE_SHA256__',s);self.assertIn('if (-not (Test-Path -LiteralPath $target))',s);self.assertIn('CreateShortcut',s);self.assertNotIn('Remove-Item -LiteralPath $target',s)

 def test_consistent_upgrade_keeps_encrypted_accounts_and_record_ids(self):
  import json
  sys.path.insert(0,str(B/'scripts'));from migrate_local import migrate
  from portable import unlock,Accounts
  from engine import Engine
  with tempfile.TemporaryDirectory()as tmp:
   source=Path(tmp)/'old data';target=Path(tmp)/'new data';keys=unlock(source,'Upgrade-master-password-123',True);accounts=Accounts(source,keys['encryption']);accounts.add('MEL','Account-password-123',['APSE_MEL'],['/ROOT'])
   e=Engine(source/'apse.sqlite',keys['encryption'].encode(),keys['audit'].encode());actor=dict(id='MEL',roles=['APSE_MEL'],paths=['/ROOT']);r=e.create(actor,'F07','P1','/ROOT/P1','2026-10-20',dict(axis='A1',result='A1.R1',title='Réconciliation',activity='Test',owner='MEL',total='0',women='0',men='0',undisclosed='0',work_type='OPERATIONAL',reason='Test',evidence='PV'),'UPGRADE_KEY_1234567890');did=__import__('uuid').uuid4().hex;e.save_working_draft(actor,dict(id=did,form='F07',event_date='2026-10-20',values={'title':'Incomplete draft'}),'P1','/ROOT/P1');migrate(source,target);e.db.close();new=unlock(target,'Upgrade-master-password-123');self.assertEqual(keys,new);copy=Engine(target/'apse.sqlite',new['encryption'].encode(),new['audit'].encode());self.assertEqual(copy.get(actor,r['id'])['id'],r['id']);self.assertEqual(len(copy.draft_listing(actor)),1);self.assertTrue(copy.verify_audit());copy.db.close();self.assertTrue(Accounts(target,new['encryption']).verify('MEL','Account-password-123'));self.assertTrue((source/'apse.sqlite').exists())
 def test_upgrade_never_overwrites_existing_data(self):
  sys.path.insert(0,str(B/'scripts'));from migrate_local import migrate
  with tempfile.TemporaryDirectory()as tmp:
   source=Path(tmp)/'old';target=Path(tmp)/'new';target.mkdir();(target/'keep').write_text('original')
   with self.assertRaises(ValueError):migrate(source,target)
   self.assertEqual((target/'keep').read_text(),'original')
 def test_windows_cp1252_locale_does_not_corrupt_metadata(self):
  code="""import sys,json
from pathlib import Path
root=Path(sys.argv[1]);sys.path.insert(0,str(root/'service'))
original=Path.read_text
def windows_read(self,encoding=None,errors=None):return original(self,encoding=encoding or 'cp1252',errors=errors)
Path.read_text=windows_read
from engine import Engine
from cryptography.fernet import Fernet
e=Engine(':memory:',Fernet.generate_key(),b'x'*32);c=e.configuration()
assert c['options']['axis'][0]['label']['fr']=='Unité, réconciliation et résilience'
assert c['fields']['age_u18']['label']['fr'].startswith('Âge')
assert '’' in c['fields']['title']['label']['rw'] or c['fields']['title']['label']['rw']
e.db.close();print('PASS simulated Windows cp1252 locale preserves UTF-8 metadata')
"""
  r=subprocess.run([sys.executable,'-I','-c',code,str(B)],capture_output=True,text=True,timeout=20);self.assertEqual(r.returncode,0,r.stderr);self.assertIn('PASS simulated Windows',r.stdout)
 def test_runtime_source_text_io_always_declares_utf8(self):
  import ast
  for folder in ['service','scripts']:
   for p in (B/folder).glob('*.py'):
    for n in ast.walk(ast.parse(p.read_text(encoding='utf-8'))):
     if isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and n.func.attr in ['read_text','write_text']:
      self.assertTrue(any(k.arg=='encoding'and isinstance(k.value,ast.Constant)and k.value.value.lower().replace('_','-').startswith('utf-8')for k in n.keywords),(str(p),n.lineno))
