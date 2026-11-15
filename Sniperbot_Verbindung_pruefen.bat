@echo off
setlocal
cd /d "%~dp0"
echo ==================================================
echo  SNIPERBOT R28 - VERBINDUNGSTEST (KEIN ECHTGELD)
echo ==================================================
echo.
where node.exe >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Node.js 22 LTS wird benoetigt: https://nodejs.org/
  pause
  exit /b 1
)
echo Der laufende Sniperbot muss bereits gestartet sein.
echo Pruefe nur lokale Ports, KI-Status, Quelle und isolierten Papier-Test.
echo Keine Wallet, keine Echtgeldorder und keine API-Schluessel werden gelesen.
echo.
node.exe "%~dp0runner\r28-connection-diagnostic.mjs" > "%~dp0R28_Verbindungsbericht.txt" 2>&1
set "rc=%ERRORLEVEL%"
type "%~dp0R28_Verbindungsbericht.txt"
echo.
echo Ergebnisdatei: "%~dp0R28_Verbindungsbericht.txt"
echo Diese Textdatei kannst du mir zur Auswertung im Chat hochladen.
echo Dein API-Key, Seedphrase, Wallet und Echtgeld-Guthaben stehen nicht darin.
echo.
if not "%rc%"=="0" echo Verbindungspruefung unvollstaendig. Fehler siehe oben.
pause
exit /b %rc%
