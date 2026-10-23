#!/usr/bin/env python3
import json,re,sys,hashlib
from pathlib import Path
B=Path(__file__).resolve().parents[1];m=json.loads((B/'metadata/all.json').read_text(encoding="utf-8"));c=json.loads((B/'app/config.json').read_text(encoding="utf-8"));errors=[];ids={}
for coll,objects in m.items():
 for o in objects:
  i=o['id']
  if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]{10}',i):errors.append('Invalid UID '+i)
  if i in ids:errors.append('Duplicate UID '+i)
  ids[i]=coll
for f in c['forms']:
 if set(f['label'])!={'rw','en','fr','sw'}:errors.append('Languages '+f['code'])
 if not set(f['required'])<=set(f['fields']):errors.append('Required fields '+f['code'])
 for k in f['fields']:
  if k not in c['fields']:errors.append('Unknown field '+k)
  elif c['fields'][k]['id'] not in ids:errors.append('Missing DE '+k)
for f in c['fields'].values():
 if set(f['label'])!={'rw','en','fr','sw'} or any(not s.strip() for s in f['label'].values()):errors.append('Missing translation '+f['key'])
for p in m['programs']:
 if p.get('publicAccess')!='--------':errors.append('Public program '+p['code'])
 for stage in p['programStages']:
  if ids.get(stage['id'])!='programStages':errors.append('Broken stage reference')
for stage in m['programStages']:
 if ids.get(stage['program']['id'])!='programs':errors.append('Broken program reference')
 for d in stage['programStageDataElements']:
  if ids.get(d['dataElement']['id'])!='dataElements':errors.append('Broken element reference')
for o in m['options']:
 if ids.get(o['optionSet']['id'])!='optionSets':errors.append('Broken option reference')
for coll,objects in m.items():
 codes=[x['code']for x in objects if x.get('code')]
 if len(codes)!=len(set(codes)):errors.append('Duplicate code in '+coll)
assert len(c['forms']) in [26,42,43]
report={'passed':not errors,'errors':errors,'counts':{k:len(v) for k,v in m.items()},'languageCoverage':{l:sum(l in f['label'] for f in c['fields'].values()) for l in c['languages']},'notTested':['Live DHIS2 metadata/schema import','Live authentication/permissions','Android offline sync','Production performance/restore/security','Native DHIS2 interface translations in rw/sw','Live pseudonymous journey permissions and production restore']}
(B/'docs/validation.json').write_text(json.dumps(report,indent=2), encoding="utf-8");print(json.dumps(report,indent=2));sys.exit(bool(errors))
