@echo off
setlocal
cd /d "%~dp0"
echo ============================================================================
echo   CDJP Butare — APSE v2 Strategic Planning ^& MEL Platform (2026-2031)
echo   Starting FastAPI Web Server on http://127.0.0.1:8765/ (LAN: 0.0.0.0:8765)
echo ============================================================================
python -X utf8 run.py --host 0.0.0.0 --port 8765
endlocal
