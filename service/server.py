#!/usr/bin/env python3
"""Loopback-only APSE service behind HTTPS reverse proxy and DHIS2 authentication."""
import base64,json,os,re,secrets,sys,urllib.request,urllib.error,urllib.parse
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from engine import Engine,Fault,CONFIG,FORMS,TODAY
from reports import generate
PREFIX=os.environ.get('APSE_PATH','/apse-service');PUBLIC=os.environ.get('APSE_PUBLIC_ORIGIN','').rstrip('/');DHIS=os.environ.get('DHIS2_URL','').rstrip('/')
ENGINE=None
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
OPENER=urllib.request.build_opener(NoRedirect())
def upstream(path,headers):
 if not DHIS.startswith('https://'):raise Fault(503,'dhis_https_required')
 allowed={k:v for k,v in headers.items() if k.lower()in ['authorization','cookie']}
 req=urllib.request.Request(DHIS+'/api/'+path,headers={**allowed,'Accept':'application/json'})
 try:
  with OPENER.open(req,timeout=15)as r:return json.load(r)
 except urllib.error.HTTPError as e:raise Fault(401 if e.code==401 else 403,'dhis_auth_failed')
 except (urllib.error.URLError,TimeoutError):raise Fault(503,'dhis_unavailable')
def identity(headers):
 if not headers.get('Authorization') and not headers.get('Cookie'):raise Fault(401,'authentication_required')
 me=upstream('me.json?fields=id,displayName,userGroups[name],organisationUnits[id,name,path]',headers)
 roles=[g['name'] for g in me.get('userGroups',[]) if g['name'].startswith('APSE_')];units=me.get('organisationUnits',[])
 if not roles or not units:raise Fault(403,'apse_assignment_required')
 return dict(id=me['id'],name=me.get('displayName',''),roles=roles,paths=[o['path'] for o in units],units=units)
