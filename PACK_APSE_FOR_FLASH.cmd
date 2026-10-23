@echo off
setlocal
cd /d "%~dp0"
"runtime\windows\python.exe" -X utf8 "scripts\pack_for_flash.py"
pause
