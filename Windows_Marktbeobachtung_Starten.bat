@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS wird fuer die Forschungs-Datenerfassung benoetigt.
  pause
  exit /b 1
)
echo.
echo ===== MEME SNIPER MARKTBEOBACHTUNG =====
echo Nur lesende Recherche - KEIN Handel, KEINE Wallets, KEINE Zahlungen.
echo Neue Pools werden alle ca. 2 Minuten ueberprueft.
echo Lokale Daten: .local\research-market\
echo Historie: max. 21 Tage und max. 512 MiB (nur eigene Forschungsdateien).
echo Fenster offen lassen. Mit Strg+C kann die Beobachtung beendet werden.
echo.
node runner\research-market-daemon.mjs
if errorlevel 1 pause
