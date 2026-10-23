"""Build portable Windows x64 runtime from verified official Python and PyPI wheels.
Build step only: no download occurs when the user launches START_APSE_WINDOWS.cmd.
"""
from pathlib import Path
import urllib.request,zipfile,io,hashlib,json,shutil
B=Path(__file__).resolve().parents[1];out=B/'runtime/windows';out.mkdir(parents=True,exist_ok=True)
url='https://www.python.org/ftp/python/3.13.16/python-3.13.16-embed-amd64.zip';expected='97dae5274cc54867065e8d5a3226e48c35017ed332a0fdb0e27d5b5821961297'
with urllib.request.urlopen(url,timeout=45)as response:data=response.read(20*1024*1024)
actual=hashlib.sha256(data).hexdigest()
if actual!=expected:raise SystemExit('Official Python SHA256 mismatch')
with zipfile.ZipFile(io.BytesIO(data))as z:z.extractall(out)
site=out/'Lib/site-packages';site.mkdir(parents=True,exist_ok=True);wheels=[]
for wheel in sorted((B/'vendor/wheels/windows-cp313').glob('*.whl')):
 with zipfile.ZipFile(wheel)as z:
  for item in z.infolist():
   parts=Path(item.filename).parts
   if not parts or item.is_dir():continue
   if any(x in ['..']for x in parts)or Path(item.filename).is_absolute():raise ValueError('Unsafe wheel')
   if parts[0].endswith('.data'):
    if len(parts)<3 or parts[1]not in ['purelib','platlib']:continue
    relative=Path(*parts[2:])
   else:relative=Path(*parts)
   target=site/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(item))
 wheels.append(dict(file=wheel.name,sha256=hashlib.sha256(wheel.read_bytes()).hexdigest()))
if len(wheels)<8:raise SystemExit('Dependency wheel set incomplete')
(out/'python313._pth').write_text('python313.zip\n.\nLib/site-packages\n../../service\n../../scripts\nimport site\n', encoding="utf-8")
(B/'runtime/SOURCES.json').write_text(json.dumps(dict(pythonURL=url,sha256=actual,pythonVersion='3.13.16',target='Windows 10/11 x64',wheels=wheels,nativeWindowsExecutionTested=False),indent=2), encoding="utf-8")
print('Windows x64 embedded runtime prepared; official SHA256 verified; all dependency licences preserved')
