#!/usr/bin/env python3
"""Explicit loopback-only synthetic demo. Never deploy this entry point.
Temporary encrypted database and keys disappear when the process exits.
"""
import argparse,http.cookies,json,mimetypes,sys,tempfile,urllib.parse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
import server
from engine import Engine,Fault
from cryptography.fernet import Fernet
ROOT=Path(__file__).resolve().parents[1]
USERS={'MEL':['APSE_MEL'],'STAFF':['APSE_STAFF'],'CPJP':['APSE_CPJP'],'SPECIALIST':['APSE_PARISH_REPORTER'],'COORDINATOR':['APSE_COORDINATION'],'FINANCE':['APSE_FINANCE'],'DIRECTION':['APSE_DIRECTION']}
UNIT={'id':'DemoUnit001','name':'PAROISSE DÉMONSTRATION — données fictives','path':'/DemoRoot001/DemoUnit001'}
def identity(headers):
 c=http.cookies.SimpleCookie();c.load(headers.get('Cookie',''));name=c['apse_demo'].value if 'apse_demo' in c else 'MEL'
 if name not in USERS:raise Fault(401,'invalid_demo_account')
 return dict(id='DEMO_'+name,name='DÉMO '+name,roles=USERS[name],paths=['/DemoRoot001'],units=[UNIT])
def upstream(path,headers):
 if path.startswith('organisationUnits.json'):return {'organisationUnits':[UNIT]}
 if path.startswith('organisationUnits/'+UNIT['id']):return UNIT
 raise Fault(404,'demo_unit_only')
class DemoHandler(server.Handler):
 def do_GET(self):
  p=urllib.parse.urlsplit(self.path)
  if p.path.startswith('/apse-service/'):return super().do_GET()
  if p.path=='/demo/login':
   role=urllib.parse.parse_qs(p.query).get('role',['MEL'])[0]
   if role not in USERS:return self.send(400,{'error':'unknown_demo_role'})
   self.send_response(303);self.send_header('Location','/api/apps/apse/operations.html');self.send_header('Set-Cookie','apse_demo='+role+'; Path=/; HttpOnly; SameSite=Strict');self.send_header('Cache-Control','no-store');self.end_headers();return
  if p.path=='/':
   links=''.join('<li><a href="/demo/login?role='+x+'">'+x+'</a></li>' for x in USERS)
   html='<!doctype html><html lang="fr"><meta charset="utf-8"><title>Démo APSE locale</title><h1>APSE — démonstration locale uniquement</h1><p>Données fictives. Ne saisir aucune donnée personnelle réelle. Base temporaire effacée à l’arrêt.</p><p>Choisir un compte. Pour tester la validation, changer de compte depuis cette page et rouvrir le dossier.</p><ul>'+links+'</ul><p>STAFF prépare ; MEL examine, corrige et valide ; COORDINATOR vérifie ; DIRECTION approuve.</p></html>'
   return self.send(200,html.encode(),'text/html; charset=utf-8')
  prefix='/api/apps/apse/'
  if not p.path.startswith(prefix):return self.send(404,{'error':'not_found'})
  relative=urllib.parse.unquote(p.path[len(prefix):]);base=(ROOT/'app').resolve();f=(base/relative).resolve()
  if f.parent!=base or not f.is_file():return self.send(404,{'error':'not_found'})
  mime={'webapp':'application/json','js':'text/javascript','css':'text/css','html':'text/html'}.get(f.suffix[1:],mimetypes.guess_type(f.name)[0] or 'application/octet-stream');return self.send(200,f.read_bytes(),mime)
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8766);a=parser.parse_args()
 if not 1024<=a.port<=65535:parser.error('Use port 1024–65535')
 server.PUBLIC='http://127.0.0.1:'+str(a.port);server.PREFIX='/apse-service';server.identity=identity;server.upstream=upstream
 with tempfile.TemporaryDirectory(prefix='apse-synthetic-demo-') as folder:
  server.ENGINE=Engine(folder+'/demo.sqlite',Fernet.generate_key(),__import__('secrets').token_bytes(32));httpd=server.ThreadingHTTPServer(('127.0.0.1',a.port),DemoHandler)
  print('DEMO ONLY — synthetic data, temporary database. Open '+server.PUBLIC+'/',flush=True)
  try:httpd.serve_forever()
  except KeyboardInterrupt:pass
  finally:httpd.server_close();server.ENGINE.db.close()
