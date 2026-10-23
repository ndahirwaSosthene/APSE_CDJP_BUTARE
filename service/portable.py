"""Persistent loopback operation, independent of DHIS2.
No bundled accounts, secrets or production data. Never expose this mode over a LAN.
"""
import argparse,base64,getpass,hashlib,hmac,http.cookies,json,os,re,secrets,sys,time,urllib.parse,webbrowser
from pathlib import Path
from cryptography.fernet import Fernet,InvalidToken
ROOT=Path(__file__).resolve().parents[1]
# Embedded Python uses an isolated _pth; add our own modules explicitly.
sys.path.insert(0,str(ROOT/'service'))
sys.path.insert(0,str(ROOT/'scripts'))

def atomic(path,data):
 tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_bytes(data);os.chmod(tmp,0o600);os.replace(tmp,path)
def derive(password,salt):return base64.urlsafe_b64encode(hashlib.pbkdf2_hmac('sha256',password.encode(),salt,400000))
def unlock(folder,password,create=False):
 folder=Path(folder);folder.mkdir(parents=True,exist_ok=True);os.chmod(folder,0o700);p=folder/'vault.json'
 if not p.exists():
  if not create:raise ValueError('Portable vault not found')
  if any((folder/x).exists()for x in ['apse.sqlite','accounts.enc']):raise ValueError('Incomplete portable copy: restore the original vault.json; no new keys created')
  if len(password)<14:raise ValueError('Master passphrase: 14 characters minimum')
  salt=secrets.token_bytes(16);keys={'encryption':Fernet.generate_key().decode(),'audit':secrets.token_hex(32)};atomic(p,json.dumps({'salt':base64.b64encode(salt).decode(),'token':Fernet(derive(password,salt)).encrypt(json.dumps(keys).encode()).decode()}).encode())
 v=json.loads(p.read_text(encoding="utf-8"))
 try:return json.loads(Fernet(derive(password,base64.b64decode(v['salt']))).decrypt(v['token'].encode()))
 except InvalidToken:raise ValueError('Wrong master passphrase')
class Accounts:
 def __init__(self,folder,key):self.path=Path(folder)/'accounts.enc';self.crypto=Fernet(key.encode());self.users=json.loads(self.crypto.decrypt(self.path.read_bytes()))if self.path.exists()else {}
 def add(self,name,password,roles,paths):
  if not re.fullmatch('[A-Za-z0-9_.-]{3,60}',name)or len(password)<12:raise ValueError('Username: 3–60 letters/numbers/._-; password: at least 12 characters')
  salt=secrets.token_bytes(16);self.users[name]=dict(salt=base64.b64encode(salt).decode(),hash=derive(password,salt).decode(),roles=roles,paths=paths,revision=secrets.token_hex(8),active=True);atomic(self.path,self.crypto.encrypt(json.dumps(self.users).encode()))
 def verify(self,name,password):
  # Fixed-cost derivation also for an unknown username.
  u=self.users.get(name,{});salt=base64.b64decode(u.get('salt','AAAAAAAAAAAAAAAAAAAAAA=='));value=derive(password,salt).decode();return bool(u.get('active')and hmac.compare_digest(value,u.get('hash','')))
def local_units():
 seed=json.loads((ROOT/'registers/metadata_seed.json').read_text(encoding="utf-8"));root='LocalRoot01';units=[dict(id=root,name='CDJP BUTARE · LOCAL',path='/'+root,kind='CDJP')]
 for x in seed['organisation_units']:
  if x.get('kind')!='CPJP':continue
  uid='L'+hashlib.sha256(('LOCAL:'+x['code']).encode()).hexdigest()[:10];units.append(dict(id=uid,name=x['labels']['fr'],path='/'+root+'/'+uid,kind='CPJP',sourceCode=x['code']))
 return units
