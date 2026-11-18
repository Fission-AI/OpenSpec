# Checks how install.ps1 handles a downloaded exe that Windows keeps locked:
# a short lock is waited out, and one that never clears keeps the installed copy.
#
#   install-lock-check.ps1 -Url http://127.0.0.1:8765 -Asset dist-bin\openspec-windows-x64.exe -Dir <new folder>
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Asset,
  [Parameter(Mandatory = $true)][string]$Dir
)
$ErrorActionPreference = 'Stop'

$script:lockedTarget = Join-Path $Dir 'openspec.exe'
$script:locksLeft = 0

# Stands in for the cmdlet while install.ps1 runs in this session.
function Move-Item($Path, $Destination) {
  if ($Destination -eq $script:lockedTarget -and $script:locksLeft -gt 0) {
    $script:locksLeft--
    throw 'The process cannot access the file because it is being used by another process.'
  }
  Microsoft.PowerShell.Management\Move-Item -Path $Path -Destination $Destination
}

function Install-WithLocks($Count) {
  $script:locksLeft = $Count
  $env:OPENSPEC_DOWNLOAD_URL = $Url
  $env:OPENSPEC_INSTALL_DIR = $Dir
  Invoke-RestMethod "$Url/install.ps1" | Invoke-Expression
}

function Assert-Installed {
  if ((Get-FileHash $script:lockedTarget).Hash -ne (Get-FileHash $Asset).Hash) { throw 'the installed copy is not the expected file' }
}

Install-WithLocks 3
if ($script:locksLeft -ne 0) { throw 'the install did not reach the locked move' }
Assert-Installed

$message = $null
try { Install-WithLocks 1000 } catch { $message = "$_" }
if ($message -notmatch 'could not install to') { throw "a lasting lock did not report the failure: $message" }
Assert-Installed
if (Get-ChildItem -Path $Dir -Filter 'openspec.exe.old-*') { throw 'a lasting lock left the old copy set aside' }

Write-Host 'OK: install.ps1 handles a locked file'
