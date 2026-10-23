"""Build auditable metadata from user-supplied final PS and two planning templates."""
import copy,json,re,hashlib,string
from pathlib import Path
B=Path(__file__).resolve().parents[1];S=json.loads((B/'sources/planning_sources_extracted.json').read_text(encoding="utf-8"));PSNAME=next(k for k,v in S.items()if 'tables'in v);PS=S[PSNAME];CPJPNAME=next(k for k in S if k.startswith('Nshyashya'));ANNAME=next(k for k in S if k.startswith('202609'))
def uid(s):
 n=int.from_bytes(hashlib.sha256(('CDJP-APSE-1:'+s).encode()).digest(),'big');ch=string.ascii_letters+string.digits;return 'A'+''.join(ch[(n//62**i)%62]for i in range(10))
def L(fr,en=None,rw=None,sw=None):return dict(fr=fr,en=en or fr,rw=rw or fr,sw=sw or fr)
c=json.loads((B/'app/config.json').read_text(encoding="utf-8"));m=json.loads((B/'metadata/all.json').read_text(encoding="utf-8"));seed={}
seed['axes']=[dict(code=o['code'],labels=o['label'],active=True,source=PSNAME)for o in c['axes']]
seed['objectives']=[]
for i,row in enumerate(PS['tables'][1]['rows'][1:],1):seed['objectives'].append(dict(code=f'A{i}.OS',axis=f'A{i}',labels=L(row[1]),active=True,source=f'{PSNAME}, tableau 2'))
seed['results']=[]
for row in PS['tables'][16]['rows'][1:]:
 for code,text in re.findall(r'(A\d\.R\d+)\s+(.*?)(?=\nA\d\.R\d+|$)',row[1],re.S):
  old=next(o for o in c['strategicResults']if o['code']==code);labels=copy.deepcopy(old['label']);labels['fr']=' '.join(text.split())
  if code=='A1.R1':labels=L(' '.join(text.split()),'Psychosocial wellbeing, safety and trust in emotional, relational and physical dimensions, and adaptive capacity improve among accompanied people.','Imibereho myiza yo mu mutima, umutekano n’icyizere mu marangamutima, imibanire n’umubiri, hamwe n’ubushobozi bwo kwiyakira by’abaherekejwe birushaho kuba byiza.','Ustawi wa kisaikolojia, usalama na uaminifu katika hisia, mahusiano na hali ya kimwili, pamoja na uwezo wa kuzoea, vinaimarika kwa watu wanaoambatana na huduma.')
  seed['results'].append(dict(code=code,axis=code[:2],labels=labels,active=True,source=f'{PSNAME}, tableau 17'))
seed['interventions']=[]
for row in PS['tables'][16]['rows'][1:]:
 for code,text in re.findall(r'(A\d\.I\d+)\s+(.*?)(?=\nA\d\.I\d+|$)',row[2],re.S):
  old=next(o for o in c['interventions']if o['code']==code);labels=copy.deepcopy(old['label']);labels['fr']=' '.join(text.split());seed['interventions'].append(dict(code=code,axis=code[:2],labels=labels,active=True,source=f'{PSNAME}, tableau 17'))
seed['years']=[]
for i,row in enumerate(PS['tables'][35]['rows'][1:],1):seed['years'].append(dict(code=f'AP{i}',labels=L(f'AP{i} {2025+i}/{2026+i}'),start=f'{2025+i}-09-01',end=f'{2026+i}-08-31',phase=row[2],milestone=row[3],roadmap=PS['tables'][25]['rows'][i][1:],active=True,source=f'{PSNAME}, annexe périodes et feuille de route'))
seed['operational_lines']=[];axis=1
for rownum,row in enumerate(PS['tables'][24]['rows'][1:],2):
 if row[0].startswith('Sous-total'):axis+=1;continue
 if row[0].startswith('Budget total'):continue
 amounts={f'AP{i}':float(str(v).replace(' ',''))for i,v in enumerate(row[1:6],1)}
 seed['operational_lines'].append(dict(code=f'OP-A{axis}-{rownum:02}',axis=f'A{axis}',objective=f'A{axis}.OS',labels=L(row[0]),years=[k for k,v in amounts.items()if v>0],indicativeMillionsRWF=amounts,amountStatus='INDICATIVE_PS_NOT_APPROVED_ANNUAL_BUDGET',intervention=None,interventionCandidates=[f'A{axis}.I{i}'for i in range(1,4)],audiences=['STAFF','CPJP'],active=True,source=f'{PSNAME}, tableau répartition indicative par année, ligne {rownum}',mappingStatus='AXIS_EXPLICIT_INTERVENTION_TO_SELECT'))
seed['annual_tasks']=[];axis=None;iv=None
for row in S[ANNAME]['2026-2027']['rows']:
 cells=row['cells'];a=str(cells.get('A','')).strip();match=re.search(r'Axe\s+(\d)',a)
 if a.startswith('Axe stratégique:')and match:axis='A'+match[1];iv=None
 if re.fullmatch(r'A\d\.I\d',a):iv=a
 if 'D'not in cells or not isinstance(cells.get('C'),(int,float)):continue
 budget=cells.get('G');budget=budget if isinstance(budget,(int,float))else None
 seed['annual_tasks'].append(dict(code=f'PAO-AP1-R{row["row"]:03}',axis=axis,objective=axis+'.OS',intervention=iv,ap='AP1',labels=L(cells['D']),expected=L(str(cells.get('E',''))),indicator=L(str(cells.get('F',''))),budgetRWF=budget,budgetStatus='SOURCE_PLAN_TO_VALIDATE',locations=str(cells.get('H','')),fundingMarks={k:cells.get(k)for k in ['I','J','K']if cells.get(k)},responsibleSource=str(cells.get('L','')),beneficiariesSource=cells.get('M'),sourceNumber=cells['C'],audiences=['STAFF'],active=True,source=f'{ANNAME}, 2026-2027!D{row["row"]}'))
seed['organisation_units']=[]
for row in S[CPJPNAME]['Paroisses']['rows']:
 name=row['cells']['A'];aliases={'Kibirizi':['Kibilizi'],'St. Dominique':['St Dominique'],'Kirarammogo':['Kirarambogo']} .get(name,[])
 seed['organisation_units'].append(dict(code='PAR-'+str(row['row']).zfill(2),kind='CPJP',labels=L(name),aliases=aliases,parent=None,dhis2_uid=None,active=True,status='NAME_IN_CURRENT_TEMPLATE_PARENT_TO_VALIDATE',source=f'{CPJPNAME}, Paroisses!A{row["row"]}'))
seed['administrative_units']=[dict(code='DIST-'+name.upper(),kind='DISTRICT',labels=L(name),parent=None,active=True,status='DISTRICT_NAME_CONFIRMED_CODES_AND_CHILDREN_REQUIRED',source='PS coverage and previous institutional specification')for name in ['Huye','Gisagara','Nyanza','Nyaruguru']]
position_names=[('BISHOP','Évêque diocésain','Diocesan Bishop','Musenyeri wa Diyosezi','Askofu wa dayosisi'),('PASTORAL_COORD','Coordination pastorale d’ensemble','Pastoral coordination','Ihuriro ry’ubutumwa bwa Diyosezi','Uratibu wa kichungaji'),('ECONOME','Économe diocésain','Diocesan bursar','Umunyamari wa Diyosezi','Mweka hazina wa dayosisi'),('COMMISSION','Commission pastorale Justice et Paix','Justice and Peace pastoral commission','Komisiyo y’Ubutabera n’Amahoro','Tume ya kichungaji ya Haki na Amani'),('DIRECTOR','Directeur CDJP','CDJP Director','Umuyobozi wa CDJP','Mkurugenzi wa CDJP'),('COORDINATOR','Coordinateur CDJP','CDJP Coordinator','Umuhuzabikorwa wa CDJP','Mratibu wa CDJP'),('MEL','Chargé APSE MEL et communication','APSE MEL and communication officer','Ushinzwe APSE MEL n’itumanaho','Afisa APSE MEL na mawasiliano'),('FINANCE','Comptable','Accountant','Umubaruramari','Mhasibu'),('TECHNICAL','Assistante technique','Technical adviser','Umujyanama wa tekiniki','Mshauri wa kiufundi'),('DRIVER','Chauffeur','Driver','Umushoferi','Dereva'),('CURE','Curé','Parish priest','Padiri mukuru wa paruwasi','Padri wa parokia'),('CHAPLAIN','Aumônier Justice et Paix','Justice and Peace chaplain','Umuyobozi w’ubutumwa bw’Ubutabera n’Amahoro','Kasisi wa Haki na Amani'),('PRESIDENT','Président du comité','Committee chair','Perezida wa komite','Mwenyekiti wa kamati'),('VICE','Vice président','Vice chair','Visi perezida','Makamu mwenyekiti'),('SECRETARY','Secrétaire','Secretary','Umunyamabanga','Katibu'),('TREASURER','Trésorier','Treasurer','Umubitsi','Mweka hazina'),('ADVISER','Conseiller du comité','Committee adviser','Umujyanama wa komite','Mshauri wa kamati'),('CEA','Chargé de l’écoute active','Active listening officer','Ushinzwe gutega amatwi','Mhusika wa usikilizaji makini'),('MEDIATOR','Médiateur ou médiatrice','Mediator','Umuhuza','Msuluhishi'),('PARALEGAL','Parajuriste','Paralegal','Umufashamyumvire mu mategeko','Msaidizi wa kisheria'),('PEACE','Messager de la paix','Peace messenger','Intumwa y’amahoro','Mjumbe wa amani')]
seed['positions']=[dict(code=code,labels=L(fr,en,rw,sw),active=True,source='PS organigramme and FR_Organigramme CPJP_2025.docx')for code,fr,en,rw,sw in position_names]
seed['settings']=[dict(code='SYSTEM',labels=L('Configuration du système','System settings','Igenamiterere rya sisitemu','Mipangilio ya mfumo'),defaultLanguage='fr',themes=['cdjp','light','dark','contrast'],strictAnnualPlanning=True,aiEnabled=False,active=True)]
# Preserve the earlier HR performance objective separately from strategic objective.
c['fields']['performance_objective']=c['fields'].pop('objective');c['fields']['performance_objective']['key']='performance_objective'
for form in c['forms']:
 if form['code']=='F39':
  form['fields']=['performance_objective' if x=='objective' else x for x in form['fields']];form['required']=['performance_objective' if x=='objective' else x for x in form['required']]
seed['fields']=[dict(code=k,**{key:value for key,value in f.items()if key!='key'},active=True)for k,f in c['fields'].items()]
seed['forms']=[dict(code=f['code'],**{k:v for k,v in f.items()if k!='code'},active=True)for f in c['forms']]
newfields=[('ap','TEXT',L('Année pastorale','Pastoral year','Umwaka wa Kiliziya','Mwaka wa kichungaji')),('plan_type','TEXT',L('Niveau de planification','Planning audience','Urwego rw’igenamigambi','Ngazi ya mipango')),('operation_ref','TEXT',L('Ligne du plan opérationnel de cette année','Operational line for this year','Umurongo wa gahunda y’uyu mwaka','Mstari wa mpango wa mwaka huu')),('plan_ref','TEXT',L('Plan annuel approuvé lié','Linked approved annual plan','Igenamigambi ry’umwaka ryemejwe rihujwe','Mpango wa mwaka ulioidhinishwa unaohusishwa')),('objective','TEXT',L('Objectif stratégique','Strategic objective','Intego y’icyerekezo','Lengo la kimkakati')),('location','TEXT',L('Lieu ou unité d’exécution','Implementation location','Aho igikorwa kibera','Mahali pa utekelezaji')),('district','TEXT',L('District','District','Akarere','Wilaya')),('sector','TEXT',L('Secteur','Sector','Umurenge','Sekta')),('cell','TEXT',L('Cellule','Cell','Akagari','Kata'))]
for key,typ,labels in newfields:
 f=dict(key=key,id=uid('de:strategic_objective' if key=='objective' else 'de:'+key),type=typ,label=labels,options=None);c['fields'][key]=f;seed['fields'].append(dict(code=key,**{k:v for k,v in f.items()if k!='key'},active=True));m['dataElements'].append(dict(id=f['id'],code='APSE_STRATEGIC_OBJECTIVE' if key=='objective' else 'APSE_'+key.upper(),name=labels['en'],shortName=labels['en'][:50],valueType=typ,domainType='TRACKER',aggregationType='NONE',publicAccess='--------',userGroupAccesses=copy.deepcopy(m['dataElements'][0]['userGroupAccesses']),translations=[dict(locale=l,property='NAME',value=t)for l,t in labels.items()if l!='en']))
for f in c['forms']:
 if f['code']in ['F03','F04','F05','F06','F07','F19','F21','F27','F28','F29','F30','F38','F40','F41','F42']:
  prefix=['ap','objective','intervention','plan_ref']
  if f['code']=='F03':prefix=['ap','plan_type','operation_ref','objective','location','district','sector','cell']
  f['fields']=list(dict.fromkeys(['record']+prefix+f['fields']))
  if f['code']=='F03':f['required']=list(dict.fromkeys(f['required']+['ap','operation_ref','plan_type']))
  next(x for x in seed['forms']if x['code']==f['code']).update(f)
  stage=next(x for x in m['programStages']if x['id']==f['stage']);stage['programStageDataElements']=[dict(dataElement={'id':c['fields'][k]['id']},compulsory=k in f['required'],sortOrder=i+1)for i,k in enumerate(f['fields'])]
c['version']='0.3.0';c['defaultLanguage']='fr';c['themes']=['cdjp','light','dark','contrast'];c['calendarDecisions']=[];c['strategy']['finalEvaluation']={'start':'2031-04-01','end':'2031-07-31','source':PSNAME};c['metadataVersion']=1
c['strategicResults']=[dict(code=x['code'],label=x['labels'])for x in seed['results']];c['interventions']=[dict(code=x['code'],label=x['labels'])for x in seed['interventions']];c['objectives']=seed['objectives']
(B/'registers/metadata_seed.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2), encoding="utf-8");(B/'app/config.json').write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8");(B/'metadata/all.json').write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8")
issues=[dict(code='GEOGRAPHY_INCOMPLETE',detail='No complete named CCJP/CEB/sector/cell register in attached files; do not fabricate or infer parents.'),dict(code='PARISH_ALIASES',detail='Kibirizi/Kibilizi; Kirarammogo/Kirarambogo; St. Dominique/St Dominique require institutional alias confirmation.'),dict(code='ANNUAL_TOTAL_FORMULAS',detail='Economat total G73 repeats G64 and G58 and references blank G74; use source line values, not this total.'),dict(code='DUPLICATE_SOURCE_NUMBER',detail='Annual activity numbering includes repeated 7 and omits 5; IDs use source row, not the displayed number.'),dict(code='A3_NO_DETAILED_ANNUAL_ROWS',detail='Economat AP1 template has no filled annual activity rows under A3; strategic operational types remain available, not invented tasks.'),dict(code='TRANSLATION_REVIEW',detail='All metadata support four languages; source-only narrative translations must be completed/validated by MEL or via human-reviewed AI assistance.')]
(B/'docs/SOURCE_ISSUES_V3.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2), encoding="utf-8");print(json.dumps({k:len(v)for k,v in seed.items()},indent=2))
