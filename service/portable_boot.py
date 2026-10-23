"""Console entry point: keep useful startup errors without recording secrets."""
from pathlib import Path
import sys,traceback
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'service'))
sys.path.insert(0,str(ROOT/'scripts'))
def main():
 error=ROOT/'logs/last-error.txt'
 try:
  from portable import main as run
  run()
 except KeyboardInterrupt:return 0
 except SystemExit as exc:
  code=exc.code if isinstance(exc.code,int) else 1
  if code:
   error.parent.mkdir(exist_ok=True);error.write_text('Startup stopped by input validation. See the message in the console. No passwords recorded.\n',encoding='utf-8')
  return code
 except Exception:
  error.parent.mkdir(exist_ok=True)
  # Traceback has no local variable values; never log stdin or password prompts.
  text=traceback.format_exc();error.write_text(text,encoding='utf-8');print(text,file=sys.stderr)
  print('Diagnostic: '+str(error),file=sys.stderr);return 1
 return 0
if __name__=='__main__':sys.exit(main())
