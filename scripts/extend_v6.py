"""Transfer and standalone defaults. No users, keys or data bundled."""
import json
from pathlib import Path
B=Path(__file__).resolve().parents[1]
p=B/'app/config.json';c=json.loads(p.read_text(encoding="utf-8"));c['version']='0.6.0';c['transfers']={'formats':['csv','xlsx','json'],'importState':'DRAFT','preview':True,'maxRows':1000,'maxBytes':8388608,'mappingLanguages':['fr','en','rw','sw'],'sensitiveExportRequiresExplicitOption':True};c['portable']={'target':'Windows 10/11 x64','launcher':'START_APSE_WINDOWS.cmd','localOnly':True,'embeddedRuntime':True,'requiresInstalledPythonOnWindows':False,'persistentFolder':'portable_data','backup':'PACK_APSE_FOR_FLASH.cmd','nativeWindowsExecutionTested':False};p.write_text(json.dumps(c,ensure_ascii=False,indent=2), encoding="utf-8")
p=B/'app/manifest.webapp';m=json.loads(p.read_text(encoding="utf-8"));m['version']='0.6.0';p.write_text(json.dumps(m,ensure_ascii=False,indent=2), encoding="utf-8")
