@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 22 erforderlich & pause & exit /b 1)
echo R32 LOCAL PAPER PILOT - separates virtuelles Konto
start "" "http://127.0.0.1:3030"
node r32\local-server.mjs
pause
