@echo off
setlocal
cd /d "%~dp0"
echo Gestion des comptes locaux. Arreter APSE avant de continuer.
"runtime\windows\python.exe" -X utf8 "service\portable.py" --manage
pause
