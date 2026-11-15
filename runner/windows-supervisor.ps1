# Windows PowerShell 5.1 supervisor: one console, two local Node processes.
# LIVE TRADING NOT SUPPORTED. Public-market GitHub token belongs only to collector.
param(
  [switch]$ResetToken,
  [switch]$SelfTest,
  [switch]$NoBrowser,
  [switch]$WithResearchCollector,
  [switch]$WithCentralAI,
  [switch]$ResetAiKey,
  [switch]$WithR29
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$paperUrl = 'http://127.0.0.1:3030'
$tokenFile = Join-Path $env:LOCALAPPDATA 'MemeSniperPaper\secrets\research-github-token.dpapi'
$aiKeyFile = Join-Path $env:LOCALAPPDATA 'MemeSniperPaper\secrets\openai-api-key.dpapi'
$job = [IntPtr]::Zero
$mutex = $null
$ownsMutex = $false
$bot = $null
$market = $null
$r29Courier = $null

# On Windows, closing the one terminal releases the job handle and kills BOTH children.
# Explicit Q shutdown sends a private stdin message first, allowing portfolio save.
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class SniperWindowsJob {
    [StructLayout(LayoutKind.Sequential)]
    private struct BasicLimits {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }
    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }
    [StructLayout(LayoutKind.Sequential)]
    private struct ExtendedLimits {
        public BasicLimits Basic;
        public IoCounters Io;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern IntPtr CreateJobObject(IntPtr securityAttributes, string name);
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool CloseHandle(IntPtr handle);

    public static IntPtr OpenKillOnClose() {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
        var data = new ExtendedLimits();
        data.Basic.LimitFlags = 0x00002000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        int size = Marshal.SizeOf(typeof(ExtendedLimits));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try {
            Marshal.StructureToPtr(data, buffer, false);
            if (!SetInformationJobObject(job, 9, buffer, (uint)size))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            return job;
        } catch {
            CloseHandle(job);
            throw;
        } finally {
            Marshal.FreeHGlobal(buffer);
        }
    }
    public static void Add(IntPtr job, Process process) {
        if (!AssignProcessToJobObject(job, process.Handle))
            throw new Win32Exception(Marshal.GetLastWin32Error());
    }
    public static void Close(IntPtr job) {
        if (job != IntPtr.Zero) CloseHandle(job);
    }
}
'@

function Initialize-ResearchToken {
  if($ResetToken -and (Test-Path -LiteralPath $tokenFile)){
    Remove-Item -LiteralPath $tokenFile -Force
    Write-Host '[ZUGANG] Alter verschluesselter Token-Eintrag entfernt.' -ForegroundColor Yellow
  }
  if(Test-Path -LiteralPath $tokenFile){return}
  Write-Host ''
  Write-Host '[ZUGANG] Einmalig GitHub-Token fuer 127027/Sniperbot- eingeben.' -ForegroundColor Cyan
  Write-Host 'Nur Contents: Read and write fuer dieses Repo. Token NIE hier im Chat teilen.'
  $secure = Read-Host 'GitHub-Token (Eingabe unsichtbar)' -AsSecureString
  if($null -eq $secure -or $secure.Length -lt 15){throw 'GitHub-Token zu kurz oder leer. Keine Anmeldung gespeichert.'}
  $encrypted = ConvertFrom-SecureString -SecureString $secure
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($tokenFile)) | Out-Null
  $temp = $tokenFile+'.pending'
  [IO.File]::WriteAllText($temp,$encrypted,[Text.Encoding]::UTF8)
  Move-Item -LiteralPath $temp -Destination $tokenFile -Force
  $secure.Dispose()
  $encrypted = $null
  Write-Host '[ZUGANG] Windows-DPAPI-Speicherung abgeschlossen; nur dieser Windows-Benutzer kann entschluesseln.' -ForegroundColor Green
}
function Read-ResearchToken {
  if(!(Test-Path -LiteralPath $tokenFile)){throw 'Kein verschluesselter Forschungstoken gefunden.'}
  try {
    $encrypted = [IO.File]::ReadAllText($tokenFile,[Text.Encoding]::UTF8).Trim()
    $secret = ConvertTo-SecureString -String $encrypted
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try {
      $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
      if([string]::IsNullOrEmpty($value) -or $value.Length -lt 15){throw 'Ungueltige Token-Laenge'}
      return $value
    }
    finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$secret.Dispose()}
  }catch {
    throw 'Windows kann den GitHub-Token nicht entschluesseln. Erneut mit Sniperbot_Starten.bat -ResetToken einrichten.'
  }
}
function Initialize-AiKey {
  if($ResetAiKey -and (Test-Path -LiteralPath $aiKeyFile)){
    Remove-Item -LiteralPath $aiKeyFile -Force
    Write-Host '[AI] Bisheriger API-Key-Eintrag entfernt.' -ForegroundColor Yellow
  }
  if(Test-Path -LiteralPath $aiKeyFile){return $true}
  Write-Host ''
  Write-Host '[AI] Optionale stündliche KI-Recherche (separate OpenAI-API-Kosten).' -ForegroundColor Cyan
  Write-Host 'Der API-Key wird NUR lokal per Windows-DPAPI geschützt. Nicht im Chat mitteilen.'
  Write-Host 'Zum Überspringen einfach ENTER drücken; der Paper-Bot startet dann ohne KI.'
  $secure=Read-Host 'OpenAI API-Key (verdeckt, optional)' -AsSecureString
  if($null -eq $secure -or $secure.Length -lt 20){
    if($null -ne $secure){$secure.Dispose()}
    Write-Host '[AI] Kein API-Key. Zentraler KI-Prozess bleibt AUS.' -ForegroundColor Yellow
    return $false
  }
  $encrypted=ConvertFrom-SecureString -SecureString $secure
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($aiKeyFile)) | Out-Null
  [IO.File]::WriteAllText($aiKeyFile+'.pending',$encrypted,[Text.Encoding]::UTF8)
  Move-Item -LiteralPath ($aiKeyFile+'.pending') -Destination $aiKeyFile -Force
  $secure.Dispose()
  Write-Host '[AI] API-Key Windows-DPAPI-gespeichert.' -ForegroundColor Green
  return $true
}
function Read-AiKey {
  if(!(Test-Path -LiteralPath $aiKeyFile)){throw 'Kein KI-API-Key gespeichert.'}
  try{
    $encrypted=[IO.File]::ReadAllText($aiKeyFile,[Text.Encoding]::UTF8).Trim()
    $secret=ConvertTo-SecureString -String $encrypted
    $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try{
      $value=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
      if(!$value.StartsWith('sk-') -or $value.Length -lt 20){throw 'Invalid OpenAI API key'}
      return $value
    }finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$secret.Dispose()}
  }catch{throw 'API-Key konnte nicht entschlüsselt werden. Mit -ResetAiKey neu einrichten.'}
}
function Assert-PortAvailable {
  $tcp = New-Object Net.Sockets.TcpClient
  try {
    $attempt = $tcp.BeginConnect('127.0.0.1',3030,$null,$null)
    if($attempt.AsyncWaitHandle.WaitOne(300)){
      try{$tcp.EndConnect($attempt);throw 'PORT_3030_ALREADY_USED: Bitte vorher den alten Sniperbot beenden.'}
      catch [Net.Sockets.SocketException] {return}
    }
  }
  finally {$tcp.Dispose()}
}
function Start-Child([string]$role,[string]$scriptName,[string]$nodePath,[IntPtr]$jobHandle) {
  $info = New-Object Diagnostics.ProcessStartInfo
  $info.FileName = $nodePath
  $info.Arguments = $scriptName
  $info.WorkingDirectory = $root
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardInput = $true
  $info.RedirectStandardOutput = $false
  $info.RedirectStandardError = $false
  $info.EnvironmentVariables['SNIPER_SUPERVISED'] = '1'
  # Remove inherited parent secrets from the Paper-Bot. Only the collector receives a copy.
  $info.EnvironmentVariables.Remove('SNIPER_MARKET_GITHUB_TOKEN')
  $info.EnvironmentVariables.Remove('SNIPER_MARKET_PUBLISH')
  $info.EnvironmentVariables.Remove('SNIPER_OPENAI_API_KEY')
  $info.EnvironmentVariables.Remove('SNIPER_CENTRAL_AI_ENABLED')
  $info.EnvironmentVariables.Remove('SNIPER_R29_GITHUB_TOKEN')
  if($role -eq 'BOT') {
    if($WithCentralAI -and (Test-Path -LiteralPath $aiKeyFile)){
      $aiSecret=Read-AiKey
      $info.EnvironmentVariables['SNIPER_OPENAI_API_KEY']=$aiSecret
      $info.EnvironmentVariables['SNIPER_CENTRAL_AI_ENABLED']='1'
      $aiSecret=$null
    }
    $info.EnvironmentVariables['SNIPER_RESEARCH_FEED'] = $(if($WithResearchCollector){'1'}else{'0'})
    $info.EnvironmentVariables['SNIPER_RESEARCH_READ'] = $(if($WithResearchCollector){'1'}else{'0'})
    $info.EnvironmentVariables['SNIPER_LOCAL_DISCOVERY'] = '0'
  }
  if($role -eq 'MARKET') {
    # The R27 local first-seen archive requires NO GitHub token. Only the
    # separately opted-in GitHub research publisher may read one.
    if($WithResearchCollector) {
      $value = Read-ResearchToken
      $info.EnvironmentVariables['SNIPER_MARKET_GITHUB_TOKEN'] = $value
      $info.EnvironmentVariables['SNIPER_MARKET_PUBLISH'] = '1'
      $value = $null
    } else {
      $info.EnvironmentVariables.Remove('SNIPER_MARKET_GITHUB_TOKEN')
      $info.EnvironmentVariables['SNIPER_MARKET_PUBLISH'] = '0'
    }
  }
  if($role -eq 'R29') {
    # Reuse the original GitHub PAT already protected by Windows DPAPI.
    # No additional R29 PAT file and no second token prompt.
    $researchSecret=Read-ResearchToken
    $info.EnvironmentVariables['SNIPER_R29_GITHUB_TOKEN']=$researchSecret
    $researchSecret=$null
  }
  $proc = New-Object Diagnostics.Process
  $proc.StartInfo = $info
  if(!$proc.Start()){throw ('Start fehlgeschlagen: '+$role)}
  try {[SniperWindowsJob]::Add($jobHandle,$proc)}
  catch {try{$proc.Kill()}catch{};throw}
  Write-Host ('[START] '+$role+' PID='+$proc.Id) -ForegroundColor Green
  return $proc
}
function Stop-Child($proc,[string]$role){
  if($null -eq $proc){return}
  try{
    if(!$proc.HasExited){
      $proc.StandardInput.WriteLine('SNIPER_STOP_V1')
      $proc.StandardInput.Flush()
      if(!$proc.WaitForExit(7000)){
        Write-Host ('[STOP] '+$role+' reagiert nicht; beende kontrolliert gestarteten Prozess.') -ForegroundColor Yellow
        $proc.Kill()
        $proc.WaitForExit(2000) | Out-Null
      }
    }
  }catch{try{if(!$proc.HasExited){$proc.Kill()}}catch{}}
  $proc.Dispose()
}
function Smoke-TestNativeJob([string]$nodePath){
  # No real keys, no wallet, no network; verifies Windows DPAPI and kernel job lifetime.
  $testSecret=ConvertTo-SecureString 'FAKE_TEST_ONLY_NO_GITHUB_TOKEN_123' -AsPlainText -Force
  $cipher=ConvertFrom-SecureString $testSecret
  $check=ConvertTo-SecureString $cipher
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($check)
  try {
    if([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) -ne 'FAKE_TEST_ONLY_NO_GITHUB_TOKEN_123'){throw 'DPAPI roundtrip failed'}
  }finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$testSecret.Dispose();$check.Dispose()}
  $nativeJob=[SniperWindowsJob]::OpenKillOnClose()
  $proc=$null
  try{
    $info=New-Object Diagnostics.ProcessStartInfo
    $info.FileName=$nodePath
    $info.Arguments='runner/windows-supervisor-test-child.mjs'
    $info.WorkingDirectory=$root
    $info.UseShellExecute=$false
    $info.CreateNoWindow=$true
    $info.RedirectStandardInput=$true
    $info.EnvironmentVariables['SNIPER_SUPERVISED']='1'
    $proc=New-Object Diagnostics.Process
    $proc.StartInfo=$info
    if(!$proc.Start()){throw 'Test child could not start'}
    [SniperWindowsJob]::Add($nativeJob,$proc)
    if($proc.HasExited){throw 'Test child terminated too early'}
    $proc.StandardInput.WriteLine('SNIPER_STOP_V1')
    $proc.StandardInput.Flush()
    if(!$proc.WaitForExit(6000)){throw 'Graceful stdin stop did not work'}
    if($proc.ExitCode -ne 0){throw 'Graceful test child did not exit cleanly'}
  }finally{
    [SniperWindowsJob]::Close($nativeJob)
    if($null -ne $proc){try{if(!$proc.HasExited){$proc.Kill()}}catch{};$proc.Dispose()}
  }
  # Test exactly what the user requested: closing the sole supervisor window must
  # terminate a still-running child, even if that child never received STOP.
  $killJob=[SniperWindowsJob]::OpenKillOnClose()
  $orphan=$null
  try{
    $i=New-Object Diagnostics.ProcessStartInfo
    $i.FileName=$nodePath
    $i.Arguments='runner/windows-supervisor-test-child.mjs --ignore-stop'
    $i.WorkingDirectory=$root
    $i.UseShellExecute=$false
    $i.CreateNoWindow=$true
    $i.RedirectStandardInput=$true
    $orphan=New-Object Diagnostics.Process
    $orphan.StartInfo=$i
    if(!$orphan.Start()){throw 'Kill-on-close child could not start'}
    [SniperWindowsJob]::Add($killJob,$orphan)
    Start-Sleep -Milliseconds 350
    if($orphan.HasExited){throw 'Kill-on-close child stopped unexpectedly'}
    [SniperWindowsJob]::Close($killJob)
    $killJob=[IntPtr]::Zero
    if(!$orphan.WaitForExit(5000)){throw 'Closing the Windows job left a child running'}
  }finally{
    if($killJob -ne [IntPtr]::Zero){[SniperWindowsJob]::Close($killJob)}
    if($null -ne $orphan){try{if(!$orphan.HasExited){$orphan.Kill()}}catch{};$orphan.Dispose()}
  }
  # Exercise the real ProcessStartInfo path twice, including one supervised restart.
  # Fake children use no GitHub token and no market/paper files.
  $newMutex=$false
  $guard=New-Object Threading.Mutex($true,('Local\SniperbotSelfTest_'+[Guid]::NewGuid().ToString('N')),[ref]$newMutex)
  if(!$newMutex){throw 'Could not acquire local supervisor mutex'}
  $nativeJob=[SniperWindowsJob]::OpenKillOnClose()
  $first=$null
  $second=$null
  try {
    $first=Start-Child 'TEST' 'runner/windows-supervisor-test-child.mjs' $nodePath $nativeJob
    $second=Start-Child 'TEST' 'runner/windows-supervisor-test-child.mjs' $nodePath $nativeJob
    if($first.HasExited -or $second.HasExited){throw 'Two fake supervised processes did not start'}
    Stop-Child $second 'TEST'
    $second=Start-Child 'TEST' 'runner/windows-supervisor-test-child.mjs' $nodePath $nativeJob
    if($second.HasExited){throw 'Supervised restart failed'}
    Stop-Child $second 'TEST'
    $second=$null
    Stop-Child $first 'TEST'
    $first=$null
  }finally{
    if($null -ne $second){Stop-Child $second 'TEST'}
    if($null -ne $first){Stop-Child $first 'TEST'}
    [SniperWindowsJob]::Close($nativeJob)
    $guard.ReleaseMutex()
    $guard.Dispose()
  }
  Write-Host 'WINDOWS_SUPERVISOR_SELF_TEST_OK (DPAPI, two children, restart, stdin exit, kill-on-window-close)' -ForegroundColor Green
}

