#!/usr/bin/env python3
"""Non-destructive DHIS2 metadata preflight/import. Credentials stay in environment."""
import argparse,json,os,re,sys,urllib.request,urllib.error,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Client:
 def __init__(self,url,token):
  self.url=url.rstrip('/');self.token=token
  if not self.url.startswith('https://'):raise ValueError('HTTPS required')
 def call(self,path,payload=None):
  request=urllib.request.Request(self.url+'/api/'+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'ApiToken '+self.token,'Content-Type':'application/json','Accept':'application/json'})
  # Never send the token to a redirected host.
  class NoRedirect(urllib.request.HTTPRedirectHandler):
   def redirect_request(self,*args):return None
  try:
   with urllib.request.build_opener(NoRedirect()).open(request,timeout=180) as response:return json.load(response)
  except urllib.error.HTTPError as exc:
   raise RuntimeError(f'HTTP {exc.code}: '+exc.read(20000).decode(errors='replace')) from None
 def all(self,path,key):return self.call(path)[key]
def has_errors(result):
 if isinstance(result,dict):
  if result.get('status') in ['ERROR','WARNING'] or result.get('importStatus') in ['ERROR','WARNING']:return True
  if result.get('errorReports'):return True
  if result.get('ignored',0):return True
  return any(has_errors(v) for v in result.values())
 if isinstance(result,list):return any(has_errors(v) for v in result)
 return False
def main():
 p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--root',required=True,help='Existing CDJP organisation UID');p.add_argument('--apply',action='store_true');p.add_argument('--include-sensitive',action='store_true');p.add_argument('--out',default='import-report.json');a=p.parse_args()
 if not re.fullmatch('[A-Za-z][A-Za-z0-9]{10}',a.root):p.error('Invalid root UID')
 token=os.environ.get('DHIS2_TOKEN');
 if not token:p.error('Set DHIS2_TOKEN to an administrator personal access token')
 c=Client(a.url,token);info=c.call('system/info');version=info.get('version','');
 if not version.startswith('2.42.'):raise RuntimeError('This release targets 2.42.x; review and test compatibility for '+version)
 root=c.call('organisationUnits/'+a.root+'?fields=id,name,path');units=c.all('organisationUnits?fields=id,path&paging=false','organisationUnits');ids=[u['id'] for u in units if a.root in u['path'].split('/')]
 if not ids:raise RuntimeError('Root has no accessible organisation units')
 m=json.loads((ROOT/'metadata/all.json').read_text(encoding="utf-8"));config=json.loads((ROOT/'app/config.json').read_text(encoding="utf-8"));excluded={f['id'] for f in config['forms'] if f['sensitive'] and not a.include_sensitive};stages={f['stage'] for f in config['forms'] if f['id'] in excluded}
 m['programs']=[x for x in m['programs'] if x['id'] not in excluded];m['programStages']=[x for x in m['programStages'] if x['id'] not in stages]
 for x in m['programs']:x['organisationUnits']=[{'id':i} for i in ids]
 for x in m.get('dataSets',[]):x['organisationUnits']=[{'id':i} for i in ids]
 # Install only new IDs. A second install must never replace access lists or existing configuration.
 for collection,objects in m.items():
  if not objects:continue
  ours={o['id'] for o in objects};existing=c.all(collection+'?fields=id&paging=false',collection)
  overlap=ours&{o['id'] for o in existing}
  if overlap:raise RuntimeError('Existing APSE objects detected in '+collection+'. Stop; use a reviewed migration rather than overwriting sharing or data.')
 for de in m['dataElements']:
  if de.get('domainType')=='AGGREGATE':
   # Use the server default category combo; never hard-code a demo database UID.
   defaults=c.all('categoryCombos?filter=name:eq:default&fields=id&paging=false','categoryCombos')
   if len(defaults)!=1:raise RuntimeError('Cannot resolve default category combination')
   de['categoryCombo']={'id':defaults[0]['id']}
 for ds in m.get('dataSets',[]):ds['categoryCombo']={'id':defaults[0]['id']}
 result=c.call('metadata?importMode=VALIDATE&importStrategy=CREATE&atomicMode=ALL',m)
 report={'version':version,'root':root,'assignedUnits':len(ids),'sensitiveIncluded':a.include_sensitive,'dryRun':result,'applied':False}
 Path(a.out).write_text(json.dumps(report,indent=2), encoding="utf-8")
 if has_errors(result):raise RuntimeError('Dry-run failed or warned. Review '+a.out+'; nothing applied.')
 if a.apply:
  result=c.call('metadata?importMode=COMMIT&importStrategy=CREATE&atomicMode=ALL',m);report['commit']=result;report['applied']=not has_errors(result);Path(a.out).write_text(json.dumps(report,indent=2), encoding="utf-8")
  if not report['applied']:raise RuntimeError('Import failed; review report and server transaction status')
 print(json.dumps({'version':version,'units':len(ids),'mode':'APPLIED' if report['applied'] else 'VALIDATED ONLY','report':a.out}))
if __name__=='__main__':
 try:main()
 except (RuntimeError,ValueError,urllib.error.URLError) as e:print(str(e),file=sys.stderr);sys.exit(1)
