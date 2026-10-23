#!/usr/bin/env python3
"""Deterministic DHIS2 metadata + four-language APSE app configuration."""
import json,hashlib,csv,string
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
def uid(s):
 n=int.from_bytes(hashlib.sha256(('CDJP-APSE-1:'+s).encode()).digest(),'big'); chars=string.ascii_letters+string.digits
 return 'A'+''.join(chars[(n//(62**i))%62] for i in range(10))
def label(en,fr,rw,sw):return dict(en=en,fr=fr,rw=rw,sw=sw)
def tr(v):return [{'locale':k,'property':'NAME','value':x} for k,x in v.items() if k!='en']
F={}
def field(key,typ,en,fr,rw,sw,options=None):
 F[key]=dict(key=key,id=uid('de:'+key),type=typ,label=label(en,fr,rw,sw),options=options)
# Shared fields; no personal names or identifying narratives in operational forms.
rows=[
('record','TEXT','Record code','Code du dossier','Kode y’inyandiko','Msimbo wa rekodi'),
('axis','TEXT','Strategic programme','Programme stratégique','Gahunda y’icyerekezo','Mpango wa kimkakati'),
('result','TEXT','Result code','Code du résultat','Kode y’umusaruro','Msimbo wa matokeo'),
('intervention','TEXT','Intervention code','Code de l’intervention','Kode y’uburyo bwo kugera ku musaruro','Msimbo wa afua'),
('project','TEXT','Project code','Code du projet','Kode y’umushinga','Msimbo wa mradi'),
('activity','TEXT','Planned activity code','Code activité planifiée','Kode y’igikorwa cyateganyijwe','Msimbo wa shughuli iliyopangwa'),
('title','TEXT','Title','Intitulé','Umutwe','Kichwa'),
('need','LONG_TEXT','Need and evidence','Besoin et preuve','Ikibazo n’ibimenyetso','Hitaji na ushahidi'),
('change','LONG_TEXT','Expected change','Changement recherché','Impinduka yifuzwa','Mabadiliko yanayotarajiwa'),
('baseline','NUMBER','Baseline value','Valeur initiale','Agaciro fatizo','Thamani ya mwanzo'),
('target','NUMBER','Validated target','Cible validée','Intego yemejwe','Lengo lililoidhinishwa'),
('indicator','TEXT','Indicator code','Code indicateur','Kode y’igipimo','Msimbo wa kiashiria'),
('start','DATE','Start date','Date de début','Itariki yo gutangira','Tarehe ya kuanza'),
('end','DATE','End date','Date de fin','Itariki yo kurangiza','Tarehe ya kumaliza'),
('due','DATE','Due date','Échéance','Itariki ntarengwa','Tarehe ya mwisho'),
('owner','TEXT','Responsible role or account ID','Poste responsable ou identifiant compte','Umwanya ubishinzwe cyangwa kode ya konti','Wadhifa au kitambulisho cha akaunti inayohusika'),
('reason','LONG_TEXT','Reason / explanation without identities','Motif / explication sans identité','Impamvu / ibisobanuro bitarimo amazina','Sababu / maelezo bila utambulisho'),
('evidence','TEXT','Restricted evidence reference','Référence de preuve à accès contrôlé','Kode y’ikimenyetso kirinzwe','Rejea ya ushahidi wenye udhibiti wa ufikiaji'),
('source','TEXT','Funding source code','Code source de financement','Kode y’inkomoko y’amafaranga','Msimbo wa chanzo cha fedha'),
('budget','NUMBER','Approved cash budget RWF','Budget cash approuvé RWF','Ingengo y’imari yemejwe RWF','Bajeti ya fedha iliyoidhinishwa RWF'),
('planned_cost','NUMBER','Planned cost to date RWF','Coût prévu à date RWF','Amafaranga yari ateganyijwe kugeza ubu RWF','Gharama zilizopangwa hadi sasa RWF'),
('spent','NUMBER','Eligible expenditure RWF','Dépense éligible RWF','Amafaranga yakoreshejwe yemewe RWF','Matumizi yanayokubalika RWF'),
('committed','NUMBER','Commitments RWF','Engagements RWF','Amafaranga yategetswe kwishyurwa RWF','Ahadi za malipo RWF'),
('local','NUMBER','Valued local contribution RWF','Contribution locale valorisée RWF','Agaciro k’umusanzu w’abaturage RWF','Thamani ya mchango wa jamii RWF'),
('secured','NUMBER','Secured funding RWF','Financement acquis RWF','Inkunga yamaze kuboneka RWF','Fedha zilizopatikana RWF'),
('quantity','NUMBER','Quantity','Quantité','Ingano','Kiasi'),
('unit_cost','NUMBER','Unit cost RWF','Coût unitaire RWF','Igiciro kuri kimwe RWF','Gharama kwa kipimo RWF'),
('total','INTEGER_ZERO_OR_POSITIVE','Total attendances','Total participations','Inshuro zose z’ubwitabire','Jumla ya mahudhurio'),
('women','INTEGER_ZERO_OR_POSITIVE','Female attendances','Participations féminines','Ubwitabire bw’abagore','Mahudhurio ya wanawake'),
('men','INTEGER_ZERO_OR_POSITIVE','Male attendances','Participations masculines','Ubwitabire bw’abagabo','Mahudhurio ya wanaume'),
('undisclosed','INTEGER_ZERO_OR_POSITIVE','Unspecified sex','Sexe non renseigné','Igitsina kitavuzwe','Jinsia isiyotajwa'),
('unique','INTEGER_ZERO_OR_POSITIVE','Unique people (deduplicated)','Personnes uniques dédoublonnées','Abantu batabazwe kabiri','Watu wa kipekee bila kurudiwa'),
('disability','INTEGER_ZERO_OR_POSITIVE','Attendances with disability (voluntary disclosure)','Participations avec handicap déclaré volontairement','Ubwitabire bw’abafite ubumuga babyivugiye','Mahudhurio ya watu wenye ulemavu waliotaja kwa hiari'),
('age_u18','INTEGER_ZERO_OR_POSITIVE','Age under 18','Âge moins de 18 ans','Abatarengeje imyaka 17','Umri chini ya miaka 18'),
('age_18_24','INTEGER_ZERO_OR_POSITIVE','Age 18–24','Âge 18–24 ans','Imyaka 18–24','Umri miaka 18–24'),
('age_25_34','INTEGER_ZERO_OR_POSITIVE','Age 25–34','Âge 25–34 ans','Imyaka 25–34','Umri miaka 25–34'),
('age_35_49','INTEGER_ZERO_OR_POSITIVE','Age 35–49','Âge 35–49 ans','Imyaka 35–49','Umri miaka 35–49'),
('age_50_64','INTEGER_ZERO_OR_POSITIVE','Age 50–64','Âge 50–64 ans','Imyaka 50–64','Umri miaka 50–64'),
('age_65','INTEGER_ZERO_OR_POSITIVE','Age 65 and above','Âge 65 ans et plus','Imyaka 65 no hejuru','Umri miaka 65 na zaidi'),
('age_unknown','INTEGER_ZERO_OR_POSITIVE','Age not stated','Âge non renseigné','Imyaka itavuzwe','Umri usiotajwa'),
('outputs','INTEGER_ZERO_OR_POSITIVE','Verified outputs','Produits vérifiés','Ibyagezweho byagenzuwe','Matokeo yaliyothibitishwa'),
('outcome','LONG_TEXT','Observed change and evidence','Changement observé et preuve','Impinduka yabonetse n’ikimenyetso','Mabadiliko yaliyoonekana na ushahidi'),
('risk','LONG_TEXT','Risk and mitigation without identities','Risque et mesure sans identité','Ibyago n’uburyo bwo kubikumira nta mazina','Hatari na hatua za kupunguza bila utambulisho'),
('severity','INTEGER_POSITIVE','Severity 1–4','Gravité 1–4','Uburemere 1–4','Ukali 1–4'),
('probability','INTEGER_POSITIVE','Likelihood 1–4','Probabilité 1–4','Amahirwe yo kubaho 1–4','Uwezekano 1–4'),
('action','LONG_TEXT','Follow-up action','Action de suivi','Igikorwa cyo gukurikirana','Hatua ya ufuatiliaji'),
('case','TEXT','Pseudonymous case code','Code cas pseudonymisé','Kode y’ikibazo itagaragaza umuntu','Msimbo wa shauri usiotambulisha mtu'),
('person','TEXT','Pseudonymous person code','Code personne pseudonymisé','Kode y’umuntu itagaragaza umwirondoro','Msimbo wa mtu usioonyesha utambulisho'),
('group','TEXT','Group code','Code du groupe','Kode y’itsinda','Msimbo wa kikundi'),
('service','TEXT','Service code','Code du service','Kode ya serivisi','Msimbo wa huduma'),
('consent','BOOLEAN','Consent / documented lawful basis confirmed','Consentement / base documentée confirmée','Ukwemera / ishingiro ryemewe byemejwe','Ridhaa / msingi halali uliorekodiwa umethibitishwa'),
('media_consent','BOOLEAN','Specific media consent confirmed','Consentement média spécifique confirmé','Ukwemera kwihariye ko gutangaza byemejwe','Ridhaa maalumu ya vyombo vya habari imethibitishwa'),
('accessed','BOOLEAN','Service access confirmed','Accès au service confirmé','Kubona serivisi byemejwe','Upatikanaji wa huduma umethibitishwa'),
('followup6','BOOLEAN','Agreement applied at 6 months','Accord appliqué à 6 mois','Amasezerano yubahirijwe nyuma y’amezi 6','Makubaliano yanatekelezwa baada ya miezi 6'),
('followup12','BOOLEAN','Agreement applied at 12 months','Accord appliqué à 12 mois','Amasezerano yubahirijwe nyuma y’amezi 12','Makubaliano yanatekelezwa baada ya miezi 12'),
('recurrence','BOOLEAN','Conflict recurrence','Récurrence du conflit','Kongera kubaho kw’amakimbirane','Kujirudia kwa mgogoro'),
('pre','NUMBER','Pre-measure score','Score avant','Amanota mbere','Alama kabla'),
('post','NUMBER','Post-measure score','Score après','Amanota nyuma','Alama baada'),
('threshold','NUMBER','Approved change threshold','Seuil de changement validé','Urugero rw’impinduka rwemejwe','Kiwango kilichoidhinishwa cha mabadiliko'),
('step','TEXT','Journey step','Étape du parcours','Icyiciro cy’urugendo','Hatua ya mchakato'),
('release','DATE','Release date (only if necessary)','Date de libération si nécessaire','Itariki yo gufungurwa niba ikenewe','Tarehe ya kuachiliwa ikiwa inahitajika'),
('standard','BOOLEAN','Approved standard met','Standard validé respecté','Igipimo cyemejwe cyujujwe','Kiwango kilichoidhinishwa kimefikiwa'),
('assessed','INTEGER_ZERO_OR_POSITIVE','Units assessed','Unités évaluées','Inzego zasuzumwe','Vitengo vilivyotathminiwa'),
('compliant','INTEGER_ZERO_OR_POSITIVE','Units meeting standard','Unités conformes','Inzego zujuje igipimo','Vitengo vilivyofikia kiwango'),
('volunteers','INTEGER_ZERO_OR_POSITIVE','Assigned volunteers','Bénévoles affectés','Abakorerabushake bashinzwe imirimo','Wajitolea waliopangiwa kazi'),
('active','INTEGER_ZERO_OR_POSITIVE','Active volunteers','Bénévoles actifs','Abakorerabushake bakoze','Wajitolea wanaoshiriki kikamilifu'),
('meetings','INTEGER_ZERO_OR_POSITIVE','Meetings held','Réunions tenues','Inama zabaye','Mikutano iliyofanyika'),
('partner','TEXT','Partner code','Code partenaire','Kode y’umufatanyabikorwa','Msimbo wa mshirika'),
('request','LONG_TEXT','Advocacy request without identities','Demande de plaidoyer sans identité','Icyifuzo cy’ubuvugizi nta mazina','Ombi la utetezi bila utambulisho'),
('response','LONG_TEXT','Response and verified contribution','Réponse et contribution vérifiée','Igisubizo n’uruhare rwemejwe','Jibu na mchango uliothibitishwa'),
('url','TEXT','Public publication URL (no private documents)','URL publication publique sans pièce privée','Urubuga rw’inyandiko rusange nta nyandiko y’ibanga','Anwani ya chapisho la umma bila nyaraka binafsi'),
('reach','INTEGER_ZERO_OR_POSITIVE','Verified reach','Portée vérifiée','Abagezweho bagenzuwe','Ufikiaji uliothibitishwa'),
('interactions','INTEGER_ZERO_OR_POSITIVE','Interactions','Interactions','Ibitekerezo n’ibikorwa by’abakurikiye','Mwingiliano'),
('method','LONG_TEXT','Measurement method and limitations','Méthode et limites','Uburyo bwo gupima n’imbogamizi','Mbinu ya upimaji na mipaka yake'),
('logo','BOOLEAN','Approved visual identity respected','Charte graphique respectée','Ibirango byemejwe byubahirijwe','Utambulisho wa kuona ulioidhinishwa umezingatiwa'),
('satisfaction','INTEGER_ZERO_OR_POSITIVE','Satisfaction score 0–10','Satisfaction 0–10','Amanota yo kunyurwa 0–10','Alama ya kuridhika 0–10'),
('closed','DATE','Closure date','Date de clôture','Itariki yo gusoza','Tarehe ya kufunga'),
('verification','TEXT','Independent verifier account ID','Identifiant du vérificateur indépendant','Kode ya konti y’uwagenzuye utabogamye','Kitambulisho cha akaunti ya mthibitishaji huru'),
('sample','INTEGER_ZERO_OR_POSITIVE','Sample size','Taille échantillon','Umubare w’abatoranyijwe','Ukubwa wa sampuli'),
('device','TEXT','Device inventory code','Code inventaire appareil','Kode y’igikoresho','Msimbo wa kifaa'),
('version','TEXT','Version','Version','Verisiyo','Toleo'),
('numerator','NUMBER','Numerator','Numérateur','Umubare ugabanywa','Kiasi kinachogawanywa'),
('denominator','NUMBER','Denominator','Dénominateur','Umubare ugabanya','Kiasi kinachogawa'),
('approved','BOOLEAN','Independent approval reference verified','Référence approbation indépendante vérifiée','Inyandiko y’iyemezwa ryigenga yagenzuwe','Rejea ya idhini huru imethibitishwa'),
('approval_ref','TEXT','Approval register reference','Référence registre approbations','Kode y’inyandiko y’iyemezwa','Rejea ya daftari la idhini'),
]
for r in rows:field(*r)
OPTIONS={}
def opts(key,entries):
 OPTIONS[key]=[dict(code=c,label=label(*names)) for c,*names in entries]
opts('axis',[(f'A{i}',*v) for i,v in enumerate([
('Unity, reconciliation and resilience','Unité, réconciliation et résilience','Ubumwe, ubwiyunge n’ubudaheranwa','Umoja, maridhiano na ustahimilivu'),
('Non-violent conflict transformation','Transformation non violente des conflits','Guhindura amakimbirane nta hohotera','Mabadiliko ya migogoro bila vurugu'),
('Ecological justice','Justice écologique','Ubutabera ku bidukikije','Haki ya kiikolojia'),
('Human rights and advocacy','Droits humains et plaidoyer','Uburenganzira bwa muntu n’ubuvugizi','Haki za binadamu na utetezi'),
('Organisational development','Développement organisationnel','Iterambere ry’umuryango','Maendeleo ya taasisi')],1)])
F['axis']['options']='axis'
opts('type',[(c,*v) for c,v in {
'MEETING':('Meeting','Réunion','Inama','Mkutano'),'TRAINING':('Training','Formation','Amahugurwa','Mafunzo'),
'VISIT':('Visit','Visite','Uruzinduko','Ziara'),'AWARENESS':('Awareness','Sensibilisation','Ubukangurambaga','Uhamasishaji'),
'ADVOCACY':('Advocacy','Plaidoyer','Ubuvugizi','Utetezi'),'LISTENING':('Active listening','Écoute active','Gutega amatwi','Usikilizaji makini'),
'MEDIATION':('Mediation','Médiation','Ubuhuza','Usuluhishi'),'ECOLOGY':('Ecology','Écologie','Ibidukikije','Ikolojia'),
'COMMUNICATION':('Communication','Communication','Itumanaho','Mawasiliano'),'OTHER':('Other','Autre','Ikindi','Nyingine')}.items()])
field('type','TEXT','Activity type','Type activité','Ubwoko bw’igikorwa','Aina ya shughuli','type')
opts('state',[(c,*v) for c,v in {
'DRAFT':('Draft','Brouillon','Igiteganyo','Rasimu'),'SUBMITTED':('Submitted','Soumis','Byoherejwe','Imewasilishwa'),
'CORRECTION':('Correction requested','À corriger','Bikeneye gukosorwa','Inahitaji marekebisho'),
'VERIFIED':('Verified','Vérifié','Byagenzuwe','Imethibitishwa'),'FINANCE_CHECKED':('Finance checked','Finance vérifiée','Imari yagenzuwe','Fedha zimehakikiwa'),
'QUALITY_CHECKED':('Quality checked','Qualité validée','Ubwiza bwagenzuwe','Ubora umehakikiwa'),
'APPROVED':('Approved','Approuvé','Byemejwe','Imeidhinishwa'),'LOCKED':('Locked','Verrouillé','Byafunzwe','Imefungwa'),
'ARCHIVED':('Archived','Archivé','Byashyizwe mu bubiko','Imehifadhiwa')}.items()])
field('state','TEXT','Declared review status (not an access lock)','Statut déclaré de revue (sans verrou de sécurité)','Icyiciro cy’isuzuma cyanditswe (si ugufunga uburenganzira)','Hali iliyotajwa ya uhakiki (si kufunga ruhusa)','state')
opts('channel',[(x,*v) for x,v in {'WEB':('Website','Site web','Urubuga','Tovuti'),'RADIO':('Radio','Radio','Radiyo','Redio'),'SOCIAL':('Social media','Réseaux sociaux','Imbuga nkoranyambaga','Mitandao ya kijamii'),'PRESS':('Press','Presse','Itangazamakuru','Magazeti'),'EVENT':('Event','Événement','Igikorwa rusange','Tukio')}.items()])
field('channel','TEXT','Channel','Canal','Umuyoboro','Njia','channel')
forms=[]
def form(code,names,fields,sensitive=False,required=None):
 keys=list(dict.fromkeys(['record']+fields+['evidence','state']))
 forms.append(dict(code=code,id=uid('program:'+code),stage=uid('stage:'+code),label=label(*names),fields=keys,sensitive=sensitive,required=required or ['record']))
form('F01',('Metadata change request','Demande de modification métadonnée','Gusaba guhindura amakuru fatizo','Ombi la kubadili metadata'),['title','reason','version','owner','due'])
form('F02',('Account assignment request','Demande affectation compte','Gusaba guha konti inshingano','Ombi la mgawo wa akaunti'),['owner','device','start','end','reason'],True)
form('F03',('Annual plan and budget','Plan annuel et budget','Igenamigambi n’ingengo y’imari by’umwaka','Mpango na bajeti ya mwaka'),['axis','result','intervention','project','activity','title','need','change','baseline','indicator','target','start','end','owner','quantity','unit_cost','budget','local','secured','source','risk','approval_ref'],required=['record','axis','result','activity','title','start','end','owner'])
form('F04',('Quarterly forecast','Prévision trimestrielle','Iteganyagihe ry’igihembwe','Makadirio ya robo mwaka'),['axis','project','activity','title','start','end','target','budget','owner','risk'])
form('F05',('Weekly work plan','Plan de travail hebdomadaire','Gahunda y’akazi y’icyumweru','Mpango wa kazi wa wiki'),['activity','title','start','end','owner','target'])
form('F06',('Daily work and mission log','Journal quotidien et mission','Ibyakozwe buri munsi n’ubutumwa','Daftari la kazi za kila siku na safari'),['activity','title','owner','outputs','spent','action','due'])
form('F07',('Activity implementation','Réalisation activité','Ishyirwa mu bikorwa ry’igikorwa','Utekelezaji wa shughuli'),['axis','result','project','activity','title','type','owner','total','women','men','undisclosed','outputs','outcome','budget','spent','local','reason','action','due','approval_ref'],required=['record','axis','result','activity','title','owner','total','women','men','undisclosed'])
form('F08',('Participation and coverage','Participation et couverture','Ubwitabire n’abagezweho','Ushiriki na ufikiaji'),['activity','total','women','men','undisclosed','unique','disability','age_u18','age_18_24','age_25_34','age_35_49','age_50_64','age_65','age_unknown','method'])
form('F09',('Listening and referral','Écoute et référencement','Gutega amatwi no kohereza kuri serivisi','Usikilizaji na rufaa'),['case','person','consent','service','accessed','action','due','closed'],True, ['record','case','consent'])
form('F10',('Conflict and mediation follow-up','Conflit et suivi de médiation','Amakimbirane n’ikurikiranwa ry’ubuhuza','Migogoro na ufuatiliaji wa usuluhishi'),['case','consent','start','severity','action','due','followup6','followup12','recurrence','closed','verification'],True,['record','case','consent'])
form('F11',('Isanamitima and GURR journey','Parcours Isanamitima et GURR','Urugendo rwa Isanamitima na GURR','Mchakato wa Isanamitima na GURR'),['case','person','group','consent','step','pre','post','threshold','action','due','closed'],True,['record','case','consent'])
form('F12',('Prison and reintegration follow-up','Suivi prison et réintégration','Ikurikiranwa ryo mu igororero no gusubira mu muryango','Ufuatiliaji wa gereza na ujumuishaji upya'),['case','person','consent','release','service','accessed','action','due','closed'],True,['record','case','consent'])
form('F13',('Ecological justice initiative','Initiative justice écologique','Igikorwa cy’ubutabera ku bidukikije','Mpango wa haki ya kiikolojia'),['activity','title','baseline','target','outputs','standard','outcome','method','owner','due'])
form('F14',('Human rights and advocacy','Droits humains et plaidoyer','Uburenganzira bwa muntu n’ubuvugizi','Haki za binadamu na utetezi'),['case','consent','request','response','service','accessed','outcome','owner','due'],True,['record','case','consent'])
form('F15',('Committee functionality and volunteers','Fonctionnalité comités et bénévoles','Imikorere ya komite n’abakorerabushake','Utendaji wa kamati na wajitolea'),['assessed','compliant','meetings','volunteers','active','pre','post','method','action','due'])
form('F16',('Data quality review','Contrôle qualité des données','Igenzura ry’ubwiza bw’amakuru','Ukaguzi wa ubora wa data'),['activity','indicator','numerator','denominator','reason','action','owner','due','verification'])
form('F17',('Risk, incident and unintended effect','Risque, incident et effet inattendu','Ibyago, ikibazo n’ingaruka zitateganyijwe','Hatari, tukio na athari zisizotarajiwa'),['case','consent','severity','probability','risk','action','owner','due','closed','verification'],True,['record','case','consent','severity','probability'])
form('F18',('Feedback, complaint and satisfaction','Feedback, plainte et satisfaction','Ibitekerezo, ikirego no kunyurwa','Mrejesho, malalamiko na kuridhika'),['case','consent','channel','satisfaction','action','due','closed','verification'],True,['record','case','consent'])
form('F19',('Budget, expenditure and local contribution','Budget, dépense et contribution locale','Ingengo y’imari, ikoreshwa n’umusanzu w’abaturage','Bajeti, matumizi na mchango wa jamii'),['axis','project','activity','source','budget','planned_cost','spent','committed','local','secured','quantity','unit_cost','reason','approval_ref'],True)
form('F20',('Partnership and resource commitment','Partenariat et engagement de ressource','Ubufatanye n’inkunga yemejwe','Ushirikiano na ahadi ya rasilimali'),['partner','project','source','secured','start','end','owner','risk','action','due'])
form('F21',('Decision and corrective action','Décision et action corrective','Icyemezo n’igikorwa cyo gukosora','Uamuzi na hatua ya kurekebisha'),['axis','activity','title','action','owner','due','closed','verification'])
form('F22',('Communication and visibility','Communication et visibilité','Itumanaho no kumenyekanisha ibikorwa','Mawasiliano na mwonekano'),['activity','title','channel','url','reach','interactions','spent','media_consent','logo','method','due'])
form('F23',('Change story consent reference','Référence consentement récit de changement','Kode y’ukwemera inkuru y’impinduka','Rejea ya ridhaa ya simulizi la mabadiliko'),['case','consent','media_consent','change','method','approval_ref'],True,['record','case','consent'])
form('F24',('Consolidated report review record','Fiche revue rapport consolidé','Inyandiko y’isuzuma rya raporo ihujwe','Rekodi ya uhakiki wa ripoti iliyojumuishwa'),['title','start','end','method','reason','action','owner','approval_ref'])
form('F25',('Baseline, midterm and final evaluation','Évaluation initiale, mi-parcours et finale','Isuzuma fatizo, ryo hagati n’irisoza','Tathmini ya mwanzo, kati na mwisho'),['indicator','baseline','target','numerator','denominator','sample','method','outcome','verification'],True)
form('F26',('Technical support ticket','Ticket assistance technique','Gusaba ubufasha bwa tekiniki','Tiketi ya msaada wa kiufundi'),['title','device','version','severity','reason','owner','due','closed'])
# Native metadata: private by default. No users, credentials, invented units or baseline/targets.
M={k:[] for k in ['optionSets','options','dataElements','programs','programStages','programStageSections','userGroups','dashboards']}
for name in ['APSE_ADMIN','APSE_MEL','APSE_DIRECTION','APSE_FINANCE','APSE_CPJP','APSE_CCJP','APSE_CEB','APSE_SENSITIVE','APSE_EVALUATOR']:
 M['userGroups'].append(dict(id=uid('group:'+name),name=name,code=name,users=[]))
for key,entries in OPTIONS.items():
 oid=uid('optionset:'+key); ids=[]
 for order,o in enumerate(entries):
  i=uid('option:'+key+o['code']);ids.append({'id':i});M['options'].append(dict(id=i,code=o['code'],name=o['label']['en'],optionSet={'id':oid},sortOrder=order+1,translations=tr(o['label'])))
 M['optionSets'].append(dict(id=oid,name='APSE '+key,code='APSE_OS_'+key.upper(),valueType='TEXT',version=1,options=ids))
for key,f in F.items():
 de=dict(id=f['id'],code='APSE_'+key.upper(),name=f['label']['en'],shortName=f['label']['en'][:50],valueType=f['type'],domainType='TRACKER',aggregationType='SUM' if f['type'] in ['NUMBER','INTEGER_ZERO_OR_POSITIVE','INTEGER_POSITIVE'] else 'NONE',translations=tr(f['label']),publicAccess='--------')
 if f['options']:de['optionSet']={'id':uid('optionset:'+f['options'])}
 M['dataElements'].append(de)
for form in forms:
 group='APSE_SENSITIVE' if form['sensitive'] else 'APSE_MEL'
 access=[dict(id=uid('group:'+group),access='rwrw----')]
 if not form['sensitive']: access += [dict(id=uid('group:'+g),access='r-rw----') for g in ['APSE_CPJP','APSE_CCJP','APSE_CEB']]+[dict(id=uid('group:APSE_DIRECTION'),access='r-r-----')]
 sharing=dict(publicAccess='--------',externalAccess=False,userGroupAccesses=access)
 M['programs'].append(dict(id=form['id'],name=form['code']+' '+form['label']['en'],shortName=form['code']+' '+form['label']['en'][:45],code='APSE_'+form['code'],programType='WITHOUT_REGISTRATION',displayIncidentDate=False,organisationUnits=[],programStages=[{'id':form['stage']}],translations=tr({k:form['code']+' '+v for k,v in form['label'].items()}),**sharing))
 M['programStages'].append(dict(id=form['stage'],name=form['code']+' '+form['label']['en'],code='APSE_STAGE_'+form['code'],program={'id':form['id']},repeatable=False,minDaysFromStart=0,autoGenerateEvent=False,reportDateDescription='Date',executionDateLabel='Date',programStageDataElements=[dict(dataElement={'id':F[k]['id']},compulsory=k in form['required'],sortOrder=n+1,displayInReports=k in ['record','axis','title']) for n,k in enumerate(form['fields'])],translations=tr({k:form['code']+' '+v for k,v in form['label'].items()})))
# Ten private dashboard guides; analytics are deliberately not fabricated.
DN=[('Daily operations','Opérations quotidiennes','Ibikorwa bya buri munsi','Shughuli za kila siku'),('Weekly work','Travail hebdomadaire','Akazi k’icyumweru','Kazi za wiki'),('Monthly review','Revue mensuelle','Isuzuma ry’ukwezi','Mapitio ya mwezi'),('Pastoral quarterly review','Revue trimestrielle pastorale','Isuzuma ry’igihembwe cya Kiliziya','Mapitio ya robo mwaka wa kichungaji'),('Six-month review','Revue semestrielle','Isuzuma ry’amezi atandatu','Mapitio ya miezi sita'),('Pastoral annual review','Revue annuelle pastorale','Isuzuma ry’umwaka wa Kiliziya','Mapitio ya mwaka wa kichungaji'),('Midterm evaluation','Évaluation mi-parcours','Isuzuma ryo hagati','Tathmini ya kati'),('Final evaluation','Évaluation finale','Isuzuma risoza','Tathmini ya mwisho'),('Data quality','Qualité des données','Ubwiza bw’amakuru','Ubora wa data'),('Communication','Communication','Itumanaho','Mawasiliano')]
for i,names in enumerate(DN,1):
 M['dashboards'].append(dict(id=uid('dashboard:'+str(i)),name=f'D{i:02} '+names[0],translations=tr(label(*[f'D{i:02} '+n for n in names])),publicAccess='--------',externalAccess=False,userGroupAccesses=[dict(id=uid('group:APSE_MEL'),access='rw------'),dict(id=uid('group:APSE_DIRECTION'),access='r-------')],dashboardItems=[dict(id=uid('dashitem:'+str(i)),type='TEXT',text='APSE CDJP Butare — Open APSE app / Capture for source records. Configure approved analytics after metadata import. No live analytics widget is bundled in this guide.',x=0,y=0,width=58,height=10)]))
config=dict(version='0.1.0-rc1',target='DHIS2 2.42 API',languages=['rw','en','fr','sw'],fields=F,options=OPTIONS,forms=forms,axes=OPTIONS['axis'],strategy={'start':'2026-09-01','end':'2031-08-31'},colours=['#fdf751','#fefab4'],source='Specifications_Systeme_APSE_CDJP_Butare_2026-2031.docx v2',expectedUnits={'deaneries':5,'parishes':27,'centrales':101,'ceb':2936})
(BASE/'app/config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2), encoding="utf-8")
(BASE/'metadata/all.json').write_text(json.dumps(M,ensure_ascii=False,indent=2), encoding="utf-8")
# CSV master has no guessed parentage.
parishes='Butare,Ngoma,St Dominique,Rango,Karama,Mugombwa,Magi,Kibilizi,Gisagara,Kirarambogo,Kansi,Gikore,Higiro,Cyahinda,Nyumba,Save,Mbazi,Simbi,Rugango,Byiza,Gakoma,Nyanza,Kiruhura,Ruyenzi,Nyamiyaga,Busoro,Sheke'.split(',')
with (BASE/'registers/parishes.csv').open('w') as out:
 w=csv.writer(out);w.writerow(['code','name','dhis2_uid','parent_uid','deanery','status'])
 for p in parishes:w.writerow(['OU-PAR-'+p.upper().replace(' ','-'),p,'','','Nyanza' if p=='Sheke' else '','TO_VALIDATE'])
for file,cols in {'organisations':['code','name','uid','parent_uid','level','opening_date','validated'],'results':['code','name_rw','name_en','name_fr','name_sw','axis','parent_code','source','validated'],'projects':['code','name','axis','result','donor','start','end','budget_rwf','validated'],'targets':['indicator_code','org_unit','pastoral_year','baseline','target','method','approver','date'],'access':['account_uid','role','organisation_unit_uid','program_code','expiry','authorised_by'],'retention':['category','purpose','basis','retention_days','dpo_approval'],'approvals':['record_uid','reviewer_uid','review_role','decision','reason','timestamp','version','signature_reference']}.items():
 with (BASE/f'registers/{file}.csv').open('w') as out:csv.writer(out).writerow(cols)
print(json.dumps({k:len(v) for k,v in M.items()},indent=2))
