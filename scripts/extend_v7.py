"""Collection builder defaults; schemas themselves live in encrypted-record service DB."""
import json
from pathlib import Path
B=Path(__file__).resolve().parents[1]
for name in ['config.json','manifest.webapp']:
 p=B/'app'/name;c=json.loads(p.read_text(encoding="utf-8"));c['version']='0.7.0'
 if name=='config.json':c['collectionBuilder']={'adminRole':'APSE_MEL','defaultCPJPLanguage':'rw','languages':['rw','en','fr','sw'],'maxQuestions':60,'schemaRevision':'copy_new_code','sharing':'authenticated_scoped_only','editPermission':'MEL_grant_per_record_revision_1_to_168_hours'}
 p.write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8")
