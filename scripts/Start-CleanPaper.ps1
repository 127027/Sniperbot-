$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ required' }
if (-not $env:GITHUB_TOKEN) {
  $secret = Read-Host 'GitHub token (Contents read/write on 127027/Sniperbot-)' -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { $env:GITHUB_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
$env:R29_MODE = 'PAPER'
node "$PSScriptRoot/../src/runner.mjs"
