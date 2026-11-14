@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
 echo Node.js 22 LTS wird benoetigt: https://nodejs.org/
 pause
 exit /b 1
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
 echo Windows PowerShell ist nicht verfuegbar.
 pause
 exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0runner\windows-supervisor.ps1" %*
set "rc=%ERRORLEVEL%"
if not "%rc%"=="0" (
 echo.
 echo Die zentrale Sniperbot-Steuerung meldet einen Fehler. Siehe Ausgabe oben.
 pause
)
exit /b %rc%
