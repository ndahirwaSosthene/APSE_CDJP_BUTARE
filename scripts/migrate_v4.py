#!/usr/bin/env python3
"""Review first. Reset legacy in-flight reviews after an encrypted backup.
Run locally by the authorised server administrator with the service stopped.
Never change approved/locked historical versions or infer projects.
"""
import argparse,os,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from engine import Engine,NOW
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--database',required=True);p.add_argument('--actor',required=True);p.add_argument('--backup');p.add_argument('--apply',action='store_true');a=p.parse_args()
if not Path(a.database).is_file():p.error('Existing database required')
e=Engine(a.database,os.environ['APSE_ENCRYPTION_KEY'].encode(),os.environ['APSE_AUDIT_KEY'].encode());states=('SUBMITTED','MEL_VALIDATED','VERIFIED','FINANCE_CHECKED','QUALITY_CHECKED');rows=list(e.db.execute('SELECT * FROM records WHERE state IN(?,?,?,?,?)',states));print(json.dumps({'mode':'apply'if a.apply else 'review','recordsToReturnForCorrection':[dict(id=r['id'],state=r['state']) for r in rows],'historicalApprovedRecords':'unchanged','classification':'Historical project/operational values require explicit validation; never inferred'},indent=2))
if a.apply:
 if not a.backup or not Path(a.backup).is_file():p.error('Supply the existing encrypted backup using --backup before applying')
 with e.tx():
  for r in rows:
   e.db.execute("UPDATE records SET state='CORRECTION',revision=revision+1,updated=? WHERE id=?",(NOW(),r['id']));e.audit({'id':'MIGRATION:'+a.actor},'EDIT',r['id'],{'reason':'v4 MEL -> Coordinator -> Director workflow reset','oldState':r['state']})
e.db.close()