try {
  $node=(Get-Command node.exe -ErrorAction Stop).Source
  if($SelfTest){Smoke-TestNativeJob $node;exit 0}
  Write-Host '==================================================='
  Write-Host '  SNIPERBOT - EIN START, EIN FENSTER, PAPER ONLY'
  Write-Host '==================================================='
  Write-Host ''
  $digest=[Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))
  $mutexName='Local\SniperbotOneClick_'+([BitConverter]::ToString($digest).Replace('-','').Substring(0,20))
  $created=$false
  $mutex=New-Object Threading.Mutex($true,$mutexName,[ref]$created)
  if(!$created){throw 'SNIPERBOT_ALREADY_STARTED: Zuerst die vorhandene zentrale Konsole schliessen.'}
  $ownsMutex=$true
  Assert-PortAvailable
  if($WithResearchCollector -or $WithR29){Initialize-ResearchToken}
  elseif($ResetToken){throw 'ResetToken nur im Forschungs-Collector- oder R29-Modus verwenden.'}
  if($WithCentralAI){[void](Initialize-AiKey)}
  elseif($ResetAiKey){throw 'ResetAiKey nur im zentralen KI-Modus verwenden.'}
  $job=[SniperWindowsJob]::OpenKillOnClose()
  $bot=Start-Child 'BOT' 'runner/server.mjs' $node $job
  if($WithResearchCollector -or $WithR29 -or ($WithCentralAI -and (Test-Path -LiteralPath $aiKeyFile))){
    $market=Start-Child 'MARKET' 'runner/research-market-daemon.mjs' $node $job
    Write-Host '[R27] Lokales, append-only Quellenarchiv aktiv (nur öffentliche Marktdaten/Nachrichten).' -ForegroundColor Green
  }
  if($WithR29 -and (Test-Path -LiteralPath $tokenFile)) {
    $r29Courier=Start-Child 'R29' 'runner/r29-windows-courier.mjs' $node $job
    Write-Host '[R29] GitHub-Paper-Sandbox aktiv. Keine OpenAI-API-Kosten.' -ForegroundColor Green
  }
  # Avoid opening an old/stale bot URL until the new listener answered locally.
  if(!$NoBrowser){
    for($attempt=0;$attempt -lt 25;$attempt++){
      if($bot.HasExited){throw 'Paper-Bot hat vor dem Start des Dashboards beendet.'}
      try{
        $response=Invoke-WebRequest -UseBasicParsing -Uri ($paperUrl+'/api/health') -TimeoutSec 2
        if($response.StatusCode -eq 200){Start-Process $paperUrl;break}
      }catch{}
      Start-Sleep -Milliseconds 350
    }
  }
  Write-Host ''
  Write-Host '[OK] Lokaler Bot sichtbar gestartet; keine Anmeldung an GitHub erforderlich.' -ForegroundColor Green
  if($WithResearchCollector){Write-Host '[OPTIONAL] Separater Markt-Collector explizit gestartet.'}
  if($WithR29){
    if($null -ne $r29Courier){Write-Host '[R29] GitHub-Pipeline AKTIV (nur isoliertes Papier)' -ForegroundColor Green}
    else {Write-Host '[R29] GitHub-Pipeline AUS (kein GitHub Token)' -ForegroundColor Yellow}
  }
  if($WithCentralAI -and (Test-Path -LiteralPath $aiKeyFile)){
    Write-Host '[AI] EIN stündlicher lokaler Forschungsprozess aktiviert, nur PAPER.' -ForegroundColor Green
  } else {Write-Host '[AI] Zentraler KI-Prozess AUS (fehlender API-Key oder nicht gewählt).'}
  Write-Host '[INFO] Zum Beenden Q druecken oder dieses Fenster schliessen.'
  $restarts=@{BOT=0;MARKET=0;R29=0}
  while($true){
    if($bot.HasExited){
      $restarts.BOT++
      if($restarts.BOT -gt 3){throw 'Paper-Bot 3x unerwartet beendet. Alles wird gestoppt.'}
      Write-Host ('[WARNUNG] Paper-Bot beendet. Neustart '+$restarts.BOT+'/3') -ForegroundColor Yellow
      Start-Sleep -Seconds ([Math]::Pow(2,$restarts.BOT))
      Assert-PortAvailable
      $bot=Start-Child 'BOT' 'runner/server.mjs' $node $job
    }
    if($null -ne $market -and $market.HasExited){
      $restarts.MARKET++
      if($restarts.MARKET -gt 3){throw 'Markt-Collector 3x unerwartet beendet. Alles wird gestoppt.'}
      Write-Host ('[WARNUNG] Markt-Collector beendet. Neustart '+$restarts.MARKET+'/3') -ForegroundColor Yellow
      Start-Sleep -Seconds ([Math]::Pow(2,$restarts.MARKET))
      $market=Start-Child 'MARKET' 'runner/research-market-daemon.mjs' $node $job
    }
    if($null -ne $r29Courier -and $r29Courier.HasExited){
      $restarts.R29++
      if($restarts.R29 -gt 3){throw 'R29 Kurier 3x unerwartet beendet. Alles wird gestoppt.'}
      Write-Host ('[WARNUNG] R29 GitHub Kurier Neustart '+$restarts.R29+'/3') -ForegroundColor Yellow
      Start-Sleep -Seconds ([Math]::Pow(2,$restarts.R29))
      $r29Courier=Start-Child 'R29' 'runner/r29-windows-courier.mjs' $node $job
    }
    try {
      if([Console]::KeyAvailable){
        $key=[Console]::ReadKey($true)
        if($key.Key -eq 'Q'){Write-Host '[STOP] Vom Benutzer angefordert.';break}
      }
    }catch{}
    Start-Sleep -Milliseconds 350
  }
}
catch {
  Write-Host ('[FEHLER] '+$_.Exception.Message) -ForegroundColor Red
  $global:LASTEXITCODE=1
}
finally {
  Stop-Child $r29Courier 'R29'
  Stop-Child $market 'MARKET'
  Stop-Child $bot 'BOT'
  if($job -ne [IntPtr]::Zero){[SniperWindowsJob]::Close($job)}
  if($null -ne $mutex){
    try{if($ownsMutex){$mutex.ReleaseMutex()}}catch{}
    $mutex.Dispose()
  }
  Write-Host '[STOP] Alle von dieser Konsole gestarteten lokalen Sniper-Prozesse beendet.'
}
if($global:LASTEXITCODE -eq 1){exit 1}
