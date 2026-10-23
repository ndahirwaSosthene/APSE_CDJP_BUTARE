#!/usr/bin/env python3
"""Package existing validated outputs without regenerating institutional metadata."""
from pathlib import Path
import hashlib,json,zipfile
B=Path(__file__).resolve().parents[1]
app=B/'APSE_App_0.8.0.zip'
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED)as z:
 for f in sorted((B/'app').iterdir()):
  if f.is_file():z.write(f,f.name)
def include(f):return f.is_file() and not set(f.parts)&{'__pycache__','portable_data','logs','.runtime','.venv'} and not f.name.endswith(('.pyc','.sqlite','.sqlite-wal','.sqlite-shm')) and (not f.suffix=='.zip' or f==app or 'runtime' in f.parts)
files=[f for f in sorted(B.rglob('*')) if include(f) and f.name!='SHA256SUMS.json']
(B/'SHA256SUMS.json').write_text(json.dumps({str(f.relative_to(B)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files},indent=2), encoding="utf-8")
out=B.parent/'APSE_CDJP_Butare_Windows_v0.8.0.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)as z:
 for f in files+[B/'SHA256SUMS.json']:z.write(f,str(Path(B.name)/f.relative_to(B)))
print(out)
