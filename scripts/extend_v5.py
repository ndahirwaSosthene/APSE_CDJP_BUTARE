"""Results reporting defaults; no institutional observation or target is invented."""
from pathlib import Path
import json
B=Path(__file__).resolve().parents[1]
p=B/'app/config.json';c=json.loads(p.read_text(encoding="utf-8"));c['version']='0.5.0';c['reporting']={'default':'R13','basis':'PS 2026-2031 final 03.09.2026','levels':['axis','strategic_objective','result','intervention','AP'],'narrativeSections':['summary','outcomes','variance','learning','actions','limitations'],'approvedSourcesOnly':True,'preserveObservationScopes':True,'inferImpactFromActivities':False,'formats':['docx','xlsx','csv'],'csvScope':'results matrix only','approval':'MEL -> Coordinator -> Director'};p.write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8")
p=B/'app/manifest.webapp';m=json.loads(p.read_text(encoding="utf-8"));m['version']='0.5.0';p.write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8")
print('R13 PS results reporting configured')
