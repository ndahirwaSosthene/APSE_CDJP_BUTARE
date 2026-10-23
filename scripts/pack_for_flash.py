"""Consistent, encrypted-data portable copy. No plaintext records are exported.
The vault and password hashes remain encrypted. The same master password is required.
"""
from pathlib import Path
import sqlite3,zipfile,tempfile,hashlib,json,io,datetime
SKIP={'__pycache__','.venv','.runtime','vendor','portable_data','logs'}
def archive_bytes(root):
 root=Path(root).resolve();folder=root/'portable_data'
 if not all((folder/x).is_file()for x in ['apse.sqlite','vault.json','accounts.enc']):raise ValueError('Portable database/account/vault not initialised')
 with tempfile.TemporaryDirectory(prefix='apse-flash-snapshot-')as tmp:
  snapshot=Path(tmp)/'apse.sqlite';src=sqlite3.connect((folder/'apse.sqlite').as_uri()+'?mode=ro',uri=True);dst=sqlite3.connect(snapshot)
  try:src.backup(dst)
  finally:dst.close();src.close()
  files=[]
  for f in sorted(root.rglob('*')):
   rel=f.relative_to(root)
   if not f.is_file()or f.name in ['SHA256SUMS.json','FLASH_MANIFEST.json'] or set(rel.parts)&SKIP or f.name.endswith(('.pyc','.sqlite','.sqlite-wal','.sqlite-shm')):continue
   if f.suffix=='.zip'and 'runtime'not in rel.parts:continue
   files.append((f,str(rel)))
  files.extend([(snapshot,'portable_data/apse.sqlite'),(folder/'vault.json','portable_data/vault.json'),(folder/'accounts.enc','portable_data/accounts.enc')]);manifest={};out=io.BytesIO()
  with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)as z:
   for f,rel in files:
    b=f.read_bytes();manifest[rel]=hashlib.sha256(b).hexdigest();z.writestr(root.name+'/'+rel,b)
   z.writestr(root.name+'/FLASH_MANIFEST.json',json.dumps({'files':manifest,'data':'encrypted','mode':'LOCAL_PORTABLE','time':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2))
  return out.getvalue()
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));p.add_argument('--output');a=p.parse_args();root=Path(a.root);output=Path(a.output)if a.output else root.parent/('APSE_FLASH_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S')+'.zip');output.write_bytes(archive_bytes(root));print(output)
