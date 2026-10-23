import json,csv
from pathlib import Path
from build import uid,label,tr,BASE
from kpis import K
m=json.loads((BASE/'metadata/all.json').read_text(encoding="utf-8"));c=json.loads((BASE/'app/config.json').read_text(encoding="utf-8"))
groups=[{'id':uid('group:'+g),'access':'r-------'} for g in ['APSE_MEL','APSE_DIRECTION','APSE_FINANCE','APSE_CPJP','APSE_CCJP','APSE_CEB','APSE_SENSITIVE']]
for d in m['dataElements']:d['userGroupAccesses']=groups
m.update(indicatorTypes=[{'id':uid('percent'),'name':'APSE Percentage','number':False,'factor':100},{'id':uid('unit'),'name':'APSE Unit','number':False,'factor':1}],indicators=[],dataSets=[])
aggregates=[];register=[]
for code,en,fr,rw,sw,kind,numerator,denominator in K:
 labels=label(en,fr,rw,sw);register.append(dict(code=code,label=labels,kind=kind,numerator=numerator,denominator=denominator,baseline=None,target=None,sourceStatus='Source reconciliation and approval required',formulaVersion='1.0'))
 if kind in ['median','gap']:continue
 refs=[]
 for suffix in (['N'] if kind=='count' else ['N','D']):
  i=uid('aggregate:'+code+suffix);refs.append(i);names={l:f'{code} {suffix} '+v for l,v in labels.items()};m['dataElements'].append(dict(id=i,code='APSE_KPI_'+code.replace('-','_')+'_'+suffix,name=names['en'],shortName=(code+' '+suffix+' '+en)[:50],valueType='NUMBER',domainType='AGGREGATE',aggregationType='SUM',zeroIsSignificant=True,publicAccess='--------',userGroupAccesses=groups,translations=tr(names)));aggregates.append(i)
 if kind!='count':m['indicators'].append(dict(id=uid('indicator:'+code),name=code+' '+en,shortName=(code+' '+en)[:50],code='APSE_IND_'+code.replace('-','_'),indicatorType={'id':uid('unit' if kind=='unit' else 'percent')},numerator='#{'+refs[0]+'}',denominator='#{'+refs[1]+'}',annualized=False,publicAccess='--------',userGroupAccesses=groups,translations=tr({l:code+' '+v for l,v in labels.items()})))
# Monthly inputs support pastoral quarter sums: Sep-Nov, Dec-Feb, Mar-May, Jun-Aug.
# Distinct annual population counts must be computed independently; monthly sums are not unique annual counts.
m['dataSets'].append(dict(id=uid('dataset:kpi'),code='APSE_KPI_MONTHLY',name='APSE reconciled monthly KPI inputs',shortName='APSE monthly KPI inputs',periodType='Monthly',timelyDays=15,expiryDays=0,openFuturePeriods=0,organisationUnits=[],dataSetElements=[{'dataElement':{'id':i}} for i in aggregates],publicAccess='--------',userGroupAccesses=[{'id':uid('group:APSE_MEL'),'access':'rwrw----'},{'id':uid('group:APSE_DIRECTION'),'access':'r-r-----'}],translations=tr(label('APSE reconciled monthly KPI inputs','APSE données KPI mensuelles rapprochées','APSE amakuru y’ibipimo by’ukwezi yagenzuwe','APSE data za viashiria vya mwezi zilizohakikiwa'))))
(BASE/'metadata/all.json').write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8");(BASE/'registers/kpi_dictionary.json').write_text(json.dumps(register,ensure_ascii=False,indent=2), encoding="utf-8")
with (BASE/'registers/kpi_dictionary.csv').open('w') as out:
 w=csv.writer(out);w.writerow(['code','en','fr','rw','sw','kind','numerator','denominator','baseline','target'])
 for row in K:w.writerow([*row,'',''])
print(f'{len(K)} KPI definitions; {len(aggregates)} aggregate input elements; {len(m["indicators"])} native ratio indicators')
