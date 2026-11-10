# Optional Windows user-logon background autostart. No admin, no service,
# no real trading, no token/PayPal/key handling. Must first start normal .bat once.
param([switch]$Remove,[switch]$Preview)
$ErrorActionPreference='Stop'
$taskName='SniperbotPaperBackground'
$supervisor=Join-Path $PSScriptRoot 'runner\windows-supervisor.ps1'
$tokenFile=Join-Path $env:LOCALAPPDATA 'MemeSniperPaper\secrets\research-github-token.dpapi'
if(!(Test-Path -LiteralPath $supervisor)){throw 'SUPERVISOR_NOT_FOUND'}
if($Remove){
 if($Preview){Write-Host 'AUTOSTART_PREVIEW_REMOVE_OK';exit 0}
 if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
 }
 Write-Host '[OK] Automatischen Start entfernt. Laufende Prozesse wurden nicht heimlich beendet.'
 exit 0
}
if(!$Preview -and !(Test-Path -LiteralPath $tokenFile)){
 throw 'Zuerst Sniperbot_Starten.bat normal starten und GitHub-Zugang einmalig einrichten.'
}
$arguments='-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$supervisor+'" -Background -NoBrowser'
if($Preview){
 if($arguments -notmatch '-Background -NoBrowser'){throw 'AUTOSTART_PREVIEW_INVALID'}
 Write-Host 'AUTOSTART_PREVIEW_INSTALL_OK'
 exit 0
}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal=New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Sniperbot local PAPER-only research/executor at Windows logon' -Force | Out-Null
Write-Host '[OK] Sniperbot-PAPER-Start nach Windows-Anmeldung eingerichtet (nicht als Windows-Dienst).'
Write-Host '[INFO] Den normalen Start nicht gleichzeitig benutzen: der Bot laeuft nur einmal.'
Write-Host '[INFO] Autostart stoppen: Aufgabenplanung > SniperbotPaperBackground > Beenden.'
