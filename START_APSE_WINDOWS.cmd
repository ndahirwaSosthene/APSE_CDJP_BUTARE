@echo off
setlocal
cd /d "%~dp0"
title CDJP BUTARE - APSE v1.0
if not exist "%~dp0runtime\windows\python.exe" goto missing_runtime
if not exist "%~dp0service\portable.py" goto missing_files
if not exist "%~dp0logs" mkdir "%~dp0logs"
"%~dp0runtime\windows\python.exe" -X utf8 -c "import sys,sqlite3; import cryptography.fernet; import openpyxl; import docx; print('Runtime OK:',sys.version.split()[0])" > "%~dp0logs\startup-check.txt" 2>&1
if errorlevel 1 goto runtime_failed
echo.
echo CDJP BUTARE - APSE v1.0
echo Keep this window open while using the web application.
echo Browser: http://127.0.0.1:8766/
echo.
"%~dp0runtime\windows\python.exe" -X utf8 "%~dp0service\portable_boot.py" --no-auth --host 0.0.0.0
if errorlevel 1 goto server_failed
echo APSE stopped / APSE arrete / APSE yahagaze.
pause
exit /b 0
:missing_runtime
echo.
echo APSE cannot start: the complete runtime folder was not found.
echo Expected file: "%~dp0runtime\windows\python.exe"
goto failed
:missing_files
echo APSE files are incomplete. Extract the entire ZIP, not individual files.
goto failed
:runtime_failed
echo Python runtime or a required dependency could not start.
type "%~dp0logs\startup-check.txt"
goto failed
:server_failed
echo APSE could not start. Read the error above.
echo Diagnostic: "%~dp0logs\last-error.txt"
:failed
echo.
echo This window will remain open until you press a key.
pause
exit /b 1
