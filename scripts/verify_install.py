"""Verify portable code/runtime after extraction or USB transfer. No secrets read."""
from pathlib import Path
import json,hashlib,sys
B=Path(__file__).resolve().parents[1]
def verify(root):
 root=Path(root);flash=root/'FLASH_MANIFEST.json';p=flash if flash.is_file()else root/'SHA256SUMS.json';data=json.loads(p.read_text(encoding="utf-8"));hashes=data['files']if flash.is_file()else data;errors=[]
 for name,wanted in hashes.items():
  parts=Path(name).parts
  if not parts or Path(name).is_absolute()or'..'in parts:errors.append('invalid path');continue
  if parts[0]in ['portable_data','docs','tests']:continue
  f=root/name
  if not f.is_file():errors.append('missing: '+name)
  elif hashlib.sha256(f.read_bytes()).hexdigest()!=wanted:errors.append('changed: '+name)
 if flash.is_file():
  for name in ['apse.sqlite','accounts.enc','vault.json']:
   if not(root/'portable_data'/name).is_file():errors.append('missing portable data: '+name)
 return errors
if __name__=='__main__':
 try:errors=verify(B)
 except (OSError,ValueError):errors=['Manifest missing or unreadable. Extract the full original ZIP.']
 print('\n'.join(errors)if errors else 'APSE verification OK');sys.exit(bool(errors))
