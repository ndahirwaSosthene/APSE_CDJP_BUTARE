#!/usr/bin/env python3
"""Export an operational source report, not a signed institutional report, from server events."""
import argparse,csv,json,html,sys
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from install import Client
import os
B=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--unit',required=True);p.add_argument('--form',default='F07');p.add_argument('--start',required=True);p.add_argument('--end',required=True);p.add_argument('--language',choices=['rw','en','fr','sw'],default='fr');p.add_argument('--output',default='apse-report');a=p.parse_args()
if date.fromisoformat(a.start)>date.fromisoformat(a.end):p.error('Start follows end')
cfg=json.loads((B/'app/config.json').read_text(encoding="utf-8"));form=next((f for f in cfg['forms'] if f['code']==a.form),None)
if not form:p.error('Unknown form')
if form['sensitive']:p.error('Restricted exports require a separately authorised audited procedure; disabled in this tool')
c=Client(a.url,os.environ['DHIS2_TOKEN']);records=[];page=1
while True:
 q=urlencode(dict(program=form['id'],orgUnit=a.unit,orgUnitMode='SELECTED',occurredAfter=a.start+'T00:00:00.000',occurredBefore=a.end+'T23:59:59.999',page=page,pageSize=100))
 r=c.call('tracker/events?'+q);items=r.get('instances',r.get('events',[]));records+=items
 if len(items)<100:break
 page+=1
 if page>1000:raise SystemExit('Export exceeded safety limit. Narrow date range.')
headers=['UID','Date','Organisation']+[cfg['fields'][k]['label'][a.language] for k in form['fields']]
rows=[]
for e in records:
 values={d['dataElement']:d.get('value','') for d in e.get('dataValues',[])}
 rows.append([e['event'],e.get('occurredAt',''),e['orgUnit']]+[values.get(cfg['fields'][k]['id'],'') for k in form['fields']])
def safe(v):return "'"+str(v) if str(v).startswith(('=','+','-','@','\t','\r')) else v
with open(a.output+'.csv','w',encoding='utf-8-sig',newline='') as out:
 w=csv.writer(out);w.writerow(headers);w.writerows([[safe(v) for v in row] for row in rows])
notice={'rw':'Raporo y’inyandiko z’isoko. Ntiyemejwe kandi ntisimbura raporo y’inzego.','en':'Operational source extract. Not approved and not a replacement for the institutional report.','fr':'Extraction opérationnelle des sources. Non approuvée, ne remplace pas le rapport institutionnel.','sw':'Dondoo la rekodi za chanzo. Halijaidhinishwa na halibadilishi ripoti ya taasisi.'}[a.language]
body=''.join('<tr>'+''.join('<td>'+html.escape(str(v))+'</td>' for v in row)+'</tr>' for row in rows)
Path(a.output+'.html').write_text('<!doctype html><html lang="'+a.language+'"><meta charset="utf-8"><title>APSE '+a.form+'</title><style>body{font:12pt Arial}h1{font-size:24pt}th{background:#fefab4}td,th{border:1px solid #888;padding:6px}table{border-collapse:collapse}p{max-width:800px}</style><h1>CDJP Butare · APSE · '+html.escape(form['label'][a.language])+'</h1><p>'+notice+'</p><p>'+a.start+' → '+a.end+' · '+html.escape(a.unit)+'</p><table><tr>'+''.join('<th>'+html.escape(h)+'</th>' for h in headers)+'</tr>'+body+'</table></html>', encoding="utf-8")
print(str(len(rows))+' source records exported; store only in an authorised location')
