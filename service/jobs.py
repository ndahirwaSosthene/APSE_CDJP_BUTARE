#!/usr/bin/env python3
"""Backups/restores and confidential alert digest. No notifications are sent automatically."""
import argparse,hashlib,json,os,sqlite3,tempfile
from pathlib import Path
from cryptography.fernet import Fernet
from engine import Engine
p=argparse.ArgumentParser();p.add_argument('action',choices=['backup','restore','verify']);p.add_argument('--file');p.add_argument('--database',default=os.environ.get('APSE_DB','/data/apse.sqlite'));a=p.parse_args()
key=os.environ['APSE_ENCRYPTION_KEY'].encode();audit=os.environ['APSE_AUDIT_KEY'].encode()
if a.action=='restore':
 if Path(a.database).exists():raise SystemExit('Refusing to overwrite an existing database')
 data=Fernet(os.environ['APSE_BACKUP_KEY'].encode()).decrypt(Path(a.file).read_bytes());Path(a.database).parent.mkdir(parents=True,exist_ok=True);Path(a.database).write_bytes(data);os.chmod(a.database,0o600)
 e=Engine(a.database,key,audit);print(json.dumps(e.verify_audit()));e.db.close()
else:
 e=Engine(a.database,key,audit);head=e.verify_audit()
 if a.action=='verify':print(json.dumps(head));e.db.close()
 else:
  if not a.file:raise SystemExit('--file required')
  target=Path(a.file)
  if target.exists():raise SystemExit('Refusing to replace an existing backup')
  with tempfile.TemporaryDirectory()as tmp:
   copy=Path(tmp)/'snapshot.db';dest=sqlite3.connect(copy)
   with e.lock:e.db.backup(dest)
   dest.close();encrypted=Fernet(os.environ['APSE_BACKUP_KEY'].encode()).encrypt(copy.read_bytes());target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(encrypted);os.chmod(target,0o600)
  target.with_suffix(target.suffix+'.json').write_text(json.dumps(dict(sha256=hashlib.sha256(encrypted).hexdigest(),audit=head),indent=2), encoding="utf-8");e.db.close();print('Encrypted backup created; verify restore on an isolated target')
