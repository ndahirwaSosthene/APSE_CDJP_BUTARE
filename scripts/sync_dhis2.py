#!/usr/bin/env python3
"""Publish approved non-sensitive source events to read-only DHIS2 mirrors. Dry-run by default."""
import argparse,hashlib,json,os,string,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,CONFIG,FORMS
from install import Client,has_errors
p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--start',required=True);p.add_argument('--end',required=True);p.add_argument('--root-path',required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
client=Client(a.url,os.environ['DHIS2_PUBLISHER_TOKEN']);engine=Engine(os.environ['APSE_DB'],os.environ['APSE_ENCRYPTION_KEY'].encode(),os.environ['APSE_AUDIT_KEY'].encode());publisher=dict(id='APSE_INTEGRATION',roles=['APSE_MEL'],paths=[a.root_path]);rows=engine.listing(publisher,a.start,a.end,approved=True);events=[]
def uid(value):
 n=int.from_bytes(hashlib.sha256(value.encode()).digest(),'big');ch=string.ascii_letters+string.digits;return 'P'+''.join(ch[(n//62**i)%62]for i in range(10))
for row in rows:
 form=FORMS[row['form']]
 if form['sensitive']:continue
 # Mirror is an approved version, with stable event identifier across retries.
 root_id=row['id'];parent=row.get('parent')
 while parent:
  root_id=parent;parent=engine._row(parent)['parent']
 events.append(dict(event=uid(root_id),program=form['id'],programStage=form['stage'],orgUnit=row['unit'],occurredAt=row['event_date']+'T12:00:00.000',status='COMPLETED',dataValues=[dict(dataElement=CONFIG['fields'][k]['id'],value=str(row['values'][k]) if k in row['values'] else None)for k in form['fields']]))
metadata=json.loads((Path(__file__).resolve().parents[1]/'metadata/all.json').read_text(encoding="utf-8"));element_ids={d['code']:d['id']for d in metadata['dataElements']};inputs={};dictionary={d['code']:d for d in json.loads((Path(__file__).resolve().parents[1]/'registers/kpi_dictionary.json').read_text(encoding="utf-8"))}
for row in rows:
 if row['form']!='F42':continue
 v=row['values'];code=v.get('indicator');kind=dictionary.get(code,{}).get('kind')
 if kind in ['median','gap',None]:continue
 period=row['event_date'][:7].replace('-','')
 for suffix,key in [('N','numerator'),('D','denominator')]:
  if key not in v:continue
  de=element_ids.get('APSE_KPI_'+code.replace('-','_')+'_'+suffix)
  if de:
   index=(row['unit'],period,de);inputs[index]=inputs.get(index,0)+float(v[key])
# Reconcile cells from superseded approved F42 versions so date/code amendments do not leave stale native KPI inputs.
for hist in engine.db.execute("SELECT h.body FROM history h JOIN records r ON r.id=h.record_id WHERE r.form='F42'"):
 old=engine.dec(hist['body'])
 if old['state']not in ['APPROVED','LOCKED']or not engine.can(publisher,old)or not a.start<=old['event_date']<=a.end:continue
 code=old['values'].get('indicator');period=old['event_date'][:7].replace('-','')
 for suffix in ['N','D']:
  de=element_ids.get('APSE_KPI_'+str(code).replace('-','_')+'_'+suffix)
  if de:inputs.setdefault((old['unit'],period,de),None)
if not a.apply:print(json.dumps(dict(events=len(events),monthlyInputs=len(inputs),clearStaleCells=sum(v is None for v in inputs.values()),mode='DRY_RUN',noSensitiveData=True)));sys.exit(0)
for begin in range(0,len(events),100):
 result=client.call('tracker?async=false&importStrategy=CREATE_AND_UPDATE',{'events':events[begin:begin+100]})
 if has_errors(result):raise SystemExit('DHIS2 rejected a batch; review server import report before continuing')
if inputs:
 values=[dict(orgUnit=unit,period=period,dataElement=de,value='' if value is None else str(value),comment='Approved APSE F42 observations')for (unit,period,de),value in inputs.items()]
 for begin in range(0,len(values),500):
  result=client.call('dataValueSets?importStrategy=CREATE_AND_UPDATE',{'dataValues':values[begin:begin+500]})
  if has_errors(result):raise SystemExit('Monthly KPI input publication failed; review DHIS2 import report')
with engine.tx():engine.audit(publisher,'PUBLISH_DHIS2','BATCH',dict(count=len(events),start=a.start,end=a.end))
print(str(len(events))+' approved events published')
