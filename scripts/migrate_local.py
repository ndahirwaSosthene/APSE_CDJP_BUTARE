"""Copy an existing local encrypted dataset consistently; never overwrite either copy."""
from pathlib import Path
import sqlite3,shutil,tempfile,os,argparse

def migrate(source,target):
 source=Path(source).resolve();target=Path(target).resolve()
 if source==target:raise ValueError('Source and destination must differ')
 if target.exists():raise ValueError('Destination data already exists; no files overwritten')
 for name in ['apse.sqlite','vault.json','accounts.enc']:
  if not(source/name).is_file():raise ValueError('Incomplete source dataset: '+name)
 target.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='apse-migration-',dir=target.parent)as tmp:
  stage=Path(tmp)/'portable_data';stage.mkdir();src=sqlite3.connect((source/'apse.sqlite').as_uri()+'?mode=ro',uri=True);dst=sqlite3.connect(stage/'apse.sqlite')
  try:
   src.backup(dst)
   if dst.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('SQLite integrity check failed')
  finally:dst.close();src.close()
  for name in ['vault.json','accounts.enc']:shutil.copyfile(source/name,stage/name)
  os.replace(stage,target)
 return target
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--target',required=True);a=p.parse_args()
 try:print('Encrypted dataset copied; original kept: '+str(migrate(a.source,a.target)))
 except (OSError,ValueError,sqlite3.Error)as e:p.exit(1,str(e)+'\n')
