#!/bin/sh
# Installs the standalone `openspec` binary (no Node.js needed) on Linux or macOS.
#
#   curl -fsSL https://openspec.dev/install.sh | sh
#
# OPENSPEC_VERSION      release to install (default: the newest complete one), e.g. v1.15.0
# OPENSPEC_INSTALL_DIR  where to put it (default: ~/.local/bin)
# OPENSPEC_INSTALL_NAME file name to install as (default: openspec)
# OPENSPEC_RELEASES_URL releases page to install from (default: GitHub's; mirrors, testing)
# OPENSPEC_DOWNLOAD_URL one folder holding the release files (mirrors, testing)
set -eu

fail() { echo "openspec install: $*" >&2; exit 1; }

# The binary and SHA256SUMS come from the same place, so a remote plain HTTP
# source could swap both: only https, or http to this machine. The host is
# parsed, not prefix-matched: http://localhost:80@evil.example/ names
# evil.example, so anything with a user part is refused.
check_source() {
  case "$2" in
    https://*) scheme=https authority=${2#https://} ;;
    http://*) scheme=http authority=${2#http://} ;;
    *) fail "$1 must use https (or http to localhost): $2" ;;
  esac
  authority=${authority%%/*}
  authority=${authority%%\?*}
  authority=${authority%%#*}
  case "$authority" in *@*) fail "$1 must use https (or http to localhost): $2" ;; esac
  [ "$scheme" = https ] && return 0
  host=$authority
  case "$authority" in
    "[::1]:"* | localhost:* | 127.0.0.1:*)
      host=${authority%:*}
      case "${authority##*:}" in "" | *[!0-9]*) fail "$1 has an invalid port: $2" ;; esac
      ;;
  esac
  case "$host" in
    localhost | 127.0.0.1 | "[::1]") return 0 ;;
    *) fail "$1 must use https (or http to localhost): $2" ;;
  esac
}

# Everything runs from main, so a download cut short while piped into sh
# runs nothing instead of half a script.
main() {
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) fail "unsupported OS $(uname -s). On Windows, use install.ps1." ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) fail "unsupported CPU $(uname -m). Install with npm instead: npm install -g @fission-ai/openspec" ;;
  esac
  # An x64 shell under Rosetta still runs on an Apple Silicon Mac.
  if [ "$os" = darwin ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ]; then
    arch=arm64
  fi
  asset="openspec-$os-$arch"
  # Alpine and other musl distros cannot run the glibc build. Ask glibc first:
  # a glibc system can have musl installed alongside, loader and all.
  if [ "$os" = linux ] && ! getconf GNU_LIBC_VERSION >/dev/null 2>&1 &&
    { ldd --version 2>&1 | grep -qi musl || ls /lib/ld-musl-* >/dev/null 2>&1; }; then
    asset="$asset-musl"
  fi

  version="${OPENSPEC_VERSION:-latest}"
  case "$version" in latest | v*) ;; *) version="v$version" ;; esac
  releases="${OPENSPEC_RELEASES_URL:-https://github.com/Fission-AI/OpenSpec/releases}"
  releases=${releases%/}
  check_source OPENSPEC_RELEASES_URL "$releases"
  if [ -n "${OPENSPEC_DOWNLOAD_URL:-}" ]; then
    check_source OPENSPEC_DOWNLOAD_URL "$OPENSPEC_DOWNLOAD_URL"
  fi
  if [ -n "${OPENSPEC_INSTALL_DIR:-}" ]; then
    dir="$OPENSPEC_INSTALL_DIR"
  elif [ -n "${HOME:-}" ]; then
    dir="$HOME/.local/bin"
  else
    fail "HOME is not set; set OPENSPEC_INSTALL_DIR to choose where to install"
  fi

  # Staged inside the install dir, not /tmp: /tmp is often mounted noexec, and
  # a same-filesystem mv replaces an existing copy atomically.
  mkdir -p "$dir" || fail "cannot create $dir"
  # Absolute, so the PATH advice below works from any directory.
  dir=$(cd "$dir" && pwd) || fail "cannot use $dir"
  name="${OPENSPEC_INSTALL_NAME:-openspec}"
  tmp=$(mktemp -d "$dir/.openspec-install.XXXXXX") || fail "cannot write to $dir"
  trap 'rm -rf "$tmp"' EXIT
  download() {
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL --retry 3 -o "$2" "$1"
    elif command -v wget >/dev/null 2>&1; then
      wget -q -O "$2" "$1"
    else
      fail "curl or wget is required"
    fi
  }
  fetch() {
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL --retry 3 "$1"
    elif command -v wget >/dev/null 2>&1; then
      wget -q -O - "$1"
    else
      fail "curl or wget is required"
    fi
  }

  npm_hint="or install with npm (Node.js 20.19+): npm install -g @fission-ai/openspec"
  if [ -n "${OPENSPEC_DOWNLOAD_URL:-}" ]; then
    base=${OPENSPEC_DOWNLOAD_URL%/}
  elif [ "$version" != latest ]; then
    base="$releases/download/$version"
  else
    # The newest stable release whose files are all attached. GitHub calls a
    # release "latest" the moment it is published, minutes before the Binaries
    # workflow attaches the files (and for good, if that fails), so "latest"
    # is not trusted. SHA256SUMS is uploaded last: a release that has it is
    # complete.
    newest=""
    tags=$(fetch "$releases.atom" 2>/dev/null |
      grep -o '/releases/tag/v[0-9]*\.[0-9]*\.[0-9]*"' | sed 's#.*/tag/##; s/"$//' | awk '!seen[$0]++') || tags=""
    for tag in $tags; do
      [ -n "$newest" ] || newest=$tag
      if download "$releases/download/$tag/SHA256SUMS" "$tmp/SHA256SUMS" 2>/dev/null; then
        version=$tag
        break
      fi
    done
    if [ "$version" = latest ]; then
      fail "found no release with the standalone files at $releases; $npm_hint"
    fi
    if [ "$version" != "$newest" ]; then
      echo "$newest is still being prepared; installing $version."
    fi
    base="$releases/download/$version"
  fi

  if [ ! -s "$tmp/SHA256SUMS" ]; then
    download "$base/SHA256SUMS" "$tmp/SHA256SUMS" || fail "could not download $base/SHA256SUMS; $npm_hint"
  fi

  # Releases ship a .tar.gz; v1.15.0 and earlier, the bare binary.
  file="$asset.tar.gz"
  expected=$(awk -v f="$file" '$2 == f { print $1 }' "$tmp/SHA256SUMS")
  if [ -z "$expected" ]; then
    file=$asset
    expected=$(awk -v f="$file" '$2 == f { print $1 }' "$tmp/SHA256SUMS")
  fi
  [ -n "$expected" ] || fail "$asset is not listed in SHA256SUMS"

  echo "Downloading $file ($version)..."
  download "$base/$file" "$tmp/$file" || fail "could not download $base/$file; $npm_hint"
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$tmp/$file" | awk '{ print $1 }')
  else
    actual=$(shasum -a 256 "$tmp/$file" | awk '{ print $1 }')
  fi
  [ "$actual" = "$expected" ] || fail "checksum mismatch for $file; refusing to install"

  if [ "$file" != "$asset" ]; then
    mkdir "$tmp/unpacked"
    tar -xzf "$tmp/$file" -C "$tmp/unpacked" openspec || fail "could not unpack $file"
    mv "$tmp/unpacked/openspec" "$tmp/$asset"
  fi
  chmod 755 "$tmp/$asset"
  if ! installed=$("$tmp/$asset" --version); then
    case "$asset" in
      *-musl) fail "$asset needs the C++ runtime (Alpine 3.17+): apk add libstdc++ libgcc" ;;
      openspec-darwin-*) fail "$asset needs macOS 13 or later" ;;
      *) fail "the downloaded $asset does not run on this machine" ;;
    esac
  fi
  mv -f "$tmp/$asset" "$dir/$name"
  echo "Installed openspec $installed to $dir/$name"

  case ":$PATH:" in
    *":$dir:"*) ;;
    *) echo "Add $dir to your PATH to run it, e.g.: export PATH=\"$dir:\$PATH\"" ;;
  esac
}

main "$@"
