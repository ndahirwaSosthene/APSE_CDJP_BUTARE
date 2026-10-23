import json,hashlib,string,csv,copy
from pathlib import Path
from strategic_v2 import RESULTS,INTERVENTIONS
B=Path(__file__).resolve().parents[1]
def uid(s):
 n=int.from_bytes(hashlib.sha256(('CDJP-APSE-1:'+s).encode()).digest(),'big');chars=string.ascii_letters+string.digits
 return 'A'+''.join(chars[(n//62**i)%62] for i in range(10))
def labels(en,fr,rw,sw):return dict(en=en,fr=fr,rw=rw,sw=sw)
def tr(v):return [{'locale':l,'property':'NAME','value':t} for l,t in v.items() if l!='en']
c=json.loads((B/'app/config.json').read_text(encoding="utf-8"));m=json.loads((B/'metadata/all.json').read_text(encoding="utf-8"))
# Re-running an extension must not duplicate or overwrite source objects.
if c['version'].startswith('0.2'):raise SystemExit('Already extended; rebuild base first')
newfields=[
('question','LONG_TEXT','Learning question','Question d’apprentissage','Ikibazo cyo kwigiraho','Swali la ujifunzaji'),
('finding','LONG_TEXT','Finding supported by evidence','Constat étayé par les preuves','Icyabonetse gishingiye ku bimenyetso','Matokeo yanayoungwa mkono na ushahidi'),
('lesson','LONG_TEXT','Lesson and conditions of applicability','Leçon et conditions d’application','Isomo n’aho rikoreshwa','Funzo na masharti ya kulitumia'),
('confidence','TEXT','Evidence confidence and limitations','Confiance dans les preuves et limites','Icyizere mu bimenyetso n’imbogamizi','Kiwango cha uhakika wa ushahidi na mipaka'),
('decision','TEXT','Adaptation decision','Décision d’adaptation','Icyemezo cyo guhuza n’ibikenewe','Uamuzi wa marekebisho'),
('linked_record','TEXT','Linked source record UID','UID de la source liée','UID y’inyandiko y’isoko ihujwe','UID ya rekodi ya chanzo iliyounganishwa'),
('lesson_ref','TEXT','Approved lesson record UID','UID de la leçon approuvée','UID y’isomo ryemejwe','UID ya rekodi ya funzo lililoidhinishwa'),
('effect','LONG_TEXT','Verified effect of the adaptation','Effet vérifié de l’adaptation','Ingaruka y’impinduka yagenzuwe','Athari iliyothibitishwa ya marekebisho'),
('adopted','BOOLEAN','Adaptation applied and verified','Adaptation appliquée et vérifiée','Impinduka yashyizwe mu bikorwa ikanagenzurwa','Marekebisho yametekelezwa na kuthibitishwa'),
('hours','NUMBER','Working hours','Heures travaillées','Amasaha y’akazi','Saa za kazi'),
('km_start','NUMBER','Starting odometer km','Compteur départ km','Kilometero ku ntangiriro','Kisoma umbali mwanzoni km'),
('km_end','NUMBER','Ending odometer km','Compteur arrivée km','Kilometero ku musozo','Kisoma umbali mwishoni km'),
('fuel','NUMBER','Fuel litres','Carburant litres','Litiro z’ibicanwa','Lita za mafuta'),
('departure','TEXT','Departure time Africa/Kigali HH:MM','Heure départ Africa/Kigali HH:MM','Isaha yo kugenda Africa/Kigali HH:MM','Saa ya kuondoka Africa/Kigali HH:MM'),
('arrival','TEXT','Return time Africa/Kigali HH:MM','Heure retour Africa/Kigali HH:MM','Isaha yo kugaruka Africa/Kigali HH:MM','Saa ya kurejea Africa/Kigali HH:MM'),
('asset','TEXT','Asset or vehicle code','Code actif ou véhicule','Kode y’umutungo cyangwa imodoka','Msimbo wa mali au gari'),
('balance','NUMBER','Physical balance','Solde physique','Ibisigaye bibaruwe','Salio halisi'),
('movement','TEXT','Movement type IN / OUT / COUNT','Mouvement IN / OUT / COUNT','Ubwoko IN / OUT / COUNT','Aina ya mwendo IN / OUT / COUNT'),
('policy','TEXT','Policy and version reference','Référence politique et version','Kode y’amabwiriza na verisiyo','Rejea ya sera na toleo'),
('expiry','DATE','Renewal / expiry date','Date renouvellement / expiration','Itariki yo kuvugurura / kurangira','Tarehe ya kuhuisha / kuisha'),
('delivery','DATE','Delivery / receipt date','Date livraison / réception','Itariki yo gutanga / kwakira','Tarehe ya kuwasilisha / kupokea'),
('supplier','TEXT','Supplier code','Code fournisseur','Kode y’utanga serivisi','Msimbo wa mtoa huduma'),
('objective','LONG_TEXT','Performance objective','Objectif de performance','Intego y’imikorere','Lengo la utendaji'),
('capacity_gap','LONG_TEXT','Capacity gap and coaching need','Écart de capacité et besoin de coaching','Icyuho mu bushobozi n’ubufasha bukenewe','Pengo la uwezo na hitaji la ushauri'),
('theme','TEXT','Theme / domain','Thème / domaine','Insanganyamatsiko / urwego','Mada / eneo'),
('group_a_n','NUMBER','Group A reached','Groupe A atteint','Itsinda A ryagezweho','Waliofikiwa kundi A'),
('group_a_d','NUMBER','Group A eligible','Groupe A éligible','Itsinda A ryari rigenewe','Wanaostahili kundi A'),
('group_b_n','NUMBER','Group B reached','Groupe B atteint','Itsinda B ryagezweho','Waliofikiwa kundi B'),
('group_b_d','NUMBER','Group B eligible','Groupe B éligible','Itsinda B ryari rigenewe','Wanaostahili kundi B')]
for key,typ,en,fr,rw,sw in newfields:
 f=dict(key=key,id=uid('de:'+key),type=typ,label=labels(en,fr,rw,sw),options=None);c['fields'][key]=f
 m['dataElements'].append(dict(id=f['id'],code='APSE_'+key.upper(),name=en,shortName=en[:50],valueType=typ,domainType='TRACKER',aggregationType='SUM' if typ=='NUMBER' else 'NONE',publicAccess='--------',userGroupAccesses=copy.deepcopy(m['dataElements'][0]['userGroupAccesses']),translations=tr(f['label'])))
newforms=[
('F27',('Learning agenda','Agenda d’apprentissage','Gahunda yo kwigira ku bikorwa','Ajenda ya ujifunzaji'),['axis','result','question','method','owner','due','linked_record'],False,['record','axis','question','owner','due']),
('F28',('After-action review','Revue après action','Isuzuma nyuma y’igikorwa','Mapitio baada ya shughuli'),['axis','activity','linked_record','question','target','outputs','finding','confidence','lesson','decision','action','owner','due'],False,['record','axis','activity','finding','lesson','evidence']),
('F29',('Lesson validation and knowledge','Validation leçon et connaissance','Kwemeza isomo no kubika ubumenyi','Uthibitishaji wa funzo na maarifa'),['axis','result','linked_record','question','finding','lesson','confidence','method','decision','owner','due'],False,['record','axis','linked_record','lesson','evidence']),
('F30',('Adaptation and learning use','Adaptation et utilisation de l’apprentissage','Impinduka no gukoresha isomo','Marekebisho na matumizi ya funzo'),['axis','activity','lesson_ref','decision','action','owner','due','adopted','effect','verification','closed'],False,['record','axis','lesson_ref','decision','action','owner','due']),
('F31',('Timesheet and workload','Feuille de temps et charge','Amasaha y’akazi n’umutwaro','Jedwali la muda na mzigo wa kazi'),['project','activity','owner','hours','outputs','reason'],True,['record','owner','hours']),
('F32',('Leave and staff availability','Congé et disponibilité personnel','Ikiruhuko n’ukuboneka kw’abakozi','Likizo na upatikanaji wa wafanyakazi'),['owner','start','end','reason','action'],True,['record','owner','start','end']),
('F33',('Mission and vehicle log','Mission et carnet véhicule','Ubutumwa n’ikoreshwa ry’imodoka','Safari ya kikazi na daftari la gari'),['activity','owner','asset','start','end','departure','arrival','km_start','km_end','fuel','budget','spent','reason'],False,['record','owner','asset','departure','arrival']),
('F34',('Asset and maintenance','Actif et maintenance','Umutungo no kuwufata neza','Mali na matengenezo'),['asset','title','owner','start','expiry','quantity','unit_cost','spent','action','due'],True,['record','asset','owner']),
('F35',('Stock movement and inventory','Mouvement stock et inventaire','Ibyinjira n’ibisohoka mu bubiko','Mwendo wa bidhaa na hesabu ya stoo'),['asset','movement','quantity','balance','owner','delivery','reason'],True,['record','asset','movement','quantity','owner']),
('F36',('Procurement and delivery monitoring','Suivi achats et livraison','Gukurikirana amasoko no gutanga ibikoresho','Ufuatiliaji wa ununuzi na uwasilishaji'),['project','activity','title','supplier','quantity','unit_cost','budget','spent','due','delivery','policy','reason'],True,['record','title','budget','due']),
('F37',('Contract and compliance obligation','Contrat et obligation de conformité','Amasezerano n’inshingano zo kubahiriza','Mkataba na wajibu wa uzingatiaji'),['partner','title','owner','start','end','expiry','policy','action','due'],True,['record','title','owner','due']),
('F38',('Supervision and capacity development','Supervision et renforcement capacités','Igenzura n’iyubakwa ry’ubushobozi','Usimamizi na ukuzaji wa uwezo'),['axis','activity','owner','capacity_gap','pre','post','lesson','action','due','effect'],False,['record','axis','owner','capacity_gap','action','due']),
('F39',('Staff objectives and performance review','Objectifs et revue performance personnel','Intego n’isuzuma ry’imikorere y’abakozi','Malengo na mapitio ya utendaji wa wafanyakazi'),['owner','objective','indicator','baseline','target','outputs','capacity_gap','action','due','verification'],True,['record','owner','objective','due']),
('F40',('Governance meeting and accountability','Réunion gouvernance et redevabilité','Inama y’imiyoborere no kubazwa inshingano','Mkutano wa utawala na uwajibikaji'),['title','meetings','finding','decision','action','owner','due','lesson_ref'],False,['record','title','decision','action','owner','due']),
('F41',('Inclusion and coverage equity','Inclusion et équité de couverture','Udaheza n’uburinganire bw’abagezweho','Ujumuishi na usawa wa ufikiaji'),['axis','activity','theme','group_a_n','group_a_d','group_b_n','group_b_d','method','finding','action','owner','due'],False,['record','axis','theme','method']),
('F42',('KPI observation and target review','Observation KPI et revue de cible','Agaciro k’igipimo n’isuzuma ry’intego','Uchunguzi wa kiashiria na mapitio ya lengo'),['axis','result','indicator','numerator','denominator','baseline','target','method','finding','owner','verification'],False,['record','indicator','numerator','method','evidence'])]
for code,names,keys,sens,required in newforms:
 keys=list(dict.fromkeys(['record']+keys+['evidence','state']));f=dict(code=code,id=uid('program:'+code),stage=uid('stage:'+code),label=labels(*names),fields=keys,sensitive=sens,required=required);c['forms'].append(f)
 p=copy.deepcopy(next(p for p in m['programs'] if p['code']=='APSE_'+('F19' if sens else 'F07')));p.update(id=f['id'],name=code+' '+names[0],shortName=(code+' '+names[0])[:50],code='APSE_'+code,programStages=[{'id':f['stage']}],translations=tr({l:code+' '+v for l,v in f['label'].items()}));m['programs'].append(p)
 stage=copy.deepcopy(m['programStages'][0]);stage.update(id=f['stage'],name=code+' '+names[0],code='APSE_STAGE_'+code,program={'id':f['id']},programStageDataElements=[dict(dataElement={'id':c['fields'][k]['id']},compulsory=k in required,sortOrder=i+1) for i,k in enumerate(keys)],translations=tr({l:code+' '+v for l,v in f['label'].items()}));m['programStages'].append(stage)
# Result selection becomes a real multilingual controlled vocabulary; authoritative FR kept verbatim.
result_options=[dict(code=code,label=labels(en,fr,rw,sw)) for code,fr,en,rw,sw in RESULTS];c['options']['result']=result_options;c['fields']['result']['options']='result'
osid=uid('optionset:result');optionids=[]
for n,o in enumerate(result_options,1):
 i=uid('option:result'+o['code']);optionids.append({'id':i});m['options'].append(dict(id=i,code=o['code'],name=o['code']+' '+o['label']['en'],optionSet={'id':osid},sortOrder=n,translations=tr({l:o['code']+' '+v for l,v in o['label'].items()})))
m['optionSets'].append(dict(id=osid,name='APSE strategic results PS2026-2031',code='APSE_OS_RESULT',valueType='TEXT',version=1,options=optionids))
next(d for d in m['dataElements'] if d['id']==c['fields']['result']['id'])['optionSet']={'id':osid}
c['strategicResults']=result_options;c['interventions']=[dict(code=code,label={'fr':fr},source='PS table 17; translations pending editorial review') for code,fr in INTERVENTIONS]
c.update(version='0.2.0',service=True,servicePath='/apse-service',learningForms=['F27','F28','F29','F30'],sourcePS='Plan strategique CDJP Butare 2026-2031 12 8 2026 Final(1).docx',indicativeTargets=[{'intervention':'A1.I1','value':80,'unit':'percent','date':'2031-08-31','status':'INDICATIVE_SOURCE_TARGET','source':'PS table 18'}],calendarDecisions=[{'topic':'Final evaluation','ps':'2030, table 21','specification':'April-July 2031','resolution':'Configuration retained as an unresolved governance decision; both dates visible'}])
(B/'app/config.json').write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8");(B/'metadata/all.json').write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8")
(B/'registers/strategic_results.json').write_text(json.dumps(c['strategicResults'],ensure_ascii=False,indent=2), encoding="utf-8")
(B/'registers/strategic_interventions.json').write_text(json.dumps(c['interventions'],ensure_ascii=False,indent=2), encoding="utf-8")
print(f"{len(c['forms'])} forms, {len(c['fields'])} fields, {len(RESULTS)} PS results")