class LocalSession:
 def __init__(self,accounts,units,instance='LOCAL',no_auth=False):self.instance=instance;self.accounts=accounts;self.units=units;self.sessions={};self.failures={};self.no_auth=no_auth
 def identity(self,headers):
  if self.no_auth:return dict(id=self.instance+':NO_AUTH',name='LOCAL_MEL',roles=['APSE_MEL'],paths=['/LocalRoot01'],units=self.units,mode='LOCAL_PORTABLE')
  from engine import Fault
  cookie=http.cookies.SimpleCookie();cookie.load(headers.get('Cookie',''));token=cookie['apse_local'].value if 'apse_local'in cookie else '';s=self.sessions.get(token);u=self.accounts.users.get(s['name'],{})if s else {}
  if not s or s['expires']<time.time()or not u.get('active')or s['revision']!=u.get('revision'):raise Fault(401,'local_login_required')
  paths=u['paths'];return dict(id=self.instance+':'+s['name'],name=s['name'],roles=u['roles'],paths=paths,units=[x for x in self.units if any(x['path']==p or x['path'].startswith(p+'/')for p in paths)],mode='LOCAL_PORTABLE')
 def login(self,name,password):
  now=time.time();old=self.failures.get(name,[]);old=[x for x in old if now-x<60]
  if len(old)>=5:return None,429
  if not self.accounts.verify(name,password):self.failures[name]=old+[now];return None,401
  self.failures.pop(name,None);token=secrets.token_urlsafe(40);self.sessions[token]=dict(name=name,revision=self.accounts.users[name]['revision'],expires=now+8*3600);return token,200

