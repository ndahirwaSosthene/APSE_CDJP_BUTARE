"""Idempotent final packaging defaults; French names preserve English translations."""
import json,csv
from pathlib import Path
B=Path(__file__).resolve().parents[1]
p=B/'metadata/all.json';m=json.loads(p.read_text(encoding="utf-8"))
for objects in m.values():
 for x in objects:
  t=x.get('translations',[]);fr=next((v['value'] for v in t if v['locale']=='fr' and v['property']=='NAME'),None)
  if fr and x.get('name')!=fr:
   en=x.get('name','');x['translations']=[v for v in t if not(v['locale']=='en' and v['property']=='NAME')]+[dict(locale='en',property='NAME',value=en)];x['name']=fr
   if 'shortName' in x:x['shortName']=fr[:50]
p.write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8")
p=B/'app/manifest.webapp';c=json.loads(p.read_text(encoding="utf-8"));c.update(version='0.3.0',default_locale='fr');p.write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8")
s=json.loads((B/'registers/metadata_seed.json').read_text(encoding="utf-8"))
with (B/'registers/parishes.csv').open('w') as out:
 w=csv.writer(out);w.writerow(['code','name','dhis2_uid','parent_uid','deanery','status'])
 for x in s['organisation_units']:w.writerow([x['code'],x['labels']['fr'],'','','','PARENT_AND_DHIS2_BINDING_REQUIRED'])
print('French defaults and source parish register prepared')
