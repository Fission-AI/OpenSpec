# Installs the standalone `openspec.exe` (no Node.js needed) on Windows.
#
#   irm https://github.com/Fission-AI/OpenSpec/releases/latest/download/install.ps1 | iex
#
# $env:OPENSPEC_VERSION      release to install (default: latest), e.g. v1.15.0
# $env:OPENSPEC_INSTALL_DIR  where to put it (default: %LOCALAPPDATA%\Programs\openspec)
# $env:OPENSPEC_DOWNLOAD_URL base URL of the release assets (mirrors, testing)
#
# Runs in Windows PowerShell 5.1 and PowerShell 7. It throws instead of
# calling exit, which would close the window of anyone who piped it into iex.
& {
  $ErrorActionPreference = 'Stop'
  # Windows PowerShell 5.1 may default to TLS 1.0, which GitHub refuses, and
  # draws a progress bar that slows downloads many times over.
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $ProgressPreference = 'SilentlyContinue'

  # The OS architecture, not this PowerShell's: an x64 shell on an ARM PC
  # should still get the native ARM build.
  $arch = switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
    'X64' { 'x64' }
    'Arm64' { 'arm64' }
    default { throw "openspec install: unsupported CPU $_. Install with npm instead: npm install -g @fission-ai/openspec" }
  }
  $asset = "openspec-windows-$arch.exe"

  $version = if ($env:OPENSPEC_VERSION) { $env:OPENSPEC_VERSION } else { 'latest' }
  if ($version -ne 'latest' -and -not $version.StartsWith('v')) { $version = "v$version" }
  $base = if ($env:OPENSPEC_DOWNLOAD_URL) {
    $env:OPENSPEC_DOWNLOAD_URL
  } elseif ($version -eq 'latest') {
    'https://github.com/Fission-AI/OpenSpec/releases/latest/download'
  } else {
    "https://github.com/Fission-AI/OpenSpec/releases/download/$version"
  }
  $dir = if ($env:OPENSPEC_INSTALL_DIR) { $env:OPENSPEC_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\openspec' }

  # Staged inside the install dir so the final move is a same-volume rename.
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $tmp = Join-Path $dir ('.openspec-install-' + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    Write-Host "Downloading $asset ($version)..."
    $exe = Join-Path $tmp $asset
    $sums = Join-Path $tmp 'SHA256SUMS'
    try {
      Invoke-WebRequest -UseBasicParsing -Uri "$base/$asset" -OutFile $exe
      Invoke-WebRequest -UseBasicParsing -Uri "$base/SHA256SUMS" -OutFile $sums
    } catch {
      throw "openspec install: could not download from ${base}: $($_.Exception.Message). Or install with npm (Node.js 20.19+): npm install -g @fission-ai/openspec"
    }

    $line = Get-Content $sums | Where-Object { ($_ -split '\s+')[1] -eq $asset } | Select-Object -First 1
    if (-not $line) { throw "openspec install: $asset is not listed in SHA256SUMS" }
    $expected = ($line -split '\s+')[0]
    $actual = (Get-FileHash -Algorithm SHA256 -Path $exe).Hash
    if ($actual -ne $expected) { throw "openspec install: checksum mismatch for $asset; refusing to install" }

    $installed = $null
    # A binary that cannot start at all throws instead of setting an exit code.
    try { $installed = & $exe --version } catch { Write-Verbose "openspec --version failed: $_" }
    if ($LASTEXITCODE -ne 0 -or -not $installed) {
      throw "openspec install: the downloaded $asset does not run on this machine (needs Windows 10 or later)"
    }

    $target = Join-Path $dir 'openspec.exe'
    try {
      Move-Item -Force -Path $exe -Destination $target
    } catch {
      throw "openspec install: could not replace $target. Close any running openspec and try again."
    }
    Write-Host "Installed openspec $installed to $target"
  } finally {
    Remove-Item -Recurse -Force -Path $tmp -ErrorAction SilentlyContinue
  }

  # Unlike a shell profile, the user PATH is the standard place for this on
  # Windows. Only appended to, and only when missing. Read and written raw:
  # [Environment]::SetEnvironmentVariable would save it expanded, turning
  # entries like %USERPROFILE%\bin into fixed paths for good.
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
  try {
    $raw = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    $entries = @($raw -split ';' | Where-Object { $_ })
    if ($entries -notcontains $dir) {
      $key.SetValue('Path', (($entries + $dir) -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString)
      # Setting any user variable broadcasts the change, so new terminals see it.
      [Environment]::SetEnvironmentVariable('OPENSPEC_INSTALL_PATH_CHANGED', '1', 'User')
      [Environment]::SetEnvironmentVariable('OPENSPEC_INSTALL_PATH_CHANGED', $null, 'User')
      $env:Path = "$env:Path;$dir"
      Write-Host "Added $dir to your user PATH. Open a new terminal to use openspec everywhere."
    }
  } finally {
    $key.Close()
  }
}
