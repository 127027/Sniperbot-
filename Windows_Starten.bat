@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js ist nicht installiert. Bitte https://nodejs.org/ oeffnen und die LTS-Version installieren.
 pause
 exit /b 1
)
echo MEME SNIPER AI V0.3 - NUR TESTGUTHABEN, KEIN ECHTGELDHANDEL
echo Bitte dieses Fenster offen lassen, damit der lokale Bot weiterlaeuft.
start "" "http://127.0.0.1:3030"
node runner\server.mjs
if errorlevel 1 pause
