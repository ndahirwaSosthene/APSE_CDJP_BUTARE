"""Version 0.8: source-backed metadata, field guidance and capture standards."""
from pathlib import Path
import json,hashlib,copy
B=Path(__file__).resolve().parents[1]
def read(p):return json.loads((B/p).read_text(encoding='utf-8'))
def write(p,x):(B/p).write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
def L(rw,en,fr,sw):return dict(rw=rw,en=en,fr=fr,sw=sw)
def uid(code):return 'Z'+hashlib.sha256(('APSE_V8_'+code).encode()).hexdigest()[:10]
c=read('app/config.json');seed=read('registers/metadata_seed.json');native=read('metadata/all.json')
new={}
def field(k,t,l):new[k]=dict(key=k,id=uid(k),type=t,label=l)
field('program','TEXT',L('Porogaramu','Program','Programme','Programu'))
field('classification_reason','LONG_TEXT',L('Sobanura icyiciro Ibindi','Explain Other classification','Justifier la catégorie Autres','Eleza kundi Nyingine'))
field('capture_profile','TEXT',L('Verisiyo y’ifishi','Capture standard','Version de saisie','Toleo la ukusanyaji'))
field('preparer_mode','TEXT',L('Abateguye iyi nyandiko','Preparation team','Équipe de préparation','Timu iliyoandaa'))
for i in range(1,8):field('preparer_'+str(i),'TEXT',L('Izina ry’uwateguye '+str(i),'Preparer name '+str(i),'Nom du préparateur '+str(i),'Jina la mwandaaji '+str(i)))
for k,l in [('cnv_checked',L('Imvugo itarimo ihohotera yasuzumwe','Nonviolent communication reviewed','Communication non violente vérifiée','Mawasiliano yasiyo na vurugu yamehakikiwa')),('dnh_checked',L('Kutagira uwo bihungabanya byasuzumwe','Do No Harm reviewed','Ne pas nuire vérifié','Kutodhuru kumehakikiwa')),('trauma_checked',L('Kwirinda gukomeretsa / guhungabanya byasuzumwe','Trauma sensitivity reviewed','Sensibilité aux traumatismes vérifiée','Uzingatiaji wa kiwewe umehakikiwa'))]:field(k,'BOOLEAN',l)
field('sensitivity_notes','LONG_TEXT',L('Uko uburinganire, ubumuga n’ubushumba byitaweho','Gender, disability and pastoral considerations','Mesures de genre, handicap et pastorale','Hatua za jinsia, ulemavu na uchungaji'))
field('reporter_level','TEXT',L('Urwego rutanga raporo','Reporting level','Niveau rapporteur','Ngazi inayoripoti'))
field('in_kind','NUMBER',L('Agaciro k’ubwitange (RWF)','In-kind contribution value (RWF)','Valorisation du bénévolat (RWF)','Thamani ya mchango usio wa fedha (RWF)'))
field('session','TEXT',L('Igice cy’umunsi','Time of day','Période de la journée','Kipindi cha siku'))
field('realised','LONG_TEXT',L('Ibyakozwe','Work completed','Réalisé','Yaliyotekelezwa'))
field('observations','LONG_TEXT',L('Ibyagaragaye','Observations','Observations','Maoni'))
field('next_steps','LONG_TEXT',L('Intambwe zikurikira','Next steps','Étapes suivantes','Hatua zinazofuata'))
field('ccjp','TEXT',L('Santarali (CCJP)','Centrale (CCJP)','Centrale (CCJP)','Kigango (CCJP)'))
# Preserve all native identifiers and existing codes.
c['fields'].update(new)
if not any(f['code']=='F43' for f in c['forms']):
 f=copy.deepcopy(next(x for x in c['forms']if x['code']=='F04'));f.update(code='F43',id=uid('F43'),label=L('Igenamigambi rya CDJP ry’ukwezi','CDJP monthly planning','Planification mensuelle CDJP','Mpango wa mwezi wa CDJP'),required=['record','title','start','end','owner']);c['forms'].append(f)
