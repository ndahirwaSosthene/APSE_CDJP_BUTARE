"""Repair reversible legacy metadata decoding only; never rewrite record values."""
import re
SUSPECT=re.compile(r'Ã[\u0080-\u00bf]|â[€€™“”–—]|Â[\u00a0 ]')
def metadata_text(value):
 if not isinstance(value,str)or not SUSPECT.search(value):return value
 for encoding in ['cp1252','latin1']:
  try:candidate=value.encode(encoding).decode('utf-8')
  except (UnicodeEncodeError,UnicodeDecodeError):continue
  if len(SUSPECT.findall(candidate))<len(SUSPECT.findall(value)):return candidate
 return value

def metadata_labels(entry):
 if isinstance(entry,dict):
  return {k:({lang:metadata_text(text)for lang,text in v.items()}if k in ['label','labels','help']and isinstance(v,dict)else metadata_labels(v))for k,v in entry.items()}
 if isinstance(entry,list):return [metadata_labels(x)for x in entry]
 return entry
