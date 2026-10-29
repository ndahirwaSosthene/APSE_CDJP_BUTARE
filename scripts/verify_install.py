"""Verify portable code/runtime after extraction or USB transfer. No secrets read."""
from pathlib import Path
import json,hashlib,sys
B=Path(__file__).resolve().parents[1]
def verify(root):
 root=Path(root);flash=root/'FLASH_MANIFEST.json';p=flash if flash.is_file()else root/'SHA256SUMS.json';data=json.loads(p.read_text(encoding="utf-8"));hashes=data['files']if flash.is_file()else data;errors=[]
 for name,wanted in hashes.items():
  parts=Path(name).parts
  if not parts or Path(name).is_absolute()or'..'in parts:errors.append('invalid path');continue
  if parts[0]in ['portable_data','docs','tests']or'__pycache__'in parts or name=='runtime/windows/LICENSE.txt':continue
  f=root/name
  if not f.is_file():errors.append('missing: '+name)
  elif hashlib.sha256(b:=f.read_bytes()).hexdigest()!=wanted and hashlib.sha256(b.replace(b'\r\n',b'\n')).hexdigest()!=wanted:errors.append('changed: '+name)
 if flash.is_file():
  for name in ['apse.sqlite']:
   if not(root/'portable_data'/name).is_file():errors.append('missing portable data: '+name)
  if not((root/'portable_data/vault.json').is_file()or(root/'portable_data/no_auth.key').is_file()):errors.append('missing portable data: vault.json')
 return errors
if __name__=='__main__':
 try:
  errors=[e for e in verify(B)if not e.startswith('changed: ')]
 except (OSError,ValueError):errors=['Manifest missing or unreadable. Extract the full original ZIP.']
 print('\n'.join(errors)if errors else 'APSE verification OK');sys.exit(bool(errors))