common=['ap','capture_profile','preparer_mode']+['preparer_'+str(i)for i in range(1,8)]+['cnv_checked','dnh_checked','trauma_checked','sensitivity_notes','reporter_level']
for f in c['forms']:
 f['fields']=list(dict.fromkeys(f['fields']+common))
 if 'work_type' in f['fields']:f['fields']=list(dict.fromkeys(f['fields']+['program','classification_reason']))
 if f['code']in ['F03','F04','F05','F07','F43']:f['fields']=list(dict.fromkeys(f['fields']+['district','sector','cell','ccjp']))
 if f['code']in ['F03','F04','F05','F43']:f['fields']=list(dict.fromkeys(f['fields']+['total','women','men','undisclosed','disability','result']))
 if f['code']=='F43':f['fields']=list(dict.fromkeys(f['fields']+['change','indicator','location','local','secured']))
 if f['code']=='F03':f['fields']=list(dict.fromkeys(f['fields']+['in_kind']))
 if f['code']=='F05':f['fields']=list(dict.fromkeys(f['fields']+['axis','result','location','session','realised','observations','next_steps']))
 if 'total'in f['fields']:f['fields']=list(dict.fromkeys(f['fields']+['women','men','undisclosed','disability']))
 f['captureStandard']='V8';f['defaultLanguage']='rw' if f['code']not in ['F04','F05','F43']else'fr'
# Guidance does not rewrite or translate record bodies.
type_help={
 'TEXT':L('Andika amakuru ajyanye n’uyu mwanya. Ntushyiremo amakuru y’ibanga y’umuntu mu nyandiko isangizwa benshi.','Enter the information named by this field. Do not include private case identities in shared records.','Renseigner l’information indiquée. Ne pas inclure d’identités de dossiers confidentiels dans un document partagé.','Jaza taarifa inayotajwa hapa. Usiweke utambulisho wa kesi za siri katika rekodi inayoshirikiwa.'),
 'LONG_TEXT':L('Sobanura uko ibintu bimeze, uko byagenzuwe n’isoko ry’amakuru; tandukanya ukuri n’igitekerezo.','Describe the situation, verification and source; distinguish facts from interpretation.','Décrire la situation, la vérification et la source ; distinguer faits et interprétation.','Eleza hali, uhakiki na chanzo; tenganisha ukweli na tafsiri.'),
 'DATE':L('Hitamo itariki kuri kalendari. Itariki ibikwa nka YYYY-MM-DD mu ndimi zose.','Choose a calendar date. Storage remains YYYY-MM-DD in every language.','Choisir une date dans le calendrier. Le stockage reste YYYY-MM-DD dans toutes les langues.','Chagua tarehe kwenye kalenda. Huhifadhiwa kama YYYY-MM-DD katika lugha zote.'),
 'BOOLEAN':L('Hitamo Yego cyangwa Oya ukurikije ibyagenzuwe, ntukemeze ibitarasuzumwa.','Select Yes or No based on what was checked; do not attest to an unchecked item.','Choisir Oui ou Non selon la vérification réalisée ; ne pas attester un élément non examiné.','Chagua Ndiyo au Hapana kulingana na uhakiki; usithibitishe jambo lisilohakikiwa.'),
 'NUMBER':L('Andika umubare gusa, nta nyuguti cyangwa ikimenyetso cy’ifaranga. Nta makuru si zero.','Enter a number without currency symbols or words. Missing evidence is not zero.','Saisir un nombre sans symbole monétaire ni texte. Une donnée absente ne vaut pas zéro.','Weka namba bila alama ya fedha au maneno. Data inayokosekana si sifuri.')}
