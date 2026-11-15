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
echo ========================================================
echo  R29 - EINMALIGER SICHTBARER PAPER-TRADE VIA CHATGPT
echo ========================================================
echo  NUR 50 virtuelle TEST-USDC, vorgegebener Demo-Token.
echo  Kein Echtgeld, keine Wallet und KEIN OpenAI-API-Key.
echo  Alter GitHub-Token wird lokal wiederverwendet.
echo  Reguläres Paper-Konto muss BOT AN und 50 TEST-USDC haben.
echo  Jede GitHub-Order hat ein Ablaufdatum und kann nur einmal
echo  ausgefuehrt werden. Bestehende Positionen bleiben bestehen.
echo ========================================================
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0runner\windows-supervisor.ps1" -WithR29 -AllowR29MainPaperDemo %*
set "rc=%ERRORLEVEL%"
if not "%rc%"=="0" (
 echo.
 echo R29 meldet einen Fehler. Siehe Ausgabe oben.
 pause
)
exit /b %rc%
