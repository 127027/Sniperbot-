# Windows PowerShell 5.1 supervisor: one console, two local Node processes.
# LIVE TRADING NOT SUPPORTED. Public-market GitHub token belongs only to collector.
param(
  [switch]$ResetToken,
  [switch]$SelfTest,
  [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$paperUrl = 'http://127.0.0.1:3030'
$tokenFile = Join-Path $env:LOCALAPPDATA 'MemeSniperPaper\secrets\research-github-token.dpapi'
$job = [IntPtr]::Zero
$mutex = $null
$ownsMutex = $false
$bot = $null
$market = $null

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
  if($role -eq 'BOT') {
    $info.EnvironmentVariables['SNIPER_RESEARCH_FEED'] = '1'
    $info.EnvironmentVariables['SNIPER_LOCAL_DISCOVERY'] = '0'
  }
  if($role -eq 'MARKET') {
    $value = Read-ResearchToken
    $info.EnvironmentVariables['SNIPER_MARKET_GITHUB_TOKEN'] = $value
    $info.EnvironmentVariables['SNIPER_MARKET_PUBLISH'] = '1'
    $value = $null
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
  Write-Host 'WINDOWS_SUPERVISOR_SELF_TEST_OK (DPAPI, job assignment, graceful exit)' -ForegroundColor Green
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
  Initialize-ResearchToken
  $job=[SniperWindowsJob]::OpenKillOnClose()
  $bot=Start-Child 'BOT' 'runner/server.mjs' $node $job
  $market=Start-Child 'MARKET' 'runner/research-market-daemon.mjs' $node $job
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
  Write-Host '[OK] Beide lokalen Komponenten gestartet. Github-Zugang nur fuer Markt-Collector.' -ForegroundColor Green
  Write-Host '[INFO] Die fuenf Cloud-Dots laufen weiterhin unabhaengig.'
  Write-Host '[INFO] Zum Beenden Q druecken oder dieses Fenster schliessen.'
  $restarts=@{BOT=0;MARKET=0}
  while($true){
    if($bot.HasExited){
      $restarts.BOT++
      if($restarts.BOT -gt 3){throw 'Paper-Bot 3x unerwartet beendet. Alles wird gestoppt.'}
      Write-Host ('[WARNUNG] Paper-Bot beendet. Neustart '+$restarts.BOT+'/3') -ForegroundColor Yellow
      Start-Sleep -Seconds ([Math]::Pow(2,$restarts.BOT))
      Assert-PortAvailable
      $bot=Start-Child 'BOT' 'runner/server.mjs' $node $job
    }
    if($market.HasExited){
      $restarts.MARKET++
      if($restarts.MARKET -gt 3){throw 'Markt-Collector 3x unerwartet beendet. Alles wird gestoppt.'}
      Write-Host ('[WARNUNG] Markt-Collector beendet. Neustart '+$restarts.MARKET+'/3') -ForegroundColor Yellow
      Start-Sleep -Seconds ([Math]::Pow(2,$restarts.MARKET))
      $market=Start-Child 'MARKET' 'runner/research-market-daemon.mjs' $node $job
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