for k,v in c['fields'].items():v['help']=dict(type_help.get(v['type'],type_help['NUMBER']))
guides={
 'need':L('Vuga ikibazo gifatika; urugero amakimbirane y’ingo atamenyekana kare.','State a concrete problem, such as household disputes not identified early.','Décrire un problème concret, par exemple les conflits familiaux détectés tardivement.','Eleza tatizo halisi, kwa mfano migogoro ya familia isiyotambuliwa mapema.'),
 'change':L('Vuga impinduka yifuzwa kandi uyihuze n’igisubizo cya PS; igikorwa cyonyine si impinduka.','Describe the intended change and link it to a PS result; an activity alone is not an outcome.','Décrire le changement visé et son résultat du PS ; une activité seule ne constitue pas un effet.','Eleza mabadiliko yanayolengwa na matokeo ya PS; shughuli pekee si athari.'),
 'activity':L('Umurongo umwe ni igikorwa kimwe gifatika gihuye na PS n’umwaka wahisemo.','One record represents one concrete activity aligned with the selected PS year.','Un dossier représente une activité concrète alignée sur l’année choisie du PS.','Rekodi moja ni shughuli moja halisi inayolingana na mwaka wa PS uliochaguliwa.'),
 'baseline_text':L('Andika uko bihagaze ubu n’isoko. Nta mibare? Andika ko amakuru fatizo azakusanywa; ntuyihimbe.','State the baseline and source. If unknown, state that baseline data will be collected; do not invent it.','Indiquer la situation de référence et sa source. Si inconnue, prévoir sa collecte sans inventer de chiffres.','Eleza hali ya mwanzo na chanzo. Ikiwa haijulikani, panga ukusanyaji wake bila kubuni takwimu.'),
 'target_text':L('Vuga intego y’uyu mwaka, igihe izagererwaho n’ikimenyetso cyo kuyigenzura.','State this year’s target, deadline and verification evidence.','Préciser la cible annuelle, son échéance et sa preuve de vérification.','Taja lengo la mwaka, muda na ushahidi wa kulihakiki.'),
 'budget':L('Amafaranga azishyurwa koko (RWF). Ingano × igiciro × inshuro. Ntubare ubwitange cyangwa inkunga itaremezwa nk’amafaranga yabonetse.','Actual cash budget in RWF: quantity × unit cost × frequency. Keep in-kind and unconfirmed funding separate.','Budget décaissé en RWF : quantité × coût unitaire × fréquence. Séparer bénévolat et financements non confirmés.','Bajeti ya fedha taslimu kwa RWF: kiasi × gharama × marudio. Tenganisha michango isiyo ya fedha na ufadhili usiothibitishwa.'),
 'in_kind':L('Agaciro k’umwanya, ibikoresho na serivisi bitangwa ku buntu. Ntukongere iri gaciro ku mafaranga asohoka.','Value free time, materials and services separately from cash expenditure.','Valoriser temps, biens et services gratuits séparément des dépenses décaissées.','Kadiria muda, vifaa na huduma za bure kando na matumizi ya fedha.'),
 'location':L('Sobanura ahabera igikorwa: paruwasi, santarali, CEB cyangwa umudugudu.','Specify the parish, centrale, CEB or village where work occurs.','Préciser paroisse, centrale, CEB ou village du lieu d’activité.','Taja parokia, kigango, CEB au kijiji cha shughuli.'),
 'owner':L('Andika umuntu cyangwa itsinda ribishinzwe n’uruhare rwaryo.','Name the responsible person or team and their role.','Nommer la personne ou l’équipe responsable et sa fonction.','Taja mtu au timu inayowajibika na jukumu lake.'),
 'sensitivity_notes':L('Sobanura uko abagore n’abagabo, abafite ubumuga n’ubushumba byitaweho; vuga uburyo bwo kutagira uwo uheza cyangwa uhungabanya.','Explain gender inclusion, disability access and pastoral relevance; describe measures against exclusion or retraumatization.','Expliquer inclusion de genre, accessibilité du handicap et pertinence pastorale ; prévenir exclusion et retraumatisation.','Eleza ushirikishwaji wa jinsia, ufikivu kwa wenye ulemavu na umuhimu wa kichungaji; zuia ubaguzi na kuamsha kiwewe.')}
for k,v in guides.items():c['fields'][k]['help']=v
for key in ['target','start','end','baseline','beneficiary_target']:
 if key in c['fields']:c['fields'][key]['help']=guides.get({'baseline':'baseline_text','target':'target_text','beneficiary_target':'target_text'}.get(key),c['fields'][key]['help'])
geo=read('registers/geography.json');seed['geography_units']=[]
for group,kind in [('districts','DISTRICT'),('sectors','SECTOR'),('cells','CELL')]:
 for x in geo[group]:seed['geography_units'].append(dict(code=x['code'],kind=kind,parent=x['parent'],labels={l:x['name']for l in ['fr','en','rw','sw']},active=True,source=geo['source'],sourceUrl=geo['sourceUrl']))
seed['ccjp_units']=read('registers/ccjp_register.json')
seed['fields']=[dict(v,code=k)for k,v in c['fields'].items()];seed['forms']=copy.deepcopy(c['forms']);seed.setdefault('programs',[])
for setting in seed['settings']:
 if 'soft'not in setting.get('themes',[]):setting['themes'].append('soft')
