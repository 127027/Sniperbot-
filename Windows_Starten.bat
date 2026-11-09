@echo off
rem Legacy alias: only the unified supervisor starts the local bot and collector.
rem No second paper-bot or second collector process is created here.
call "%~dp0Sniperbot_Starten.bat" %*
exit /b %ERRORLEVEL%