def main():
 import server
 from engine import Engine,Fault
 # Reuse only static asset delivery; demo authentication and demo accounts are never installed.
 sys.path.insert(0,str(ROOT/'scripts'))
 from demo_offline import DemoHandler
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--data',default=str(ROOT/'portable_data'));parser.add_argument('--port',type=int,default=8766);parser.add_argument('--add-user');parser.add_argument('--manage',action='store_true');parser.add_argument('--roles',default='APSE_CPJP');parser.add_argument('--path',default='/LocalRoot01');parser.add_argument('--stdin-secrets',action='store_true',help=argparse.SUPPRESS);parser.add_argument('--no-browser',action='store_true');parser.add_argument('--no-auth',action='store_true',help='Skip the local login and master passphrase; stores the local encryption key in the data folder');a=parser.parse_args()
 if not 1024<=a.port<=65535:parser.error('Invalid local port')
 def ask(prompt):return sys.stdin.readline().rstrip('\n')if a.stdin_secrets else getpass.getpass(prompt)
 if not a.no_auth and (Path(a.data)/'apse.sqlite').exists() and not (Path(a.data)/'accounts.enc').exists():parser.error('Incomplete portable copy: accounts.enc is missing')
 key_file=Path(a.data)/'no_auth.key'
 new=not(Path(a.data)/'vault.json').exists()
 if a.no_auth:
  if key_file.exists():
   try:keys=json.loads(key_file.read_text(encoding='utf-8'))
   except (OSError,json.JSONDecodeError):parser.error('Invalid no-auth key file: '+str(key_file))
  else:
   keys={'encryption':Fernet.generate_key().decode(),'audit':secrets.token_hex(32)}
   key_file.parent.mkdir(parents=True,exist_ok=True);atomic(key_file,json.dumps(keys).encode())
  accounts=Accounts(a.data,keys['encryption'])
  if not accounts.path.exists():atomic(accounts.path,accounts.crypto.encrypt(b'{}'))
 else:
  master=ask('Nouveau mot de passe principal (14+ caractères): 'if new else 'Mot de passe principal: ')
  if new and not a.stdin_secrets and master!=ask('Confirmer: '):parser.error('Passwords do not match')
  try:keys=unlock(a.data,master,create=new);accounts=Accounts(a.data,keys['encryption'])
  except ValueError as e:parser.error(str(e))
 roles=sorted({x['name']for x in json.loads((ROOT/'metadata/all.json').read_text(encoding="utf-8"))['userGroups']})
 if not a.no_auth and not accounts.users:
  name=sys.stdin.readline().strip()if a.stdin_secrets else input('Identifiant du premier administrateur MEL: ').strip();password=ask('Mot de passe du compte MEL (12+ caractères): ');accounts.add(name,password,['APSE_MEL'],['/LocalRoot01'])
 if a.manage:
  a.add_user=input('Identifiant du compte: ').strip();a.roles=input('Roles (APSE_COORDINATION, APSE_DIRECTION, APSE_CPJP…): ').strip()
  for unit in local_units():print(unit['id']+' · '+unit['name']+' · '+unit['path'])
  a.path=input('Chemin autorisé (copier la ligne de la paroisse ou /LocalRoot01): ').strip()
 if a.add_user:
  selected=a.roles.split(',')
  if set(selected)&{'APSE_CPJP','APSE_PARISH_REPORTER','APSE_CCJP','APSE_CEB'} and a.path=='/LocalRoot01':parser.error('Select the assigned parish path for a parish account')
  if set(selected)-set(roles):parser.error('Unknown roles: '+','.join(set(selected)-set(roles)))
  units=local_units()
  if a.path not in [x['path']for x in units]:parser.error('Unknown path; inspect the local unit list in the application')
  accounts.add(a.add_user,ask('Mot de passe du compte: '),selected,[a.path]);print('Compte enregistré.');return
 units=local_units();sessions=LocalSession(accounts,units,hashlib.sha256(keys['encryption'].encode()).hexdigest()[:12],a.no_auth);server.PUBLIC='http://127.0.0.1:'+str(a.port);server.PREFIX='/apse-service';server.identity=sessions.identity
 def upstream(path,headers):
  if path.startswith('organisationUnits.json'):return {'organisationUnits':units}
  uid=urllib.parse.unquote(path.split('/')[1].split('?')[0])if path.startswith('organisationUnits/')else ''
  unit=next((x for x in units if x['id']==uid),None)
  if not unit:raise Fault(404,'local_unit_not_found')
  return unit
 server.upstream=upstream;server.ENGINE=Engine(str(Path(a.data)/'apse.sqlite'),keys['encryption'].encode(),keys['audit'].encode())
 class Handler(DemoHandler):
  def do_GET(self):
   path=urllib.parse.urlsplit(self.path).path
   if path=='/demo/login':return self.send(404,{'error':'demo_disabled'})
   if path=='/local/backup':
    try:
     user=sessions.identity(self.headers)
     if 'APSE_MEL' not in user['roles']:raise Fault(403,'mel_backup_only')
     from pack_for_flash import archive_bytes
     data=archive_bytes(ROOT)
     with server.ENGINE.tx():server.ENGINE.audit(user,'EXPORT_PORTABLE_BACKUP','LOCAL',{'bytes':len(data)})
     return self.send(200,data,'application/zip','APSE_FLASH.zip')
    except Fault as e:return self.send(e.status,{'error':e.code})
   if path in ['/','/local/login'] and sessions.no_auth:
    self.send_response(303);self.send_header('Location','/api/apps/apse/operations.html');self.end_headers();return
   if path in ['/','/local/login']:
    html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>APSE local</title><link rel="stylesheet" href="/api/apps/apse/style.css"><header>CDJP BUTARE — APSE LOCAL</header><main><section><h1>Connexion / Login / Kwinjira / Ingia</h1><form id="local_login"><label>Identifiant / Username / Konti / Mtumiaji<input id="local_user" autocomplete="username" required maxlength="60"></label><label>Mot de passe / Password / Ijambobanga / Nenosiri<input id="local_password" type="password" autocomplete="current-password" required></label><button>Connexion</button><p id="local_error" role="alert"></p></form></section></main><script src="/api/apps/apse/portable_login.js"></script></html>'
    return self.send(200,html.encode(),'text/html;charset=utf-8')
   if path=='/api/apps/apse/operations.html':
    try:sessions.identity(self.headers)
    except Fault:self.send_response(303);self.send_header('Location','/local/login?collect='+urllib.parse.quote(urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('collect',[''])[0],safe=''));self.end_headers();return
   return super().do_GET()
  def do_POST(self):
   path=urllib.parse.urlsplit(self.path).path
   if path not in ['/local/login','/local/logout']:return super().do_POST()
   if self.headers.get('Origin')!=server.PUBLIC or not self.headers.get('Content-Type','').startswith('application/json'):return self.send(403,{'error':'origin_denied'})
   if path=='/local/logout':
    cookie=http.cookies.SimpleCookie();cookie.load(self.headers.get('Cookie',''));sessions.sessions.pop(cookie['apse_local'].value if 'apse_local'in cookie else '',None);self.send_response(200);self.send_header('Set-Cookie','apse_local=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');self.end_headers();return
   try:
    n=int(self.headers.get('Content-Length','0'))
    if not 0<n<=4096:raise ValueError()
    body=json.loads(self.rfile.read(n));name=body.get('username','');password=body.get('password','')
    if not isinstance(name,str)or not isinstance(password,str)or len(name)>60 or len(password)>1000:raise ValueError()
   except (ValueError,TypeError):return self.send(400,{'error':'invalid_login'})
   token,status=sessions.login(name,password)
   if not token:return self.send(status,{'error':'login_failed'})
   self.send_response(200);self.send_header('Set-Cookie','apse_local='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800');self.send_header('Cache-Control','no-store');self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"ok":true}')
 httpd=server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler);print('APSE LOCAL — '+server.PUBLIC+'/',flush=True)
 if not a.no_browser:webbrowser.open(server.PUBLIC+'/')
 try:httpd.serve_forever()
 except KeyboardInterrupt:pass
 finally:
  httpd.server_close();server.ENGINE.db.execute('PRAGMA wal_checkpoint(TRUNCATE)');server.ENGINE.db.close()
if __name__=='__main__':main()
