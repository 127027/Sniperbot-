@echo off
setlocal
cd /d "%~dp0"
title Sniperbot R29 - EIN START - PAPER ONLY
echo ========================================================
echo SNIPERBOT R29 - EINE STARTDATEI
echo ========================================================
echo Paper-Trading und Dashboard: http://127.0.0.1:3030
echo GitHub-Kurier mit vorhandenem, lokal gespeicherten Token.
echo KEIN Echtgeldhandel. KEIN kostenpflichtiger OpenAI-API-Key.
echo Zum Beenden im Bot-Fenster Q druecken.
echo ========================================================
echo.
where node.exe >nul 2>nul
if errorlevel 1 (
 echo FEHLER: Node.js 22 LTS wird benoetigt: https://nodejs.org/
 pause
 exit /b 1
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
 echo FEHLER: Windows PowerShell ist nicht verfuegbar.
 pause
 exit /b 1
)
rem Einzige Benutzer-Startdatei. Alle Prozessstarts/Stopps laufen ueber
rem den internen Windows-Supervisor. Dieser liest den vorhandenen DPAPI-PAT.
rem Zusatzeinstellungen optional: -NoBrowser, -ResetToken, -SelfTest.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0runner\windows-supervisor.ps1" -WithR29 %*
set "rc=%ERRORLEVEL%"
if not "%rc%"=="0" (
 echo.
 echo Sniperbot konnte nicht normal starten. Siehe Fehler oben.
 pause
)
exit /b %rc%