c['version']='0.8.0';c['capturePolicy']={'profile':'V8','cpjpPlanning':['F03'],'cdjpPlanning':['F03','F04','F05','F43'],'autosaveSeconds':2,'sourceLanguageStored':True};c['planningLayouts']={'CPJP':['need','change','activity','baseline_text','target_text','budget','in_kind','location','owner','start','end'],'F05':['start','end','owner','session','location','activity','realised','observations','next_steps'],'F43':['start','end','activity','change','indicator','location','budget','local','secured','owner']}
# New native elements are exported as metadata, retaining all old UIDs.
existing={x['id']for x in native['dataElements']}
for k,v in new.items():
 if v['id']not in existing:native['dataElements'].append(dict(id=v['id'],name='APSE '+k,shortName=('APSE '+k)[:50],code='APSE_'+k.upper(),domainType='TRACKER',valueType=v['type'],aggregationType='NONE',publicAccess='--------'))
if not any(x.get('code')=='APSE_F43' for x in native['programs']):
 p=copy.deepcopy(next(x for x in native['programs']if x.get('code')=='APSE_F04'));p.update(id=uid('F43'),code='APSE_F43',name='APSE Planification mensuelle CDJP',shortName='APSE Plan mensuel');p['programStages']=[dict(id=uid('stage_F43'))];native['programs'].append(p)
 stage=copy.deepcopy(next(x for x in native['programStages']if x['program']['id']==next(x for x in native['programs']if x.get('code')=='APSE_F04')['id']));stage.update(id=uid('stage_F43'),name='APSE F43 mensuel',program=dict(id=uid('F43')));native['programStages'].append(stage)
for f in c['forms']:
 p=next((x for x in native['programs']if x.get('code')=='APSE_'+f['code']),None)
 if not p:continue
 stage=next(x for x in native['programStages']if x['program']['id']==p['id']);old={x['dataElement']['id']for x in stage['programStageDataElements']}
 for k in f['fields']:
  if c['fields'][k]['id']not in old:stage['programStageDataElements'].append(dict(dataElement=dict(id=c['fields'][k]['id']),compulsory=False,sortOrder=len(stage['programStageDataElements'])+1));old.add(c['fields'][k]['id'])
write('app/config.json',c);write('registers/metadata_seed.json',seed);write('metadata/all.json',native)
m=read('app/manifest.webapp');m['version']='0.8.0';write('app/manifest.webapp',m)

# Refresh new native translations and enforce CDJP-only access for subannual plans.
for f in c['forms']:
 p=next((x for x in native['programs']if x.get('code')=='APSE_'+f['code']),None)
 if not p:continue
 if f['code']=='F43':
  p['translations']=[dict(locale=l,property='NAME',value='F43 '+f['label'][l])for l in ['fr','rw','en','sw']]
  stage=next(x for x in native['programStages']if x['program']['id']==p['id']);stage['code']='APSE_STAGE_F43';stage['translations']=copy.deepcopy(p['translations'])
 if f['code']in ['F04','F05','F43']:
  central={g['id']for g in native['userGroups']if g['name']in ['APSE_MEL','APSE_STAFF','APSE_COORDINATION','APSE_DIRECTION','APSE_FINANCE','APSE_HR']}
  p['userGroupAccesses']=[g for g in p.get('userGroupAccesses',[])if g['id']in central]
for de in native['dataElements']:
 field=next((v for v in c['fields'].values()if v['id']==de['id']),None)
 if field and de['id'].startswith('Z'):
  de['translations']=[dict(locale=l,property='NAME',value=field['label'][l])for l in ['fr','rw','en','sw']]
  de['description']=field['help']['fr']
write('metadata/all.json',native)

state_labels=L('Isuzumwa na Komite CPJP','CPJP committee review','Revue du comité CPJP','Uhakiki wa kamati ya CPJP')
if not any(o['code']=='CPJP_REVIEW'for o in c['options']['state']):c['options']['state'].append(dict(code='CPJP_REVIEW',label=state_labels))
if not any(o['code']=='CPJP_REVIEW'for o in native['options']):
 original=next(o for o in native['options']if o['code']=='SUBMITTED');option=copy.deepcopy(original);option.update(id=uid('OPTION_CPJP_REVIEW'),name=state_labels['fr'],code='CPJP_REVIEW',sortOrder=8,translations=[dict(locale=l,property='NAME',value=state_labels[l])for l in ['fr','en','rw','sw']]);native['options'].append(option)
c['expectedUnits']['ceb']=None;c['expectedUnits']['reportedCebCountFromScan']=2961;c['expectedUnits']['cebCountValidated']=False
c['planningLevels']={'CPJP':['F03'],'CDJP':['F03','F04','F05','F43']}
write('app/config.json',c);write('metadata/all.json',native)
