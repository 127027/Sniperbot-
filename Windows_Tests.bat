@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt: https://nodejs.org & pause & exit /b 1)
echo Pruefe Meme Sniper AI - NUR Offline-Tests, keine Wallets, keine Trades.
node --check runner\core.mjs || goto :fail
node --check runner\market.mjs || goto :fail
node --check runner\server.mjs || goto :fail
node runner\test.mjs || goto :fail
node --test runner/*.test.mjs || goto :fail
echo ALLE TESTS BESTANDEN
pause
exit /b 0
:fail
echo TESTS FEHLGESCHLAGEN. Bitte Fehlermeldung an Codex weitergeben.
pause
exit /b 1
