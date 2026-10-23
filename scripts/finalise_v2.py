import json,hashlib,string
from pathlib import Path
B=Path(__file__).resolve().parents[1]
def uid(s):
 n=int.from_bytes(hashlib.sha256(('CDJP-APSE-1:'+s).encode()).digest(),'big');chars=string.ascii_letters+string.digits
 return 'A'+''.join(chars[(n//62**i)%62]for i in range(10))
m=json.loads((B/'metadata/all.json').read_text(encoding="utf-8"));c=json.loads((B/'app/config.json').read_text(encoding="utf-8"))
for name in ['APSE_PUBLISHER','APSE_REVIEWER','APSE_COORDINATION','APSE_COMMUNICATION','APSE_HR','APSE_CURE','APSE_AUDITOR','APSE_STAFF']:
 if not any(g['name']==name for g in m['userGroups']):m['userGroups'].append(dict(id=uid('group:'+name),name=name,code=name,users=[]))
# Only an isolated integration account may write DHIS2 mirrors. Human writes use server-enforced service workflow.
for p in m['programs']:
 p['userGroupAccesses']=[dict(id=g['id'],access='r-r-----') for g in m['userGroups'] if g['name']in ['APSE_MEL','APSE_DIRECTION','APSE_REVIEWER','APSE_CPJP','APSE_CCJP','APSE_CEB','APSE_COORDINATION','APSE_COMMUNICATION']]
 if next(f for f in c['forms'] if 'APSE_'+f['code']==p['code'])['sensitive']:
  p['userGroupAccesses']=[dict(id=uid('group:APSE_SENSITIVE'),access='r-r-----')]
 p['userGroupAccesses'].append(dict(id=uid('group:APSE_PUBLISHER'),access='rwrw----'))
for ds in m['dataSets']:ds['userGroupAccesses']=[dict(id=uid('group:APSE_MEL'),access='r-r-----'),dict(id=uid('group:APSE_DIRECTION'),access='r-r-----'),dict(id=uid('group:APSE_PUBLISHER'),access='rwrw----')]
# Working translations of official interventions; FR remains the source wording.
other=[
('Institutionalise integrated diocesan healing, reconciliation, reintegration and resilience','Gushyiraho uburyo bwa diyosezi buhuza isanamitima, ubwiyunge, gusubira mu muryango n’ubudaheranwa','Kuimarisha mfumo wa dayosisi wa uponyaji, maridhiano, ujumuishaji upya na ustahimilivu'),
('Organise a safe continuum of listening, accompaniment, referral and follow-up','Gutegura uburyo butekanye buhuza gutega amatwi, guherekeza, kohereza kuri serivisi no gukurikirana','Kuratibu mwendelezo salama wa usikilizaji, usindikizaji, rufaa na ufuatiliaji'),
('Document and adapt proven pastoral approaches including GURR and family, community and intergenerational dialogue','Kubika no kunoza uburyo bwa Kiliziya bwatanze umusaruro harimo GURR n’ibiganiro by’imiryango, abaturage n’ibisekuru','Kuhifadhi na kurekebisha mbinu za kichungaji zilizothibitishwa zikiwemo GURR na mazungumzo ya familia, jamii na vizazi'),
('Institutionalise diocesan conflict analysis, early warning, mediation, referral and follow-up','Gushyiraho muri diyosezi isesengura ry’amakimbirane, impuruza ya kare, ubuhuza no gukurikirana','Kuimarisha uchambuzi wa migogoro, tahadhari za mapema, usuluhishi, rufaa na ufuatiliaji wa dayosisi'),
('Strengthen inclusive dialogue and prevention spaces','Gukomeza ibiganiro n’uburyo bwo gukumira bidaheza','Kuimarisha nafasi jumuishi za mazungumzo na uzuiaji'),
('Use learning to prevent recurrence and influence local norms','Gukoresha amasomo mu gukumira isubiramo no kunoza imigenzereze y’aho ibikorwa bikorerwa','Kutumia mafunzo kuzuia kujirudia na kuathiri kanuni za jamii'),
('Embed integral ecology in pastoral governance and Justice and Peace Clubs','Gushyira kubungabunga ibidukikije mu miyoborere ya Kiliziya na clubs z’Ubutabera n’Amahoro','Kuimarisha ikolojia jumuishi katika utawala wa kichungaji na Vilabu vya Haki na Amani'),
('Develop territorial risk reduction and resilience portfolios','Gutegura gahunda z’ibice zigabanya ibyago kandi zikomeza ubudaheranwa','Kuendeleza mipango ya maeneo ya kupunguza hatari na kujenga ustahimilivu'),
('Translate community evidence into parish, local and partnership decisions','Gukoresha ibimenyetso by’abaturage mu byemezo bya paruwasi, inzego z’ibanze n’ubufatanye','Kubadili ushahidi wa jamii kuwa maamuzi ya parokia, maeneo na ushirikiano'),
('Institutionalise the community voice, evidence, advocacy, response and follow-up cycle','Gushyiraho urukurikirane rw’ijwi ry’abaturage, ibimenyetso, ubuvugizi, igisubizo n’ikurikiranwa','Kuimarisha mzunguko wa sauti ya jamii, ushahidi, utetezi, mwitikio na ufuatiliaji'),
('Improve actual access to information, remedies and protection','Kunoza kubona amakuru, kurenganurwa no kurindwa','Kuboresha upatikanaji halisi wa taarifa, njia za haki na ulinzi'),
('Build alliances and Justice and Peace Clubs for verifiable changes','Kubaka ubufatanye na clubs z’Ubutabera n’Amahoro kugira ngo haboneke impinduka zigenzurwa','Kujenga miungano na Vilabu vya Haki na Amani kwa mabadiliko yanayothibitishwa'),
('Clarify governance, subsidiarity and standards from Diocese to CEB','Gusobanura imiyoborere, isaranganya ry’inshingano n’ibipimo kuva kuri diyosezi kugera kuri CEB','Kufafanua utawala, ugawaji wa majukumu na viwango kutoka dayosisi hadi CEB'),
('Deploy APSE integrated with finance, risk, learning and decisions','Gushyiraho APSE ihuza imari, ibyago, amasomo n’ibyemezo','Kuweka APSE iliyounganishwa na fedha, hatari, ujifunzaji na maamuzi'),
('Secure human, financial, digital and partnership resources for continuity','Kurinda abakozi, imari, ikoranabuhanga n’ubufatanye bikenewe kugira ngo ubutumwa bukomeze','Kuhakikisha rasilimali watu, fedha, kidijitali na ushirikiano kwa mwendelezo')]
for item,(en,rw,sw)in zip(c['interventions'],other):item['label'].update(en=en,rw=rw,sw=sw);item['translationStatus']='WORKING_TRANSLATION_REVIEW_REQUIRED'
for de in m['dataElements']:
 grants=de.setdefault('userGroupAccesses',[])
 if not any(g['id']==uid('group:APSE_PUBLISHER') for g in grants):grants.append(dict(id=uid('group:APSE_PUBLISHER'),access='r-------'))
for collection in m.values():
 for obj in collection:
  for translation in obj.get('translations',[]):
   if translation.get('property')in ['NAME','SHORT_NAME']:translation['value']=translation['value'][:230]
(B/'app/config.json').write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8");(B/'metadata/all.json').write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8");(B/'registers/strategic_interventions.json').write_text(json.dumps(c['interventions'],ensure_ascii=False,indent=2), encoding="utf-8")
