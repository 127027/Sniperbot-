@echo off
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sniperbot_Hintergrundstart_Einrichten.ps1" -Remove
echo.
pause
