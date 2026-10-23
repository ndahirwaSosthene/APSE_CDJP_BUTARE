#!/usr/bin/env python3
"""Generate organisation metadata from an approved complete register, never infer parents."""
import argparse,csv,json,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('register');p.add_argument('--existing-parent',action='append',default=[]);p.add_argument('--output',default='organisation-units.json');a=p.parse_args();rows=list(csv.DictReader(open(a.register)));seen=set();out=[]
for r in rows:
 if r['validated'].lower() not in ['true','yes','1']:raise SystemExit('Unvalidated organisation '+r['code'])
 i=r['uid'];parent=r['parent_uid']
 if not re.fullmatch('[A-Za-z][A-Za-z0-9]{10}',i) or i in seen:raise SystemExit('Invalid/duplicate UID '+i)
 if not r['name'] or not r['opening_date']:raise SystemExit('Missing name/open date')
 seen.add(i);o=dict(id=i,name=r['name'],shortName=r['name'][:50],code=r['code'],openingDate=r['opening_date'])
 if parent:o['parent']={'id':parent}
 out.append(o)
parents={r['uid']:r['parent_uid'] for r in rows}
for i,parent in parents.items():
 if parent and parent not in seen and parent not in a.existing_parent:raise SystemExit('Unknown parent '+parent)
 path=set();cur=i
 while cur in parents:
  if cur in path:raise SystemExit('Hierarchy cycle '+cur)
  path.add(cur);cur=parents[cur]
Path(a.output).write_text(json.dumps({'organisationUnits':out},ensure_ascii=False,indent=2), encoding="utf-8");print(str(len(out))+' validated units written')