class Handler(BaseHTTPRequestHandler):
 server_version='APSE/0.8'
 def log_message(self,fmt,*args):pass # No request paths, cookies or case codes in access logs.
 def send(self,status,value,mime='application/json',filename=None):
  data=value if isinstance(value,bytes) else json.dumps(value,ensure_ascii=False).encode()
  if (mime.startswith('text/')or mime=='application/json')and'charset='not in mime:mime+='; charset=utf-8'
  self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer')
  if filename:self.send_header('Content-Disposition','attachment; filename="'+filename+'"')
  self.end_headers();self.wfile.write(data)
 def do_GET(self):self.route('GET')
 def do_POST(self):self.route('POST')
 def do_PUT(self):self.route('PUT')
 def do_OPTIONS(self):self.send(405,{'error':'cors_disabled'})
 def route(self,method):
  try:
   parsed=urllib.parse.urlsplit(self.path);path=parsed.path
   if path==PREFIX+'/health':return self.send(200,{'status':'up','version':'0.8.0'})
   if not path.startswith(PREFIX+'/'):raise Fault(404,'not_found')
   if method!='GET':
    # Same-origin JS custom header prevents cross-site form CSRF; no CORS enabled.
    if self.headers.get('X-APSE-Client')!='web':raise Fault(403,'client_header_required')
    if self.headers.get('Origin')!=PUBLIC:raise Fault(403,'origin_denied')
    if not self.headers.get('Content-Type','').startswith('application/json'):raise Fault(415,'json_required')
   user=identity(self.headers);body={};q=urllib.parse.parse_qs(parsed.query)
   if method!='GET':
    try:n=int(self.headers.get('Content-Length',0))
    except ValueError:raise Fault(400,'invalid_length')
    if n<0 or n>15*1024*1024:raise Fault(413,'body_limit')
    try:body=json.loads(self.rfile.read(n))
    except ValueError:raise Fault(400,'invalid_json')
    if not isinstance(body,dict):raise Fault(400,'object_required')
   get=lambda k,default=None:q.get(k,[default])[0]
   if path==PREFIX+'/config' and method=='GET':
    all_units=upstream('organisationUnits.json?fields=id,name,path&paging=false',self.headers).get('organisationUnits',[])
    user['units']=[u for u in all_units if any(u['path']==p or u['path'].startswith(p+'/')for p in user['paths'])]
    c=ENGINE.configuration();c['forms']=[f for f in c['forms'] if any(ENGINE.can(user,dict(form=f['code'],path=p,author=user['id'])) for p in [u['path'] for u in user['units']])];c['identity']=user;c['roles']=user['roles'];return self.send(200,c)
   if path==PREFIX+'/v1/bootstrap' and method=='GET':
    all_units=upstream('organisationUnits.json?fields=id,name,path&paging=false',self.headers).get('organisationUnits',[])
    user['units']=[u for u in all_units if any(u['path']==p or u['path'].startswith(p+'/')for p in user['paths'])]
    return self.send(200,ENGINE.v1_bootstrap(user,get('parish'),get('period'),get('axis')))
   if path==PREFIX+'/v1/tasks' and method=='POST':return self.send(201,ENGINE.v1_create_task(user,body))
   if path==PREFIX+'/v1/logs' and method=='POST':return self.send(201,ENGINE.v1_submit_log(user,body))
   if path==PREFIX+'/v1/review' and method=='POST':return self.send(200,ENGINE.v1_review_log(user,body))
   if path==PREFIX+'/v1/export' and method=='GET':
    data,mime,fname=ENGINE.v1_export(user,get('type','impact_summary'),get('format','csv'),get('preset','natural'),get('language','en'),get('parish'))
    return self.send(200,data,mime,fname)
   if path==PREFIX+'/v1/import' and method=='POST':return self.send(200,ENGINE.v1_import_csv(user,body))
   if path==PREFIX+'/working-drafts'and method=='GET':return self.send(200,{'drafts':ENGINE.draft_listing(user,get('status','ACTIVE'))})
   if path==PREFIX+'/working-drafts'and method=='POST':
    unit=upstream('organisationUnits/'+urllib.parse.quote(body.get('unit',''),safe='')+'?fields=id,path',self.headers)
    return self.send(200,ENGINE.save_working_draft(user,body,unit['id'],unit['path']))
   if path==PREFIX+'/working-drafts/action'and method=='POST':return self.send(200,ENGINE.draft_action(user,body['id'],body['revision'],body['action']))
   if path==PREFIX+'/recycle'and method=='GET':return self.send(200,{'records':ENGINE.recycle_listing(user)})
   if path==PREFIX+'/recycle'and method=='POST':return self.send(200,ENGINE.recycle_record(user,body['record'],body['revision'],body.get('restore')is True,body.get('reason','')))
   if path==PREFIX+'/collections/status' and method=='POST':return self.send(200,ENGINE.set_collection_active(user,body['code'],body['active']))
   if path==PREFIX+'/collections' and method=='POST':return self.send(201,ENGINE.publish_collection(user,body))
   if path==PREFIX+'/edit-permissions' and method=='POST':return self.send(201,ENGINE.grant_edit(user,body['record'],body['grantee'],body['revision'],body.get('hours',24),body.get('reason','')))
   if path==PREFIX+'/edit-permissions/revoke' and method=='POST':return self.send(200,ENGINE.revoke_edit(user,body['id']))
   if path==PREFIX+'/period' and method=='GET':
    from periods import period
    try:return self.send(200,period(get('kind','annual'),get('date',TODAY())))
    except (ValueError,TypeError):raise Fault(422,'invalid_period')
   if path==PREFIX+'/metadata' and method=='GET':return self.send(200,ENGINE.metadata())
   if path==PREFIX+'/metadata' and method=='POST':return self.send(200,ENGINE.put_metadata(user,body['category'],body['entry'],body['version'],body.get('reason','')))
   if path==PREFIX+'/planning' and method=='GET':return self.send(200,ENGINE.planning(user,get('ap','AP1'),get('audience','CPJP')))
   if path==PREFIX+'/staff-performance' and method=='GET':return self.send(200,ENGINE.staff_performance(user,get('start','2026-09-01'),get('end',TODAY()),get('level','F05')))
   if path==PREFIX+'/portfolio' and method=='GET':return self.send(200,ENGINE.portfolio_dashboard(user,get('start','2026-09-01'),get('end',TODAY()),get('project'),get('work_type'),get('partner')))
   if path==PREFIX+'/strategy' and method=='GET':return self.send(200,ENGINE.strategy_dashboard(user,get('start','2026-09-01'),get('end',TODAY()),get('ap'),get('axis'),get('intervention')))
   if path==PREFIX+'/inbox' and method=='GET':return self.send(200,{'feedback':ENGINE.feedback_inbox(user)})
   if path==PREFIX+'/feedback' and method=='GET':return self.send(200,{'feedback':ENGINE.feedback_thread(user,get('record'))})
   if path==PREFIX+'/feedback' and method=='POST':return self.send(201,{'feedback':ENGINE.add_feedback(user,body['record'],body['text'],body['recipient'],body.get('parent'))})
   if path==PREFIX+'/assistant' and method=='POST':return self.send(200,ENGINE.assist(user,body['record'],body['text'],body['task'],body['language']))
   if path in [PREFIX+'/import/preview',PREFIX+'/import/commit'] and method=='POST':
    try:raw=base64.b64decode(body.get('data',''),validate=True)
    except ValueError:raise Fault(422,'invalid_base64_file')
    unit=upstream('organisationUnits/'+urllib.parse.quote(body.get('unit',''),safe='')+'?fields=id,path',self.headers)
    fn=ENGINE.prepare_transfer if path.endswith('/preview') else ENGINE.import_transfer
    return self.send(200,fn(user,body['form'],unit['id'],unit['path'],raw,body['format'],body.get('mapping')))
   if path in [PREFIX+'/export/data',PREFIX+'/export/template'] and method=='GET':
    data,mime=ENGINE.export_transfer(user,get('form'),get('start','2026-09-01'),get('end',TODAY()),get('unit'),get('format','xlsx'),get('sensitive')=='true',get('approved','true')=='true',get('language','fr'),path.endswith('/template'))
    return self.send(200,data,mime,'APSE_'+('template' if path.endswith('/template') else 'data')+'.'+get('format','xlsx'))
   if path==PREFIX+'/records' and method=='POST':
    unit=upstream('organisationUnits/'+urllib.parse.quote(body.get('unit',''),safe='')+'?fields=id,path',self.headers)
    if 'capture_profile'in ENGINE.form_map().get(body['form'],{}).get('fields',[]):body['values']=dict(body['values'],capture_profile='V8')
    return self.send(201,ENGINE.create(user,body['form'],unit['id'],unit['path'],body['event_date'],body['values'],self.headers.get('Idempotency-Key')))
   if path==PREFIX+'/records' and method=='GET':return self.send(200,{'records':ENGINE.listing(user,get('start','2026-09-01'),get('end',TODAY()),get('form'),get('unit'),get('approved')=='true')})
   if path==PREFIX+'/dashboard'and method=='GET':return self.send(200,ENGINE.dashboard(user,get('start','2026-09-01'),get('end',TODAY())))
   match=re.fullmatch(PREFIX+r'/records/([0-9a-f-]+)(?:/(transition|amend|close|evidence))?',path)
   if match:
    i,action=match.groups()
    if method=='GET' and action is None:return self.send(200,ENGINE.get(user,i))
    if method=='PUT' and action is None:return self.send(200,ENGINE.edit(user,i,body['revision'],body['values'],body['event_date']))
    if method=='POST':
     if action=='transition':return self.send(200,ENGINE.transition(user,i,body['revision'],body['target'],body.get('reason','')))
     if action=='amend':return self.send(201,ENGINE.amend(user,i,body.get('reason','')))
     if action=='close':return self.send(200,ENGINE.close_action(user,i,body))
     if action=='evidence':
      try:data=base64.b64decode(body['data'],validate=True)
      except ValueError:raise Fault(400,'invalid_base64')
      return self.send(201,ENGINE.add_evidence(user,i,body['mime'],data))
   match=re.fullmatch(PREFIX+r'/evidence/([0-9a-f-]+)',path)
   if match and method=='GET':
    mime,data=ENGINE.evidence(user,match.group(1));ext={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}[mime];return self.send(200,data,mime,'evidence.'+ext)
   if path==PREFIX+'/alerts'and method=='GET':return self.send(200,{'alerts':ENGINE.alerts(user)})
   match=re.fullmatch(PREFIX+r'/alerts/([0-9a-f-]+)/acknowledge',path)
   if match and method=='POST':return self.send(200,ENGINE.acknowledge_alert(user,match.group(1)))
   if path==PREFIX+'/journey'and method=='GET':
    if not get('case'):raise Fault(400,'case_required')
    rows=ENGINE.listing(user,'1900-01-01','2999-12-31');return self.send(200,{'records':[r for r in rows if r['values'].get('case')==get('case')]})
   if path==PREFIX+'/results-report' and method=='GET':
    from rbm import model
    if get('language','fr') not in ['fr','en','rw','sw']:raise Fault(422,'invalid_report_language')
    rows=ENGINE.results_report_rows(user,get('start','2026-09-01'),get('end',TODAY()),get('unit'));return self.send(200,model(rows,ENGINE.configuration(),get('start','2026-09-01'),get('end',TODAY()),get('language','fr')))
   if path==PREFIX+'/report'and method=='GET':
    lang=get('language','fr');fmt=get('format','docx');code=get('code','R05')
    if lang not in ['rw','en','fr','sw']or fmt not in ['docx','xlsx','csv']:raise Fault(400,'invalid_report_options')
    rows=ENGINE.listing(user,get('start','2026-09-01'),get('end',TODAY()),unit=get('unit'),approved=True)
    if code=='R13':rows=ENGINE.results_report_rows(user,get('start','2026-09-01'),get('end',TODAY()),get('unit'))
    # Reports never expose sensitive case/person/HR data, even to privileged users.
    # Generator includes finance aggregates only and removes all sensitive detail.
    data,mime=generate(rows,code,lang,fmt,get('start'),get('end'),ENGINE.configuration())
    with ENGINE.tx():ENGINE.audit(user,'EXPORT_APPROVED_REPORT',code,{'format':fmt,'count':len(rows),'start':get('start'),'end':get('end')})
    return self.send(200,data,mime,f'APSE_{code}_{lang}.{fmt}')
   if path==PREFIX+'/report/freeze'and method=='POST':
    if body.get('language')not in ['rw','en','fr','sw']or body.get('format')not in ['docx','xlsx','csv']:raise Fault(400,'invalid_report_options')
    unit=upstream('organisationUnits/'+urllib.parse.quote(body['unit'],safe='')+'?fields=id,path',self.headers)
    return self.send(201,ENGINE.freeze_report(user,unit['id'],unit['path'],body['code'],body['language'],body['format'],body['start'],body['end'],body.get('narrative')))
   match=re.fullmatch(PREFIX+r'/snapshots/([0-9a-f-]+)',path)
   if match and method=='GET':
    snapshot=ENGINE.report_snapshot(user,match.group(1));return self.send(200,snapshot['data'],snapshot['mime'],'APSE_frozen_'+snapshot['state']+'.'+snapshot['format'])
   if path==PREFIX+'/audit'and method=='GET':
    if not set(user['roles'])&{'APSE_DIRECTION','APSE_AUDITOR'}:raise Fault(403,'auditor_required')
    return self.send(200,ENGINE.verify_audit())
   raise Fault(404,'not_found')
  except Fault as e:self.send(e.status,{'error':e.code,'details':e.details})
  except (KeyError,TypeError,ValueError):self.send(400,{'error':'invalid_request'})
  except Exception:self.send(500,{'error':'internal_error'})
def main():
 global ENGINE
 if not PUBLIC.startswith('https://')or not DHIS.startswith('https://'):raise SystemExit('Set HTTPS APSE_PUBLIC_ORIGIN and DHIS2_URL')
 db=Path(os.environ.get('APSE_DB','/data/apse.sqlite'));db.parent.mkdir(parents=True,exist_ok=True)
 ENGINE=Engine(str(db),os.environ['APSE_ENCRYPTION_KEY'].encode(),os.environ['APSE_AUDIT_KEY'].encode());ENGINE.verify_audit()
 first=ENGINE.db.execute('SELECT body FROM records LIMIT 1').fetchone()
 if first:ENGINE.dec(first['body'])
 ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('APSE_PORT','8765'))),Handler).serve_forever()
if __name__=='__main__':main()
