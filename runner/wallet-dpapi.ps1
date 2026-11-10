# Windows user-scoped DPAPI cryptography bridge. STDIN only, no secret
# arguments, environment variables, files or GitHub transmission.
param([Parameter(Mandatory=$true)][ValidateSet('protect','unprotect')][string]$Mode)
$ErrorActionPreference='Stop'
$entropy=[Text.Encoding]::UTF8.GetBytes('MemeSniper.LocalWallet.DPAPI.v1')
$raw=[Console]::In.ReadToEnd()
if($raw.Length -lt 1 -or $raw.Length -gt 8192){throw 'INVALID_DPAPI_PAYLOAD_SIZE'}
$inputBytes=$null;$outputBytes=$null
try{
 if($Mode -eq 'protect'){
  $inputBytes=[Text.Encoding]::UTF8.GetBytes($raw)
  $outputBytes=[Security.Cryptography.ProtectedData]::Protect(
   $inputBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Convert]::ToBase64String($outputBytes))
 }else{
  $inputBytes=[Convert]::FromBase64String($raw)
  $outputBytes=[Security.Cryptography.ProtectedData]::Unprotect(
   $inputBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Text.Encoding]::UTF8.GetString($outputBytes))
 }
}finally{
 if($null -ne $inputBytes){[Array]::Clear($inputBytes,0,$inputBytes.Length)}
 if($null -ne $outputBytes){[Array]::Clear($outputBytes,0,$outputBytes.Length)}
 [Array]::Clear($entropy,0,$entropy.Length)
 $raw=$null
}
