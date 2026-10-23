from pathlib import Path
import json,hashlib,string,copy
B=Path(__file__).resolve().parents[1]
def uid(s):
 n=int.from_bytes(hashlib.sha256(('CDJP-APSE-1:'+s).encode()).digest(),'big');ch=string.ascii_letters+string.digits;return 'A'+''.join(ch[(n//62**i)%62]for i in range(10))
def L(fr,en,rw,sw):return dict(fr=fr,en=en,rw=rw,sw=sw)
s=json.loads((B/'registers/metadata_seed.json').read_text(encoding="utf-8"));c=json.loads((B/'app/config.json').read_text(encoding="utf-8"));m=json.loads((B/'metadata/all.json').read_text(encoding="utf-8"))
s['volets']=[dict(code=code,labels=L(*labels),description=L(*description),reportsTo='CPJP_COMMITTEE',active=True,source='User clarification 20.10.2026')for code,labels,description in [
('PARALEGAL',('Parajuristes','Paralegals','Abafasha n’abajyanama mu mategeko','Wasaidizi wa kisheria'),('Assistance et conseil juridiques','Legal assistance and advice','Gufasha no kugira inama mu mategeko','Msaada na ushauri wa kisheria')),
('MEDIATION',('Médiateurs','Mediators','Abahuza','Wasuluhishi'),('Résolution des conflits familiaux et autres conflits affectant la paix et les relations','Resolve family and other conflicts affecting peace and relationships','Gukemura amakimbirane yo mu miryango n’andi abangamira amahoro n’imibanire','Kutatua migogoro ya familia na mingine inayoathiri amani na mahusiano')),
('ACTIVE_LISTENING',('Écoutants actifs','Active listening volunteers','Abahumurizamitima','Wasikilizaji makini'),('Écoute active des personnes qui sollicitent un accompagnement','Active listening for people seeking support','Gutega amatwi neza ababagana','Kusikiliza kwa makini watu wanaotafuta msaada')),
('HEALING_FACILITATION',('Facilitateurs de guérison, unité, réconciliation et résilience','Healing, unity, reconciliation and resilience facilitators','Abafashamyumvire mu isanamitima','Wawezeshaji wa uponyaji, umoja, maridhiano na ustahimilivu'),('Accompagnement du programme de guérison, unité, réconciliation et résilience','Support the healing, unity, reconciliation and resilience programme','Gufasha gahunda y’isanamitima, ubumwe, ubwiyunge n’ubudaheranwa','Kusaidia mpango wa uponyaji, umoja, maridhiano na ustahimilivu'))]]
s['projects']=[];s['partners']=[]
s['cpjp_governance']=[dict(code='CPJP_MODEL',labels=L('Gouvernance paroissiale CPJP','CPJP parish governance','Imiyoborere ya CPJP muri paruwasi','Utawala wa CPJP wa parokia'),committeeSeats=[{'position':p,'count':n}for p,n in [('PRESIDENT',1),('VICE',1),('SECRETARY',1),('TREASURER',1),('ADVISER',2)]],committeeSize=6,chaplain='CHAPLAIN',supervisedBy='CURE',volets=[x['code']for x in s['volets']],reportRoute=['CPJP_COMMITTEE','MEL','COORDINATOR','DIRECTOR'],planningLevels=['CDJP','CPJP'],active=True)]
new=[('output_unit','TEXT',L('Unité du produit mesuré','Measured output unit','Igipimo cy’umusaruro','Kipimo cha pato')),('work_type','TEXT',L('Rattachement de l’activité','Activity classification','Icyiciro cy’igikorwa','Uainishaji wa shughuli')),('volet','TEXT',L('Volet spécifique CPJP','CPJP specialist area','Volet yihariye ya CPJP','Eneo maalumu la CPJP')),('partners','TEXT',L('Codes des partenaires, séparés par virgules','Partner codes, comma separated','Kode z’abafatanyabikorwa zitandukanijwe na virgule','Misimbo ya washirika iliyotenganishwa kwa koma'))]
for key,typ,labels in new:
 f=dict(key=key,id=uid('de:'+key),type=typ,label=labels,options=None);c['fields'][key]=f;s['fields'].append(dict(code=key,**{k:v for k,v in f.items()if k!='key'},active=True));m['dataElements'].append(dict(id=f['id'],code='APSE_'+key.upper(),name=labels['fr'],shortName=labels['fr'][:50],valueType=typ,domainType='TRACKER',aggregationType='NONE',publicAccess='--------',userGroupAccesses=copy.deepcopy(m['dataElements'][0]['userGroupAccesses']),translations=[dict(locale=l,property='NAME',value=t)for l,t in labels.items()if l!='fr']))
for f in c['forms']:
 if f['code'] in ['F09','F10','F11','F12'] or any(k in f['fields']for k in ['project','activity','plan_ref']):
  for key in ['work_type','volet','partners','project']:
   if key not in f['fields']:f['fields'].insert(1,key)
 if f['code'] in ['F03','F07']:
  if 'output_unit' not in f['fields']:f['fields'].append('output_unit')
  for key in ['work_type']:
   if key not in f['required']:f['required'].append(key)
 next(x for x in s['forms']if x['code']==f['code']).update(f)
 stage=next(x for x in m['programStages']if x['id']==f['stage']);stage['programStageDataElements']=[dict(dataElement={'id':c['fields'][k]['id']},compulsory=k in f['required'],sortOrder=i+1)for i,k in enumerate(f['fields'])]
if not any(x['name']=='APSE_PARISH_REPORTER' for x in m['userGroups']):m['userGroups'].append(dict(id=uid('group:APSE_PARISH_REPORTER'),name='APSE_PARISH_REPORTER',code='APSE_PARISH_REPORTER',users=[]))
c['performanceKpis']=json.loads((B/'registers/performance_kpis.json').read_text(encoding="utf-8"))
c['version']='0.4.0';c['workflow']=['DRAFT','SUBMITTED','MEL_VALIDATED','VERIFIED','APPROVED','LOCKED'];c['planningLevels']=['CDJP','CPJP']
for path,data in [('app/config.json',c),('registers/metadata_seed.json',s),('metadata/all.json',m)]: (B/path).write_text(json.dumps(data,ensure_ascii=False,indent=2), encoding="utf-8")

p=B/'app/manifest.webapp';manifest=json.loads(p.read_text(encoding="utf-8"));manifest.update(version='0.4.0',default_locale='fr');p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2), encoding="utf-8")
