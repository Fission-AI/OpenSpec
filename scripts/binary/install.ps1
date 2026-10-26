# Installs the standalone `openspec.exe` (no Node.js needed) on Windows.
#
#   irm https://openspec.dev/install.ps1 | iex
#
# $env:OPENSPEC_VERSION      release to install (default: the newest complete one), e.g. v1.15.0
# $env:OPENSPEC_INSTALL_DIR  where to put it (default: %LOCALAPPDATA%\Programs\openspec)
# $env:OPENSPEC_INSTALL_NAME file name to install as (default: openspec.exe)
# $env:OPENSPEC_RELEASES_URL releases page to install from (default: GitHub's; mirrors, testing)
# $env:OPENSPEC_DOWNLOAD_URL one folder holding the release files (mirrors, testing)
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
  # The binary and SHA256SUMS come from the same place, so a remote plain HTTP
  # source could swap both: only https, or http to this machine. [Uri] parses
  # the host, so http://localhost:80@evil.example/ is evil.example, not loopback.
  function Assert-Source($label, $value) {
    $uri = $null
    if (-not [Uri]::TryCreate($value, 'Absolute', [ref]$uri) -or $uri.UserInfo -or
        -not ($uri.Scheme -eq 'https' -or ($uri.Scheme -eq 'http' -and $uri.IsLoopback))) {
      throw "openspec install: $label must use https (or http to localhost): $value"
    }
  }
  $releases = if ($env:OPENSPEC_RELEASES_URL) { $env:OPENSPEC_RELEASES_URL.TrimEnd('/') } else { 'https://github.com/Fission-AI/OpenSpec/releases' }
  Assert-Source 'OPENSPEC_RELEASES_URL' $releases
  if ($env:OPENSPEC_DOWNLOAD_URL) { Assert-Source 'OPENSPEC_DOWNLOAD_URL' $env:OPENSPEC_DOWNLOAD_URL }
  $npmHint = 'Or install with npm (Node.js 20.19+): npm install -g @fission-ai/openspec'
  $dir = if ($env:OPENSPEC_INSTALL_DIR) { $env:OPENSPEC_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\openspec' }
  # Absolute, so the user PATH entry works from any directory.
  $dir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($dir)
  $name = if ($env:OPENSPEC_INSTALL_NAME) { $env:OPENSPEC_INSTALL_NAME } else { 'openspec.exe' }

  # Staged inside the install dir so the final move is a same-volume rename.
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  # Copies set aside by an earlier upgrade, once nothing runs them any more.
  Get-ChildItem -Path $dir -Filter "$name.old-*" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue
  $tmp = Join-Path $dir ('.openspec-install-' + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    $exe = Join-Path $tmp $asset
    $sums = Join-Path $tmp 'SHA256SUMS'
    if ($env:OPENSPEC_DOWNLOAD_URL) {
      $base = $env:OPENSPEC_DOWNLOAD_URL.TrimEnd('/')
    } elseif ($version -ne 'latest') {
      $base = "$releases/download/$version"
    } else {
      # The newest stable release whose files are all attached. GitHub calls a
      # release "latest" the moment it is published, minutes before the
      # Binaries workflow attaches the files (and for good, if that fails), so
      # "latest" is not trusted. SHA256SUMS is uploaded last: a release that
      # has it is complete.
      $feed = ''
      try { $feed = (Invoke-WebRequest -UseBasicParsing -Uri "$releases.atom").Content } catch { Write-Verbose "No release feed: $_" }
      $tags = @([regex]::Matches($feed, '/releases/tag/(v\d+\.\d+\.\d+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
      foreach ($tag in $tags) {
        try {
          Invoke-WebRequest -UseBasicParsing -Uri "$releases/download/$tag/SHA256SUMS" -OutFile $sums
          $version = $tag
          break
        } catch {
          Write-Verbose "$tag is not complete yet: $_"
        }
      }
      if ($version -eq 'latest') { throw "openspec install: found no release with the standalone files at $releases. $npmHint" }
      if ($tags.Count -gt 0 -and $version -ne $tags[0]) { Write-Host "$($tags[0]) is still being prepared; installing $version." }
      $base = "$releases/download/$version"
    }

    try {
      if (-not (Test-Path $sums)) { Invoke-WebRequest -UseBasicParsing -Uri "$base/SHA256SUMS" -OutFile $sums }
    } catch {
      throw "openspec install: could not download from ${base}: $($_.Exception.Message). $npmHint"
    }

    # Releases ship a .zip; v1.15.0 and earlier, the bare .exe.
    $lines = Get-Content $sums
    $file = $null
    $expected = $null
    foreach ($candidate in "$($asset -replace '\.exe$', '.zip')", $asset) {
      $line = $lines | Where-Object { ($_ -split '\s+')[1] -eq $candidate } | Select-Object -First 1
      if ($line) { $file = $candidate; $expected = ($line -split '\s+')[0]; break }
    }
    if (-not $file) { throw "openspec install: $asset is not listed in SHA256SUMS" }

    Write-Host "Downloading $file ($version)..."
    $download = Join-Path $tmp $file
    try {
      Invoke-WebRequest -UseBasicParsing -Uri "$base/$file" -OutFile $download
    } catch {
      throw "openspec install: could not download from ${base}: $($_.Exception.Message). $npmHint"
    }
    $actual = (Get-FileHash -Algorithm SHA256 -Path $download).Hash
    if ($actual -ne $expected) { throw "openspec install: checksum mismatch for $file; refusing to install" }
    if ($file -ne $asset) {
      $unpacked = Join-Path $tmp 'unpacked'
      Expand-Archive -Path $download -DestinationPath $unpacked
      Move-Item -Path (Join-Path $unpacked 'openspec.exe') -Destination $exe
    }

    $installed = $null
    # A binary that cannot start at all throws instead of setting an exit code.
    try { $installed = & $exe --version } catch { Write-Verbose "openspec --version failed: $_" }
    if ($LASTEXITCODE -ne 0 -or -not $installed) {
      throw "openspec install: the downloaded $asset does not run on this machine (needs Windows 10 or later)"
    }

    $target = Join-Path $dir $name
    # Windows cannot overwrite a running exe, and `openspec install` runs this
    # from the very exe it replaces. Renaming a running exe is allowed, so the
    # old copy moves aside: deleted now, or by the next install if still running.
    $old = $null
    if (Test-Path $target) {
      $old = "$target.old-" + [Guid]::NewGuid().ToString('N')
      Rename-Item -Path $target -NewName (Split-Path $old -Leaf)
    }
    try {
      Move-Item -Path $exe -Destination $target
    } catch {
      if ($old) { Rename-Item -Path $old -NewName $name -ErrorAction SilentlyContinue }
      throw "openspec install: could not install to ${target}: $($_.Exception.Message)"
    }
    if ($old) { Remove-Item -Force -Path $old -ErrorAction SilentlyContinue }
    # Clear any "downloaded from the internet" mark so Windows does not block it.
    Unblock-File -Path $target -ErrorAction SilentlyContinue
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
