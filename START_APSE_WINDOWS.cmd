@echo off
setlocal
cd /d "%~dp0"
title CDJP BUTARE - APSE LOCAL
if not exist "%~dp0runtime\windows\python.exe" goto missing_runtime
if not exist "%~dp0service\portable.py" goto missing_files
if not exist "%~dp0logs" mkdir "%~dp0logs"
"%~dp0runtime\windows\python.exe" -X utf8 -c "import sys,sqlite3; import cryptography.fernet; import openpyxl; import docx; print('Runtime OK:',sys.version.split()[0])" > "%~dp0logs\startup-check.txt" 2>&1
if errorlevel 1 goto runtime_failed
"%~dp0runtime\windows\python.exe" -X utf8 "%~dp0scripts\verify_install.py" > "%~dp0logs\integrity-check.txt" 2>&1
if errorlevel 1 goto integrity_failed
echo.
echo CDJP BUTARE - APSE LOCAL
echo Keep this window open. Leave password entry blank on screen: this is normal.
echo Garder cette fenetre ouverte. Le mot de passe tape est invisible.
echo Kwandika ijambobanga ntibigaragara kuri ecran: ni ibisanzwe.
echo Browser: http://127.0.0.1:8766/
echo.
"%~dp0runtime\windows\python.exe" -X utf8 "%~dp0service\portable_boot.py"
if errorlevel 1 goto server_failed
echo APSE stopped / APSE arrete / APSE yahagaze.
pause
exit /b 0
:missing_runtime
echo.
echo APSE cannot start: the complete runtime folder was not found.
echo Ntabwo dosiye zose zakuwemo. Ntutangize iyi dosiye imbere muri ZIP.
echo 1. Right-click the APSE ZIP - Extract All / Extraire tout.
echo 2. Open the extracted APSE_CDJP_Butare folder.
echo 3. Start START_APSE_WINDOWS.cmd from that folder.
echo Or run INSTALL_APSE_WINDOWS.cmd next to the NEW full ZIP.
echo Expected file: "%~dp0runtime\windows\python.exe"
echo If the ZIP was fully extracted, check antivirus quarantine with your IT support.
echo Do not disable antivirus protection.
goto failed
:missing_files
echo APSE files are incomplete. Extract the entire ZIP, not individual files.
goto failed
:runtime_failed
echo Python runtime or a required dependency could not start.
type "%~dp0logs\startup-check.txt"
echo Diagnostic: "%~dp0logs\startup-check.txt"
goto failed
:integrity_failed
type "%~dp0logs\integrity-check.txt"
echo Incomplete or changed files. Re-extract the NEW ZIP into a NEW folder.
echo Diagnostic: "%~dp0logs\integrity-check.txt"
goto failed
:server_failed
echo APSE could not start. Read the error above.
echo Diagnostic: "%~dp0logs\last-error.txt"
:failed
echo.
echo This window will remain open until you press a key.
pause
exit /b 1
