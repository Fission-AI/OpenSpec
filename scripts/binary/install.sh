#!/bin/sh
# Installs the standalone `openspec` binary (no Node.js needed) on Linux or macOS.
#
#   curl -fsSL https://github.com/Fission-AI/OpenSpec/releases/latest/download/install.sh | sh
#
# OPENSPEC_VERSION      release to install (default: latest), e.g. v1.15.0
# OPENSPEC_INSTALL_DIR  where to put it (default: ~/.local/bin)
# OPENSPEC_DOWNLOAD_URL base URL of the release assets (mirrors, testing)
set -eu

fail() { echo "openspec install: $*" >&2; exit 1; }

# Everything runs from main, so a download cut short while piped into sh
# runs nothing instead of half a script.
main() {
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) fail "unsupported OS $(uname -s). On Windows, download openspec-windows-x64.exe from the release page." ;;
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
  if [ -n "${OPENSPEC_DOWNLOAD_URL:-}" ]; then
    base="$OPENSPEC_DOWNLOAD_URL"
  elif [ "$version" = latest ]; then
    base="https://github.com/Fission-AI/OpenSpec/releases/latest/download"
  else
    base="https://github.com/Fission-AI/OpenSpec/releases/download/$version"
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

  echo "Downloading $asset ($version)..."
  npm_hint="or install with npm (Node.js 20.19+): npm install -g @fission-ai/openspec"
  download "$base/$asset" "$tmp/$asset" || fail "could not download $base/$asset; $npm_hint"
  download "$base/SHA256SUMS" "$tmp/SHA256SUMS" || fail "could not download $base/SHA256SUMS; $npm_hint"

  expected=$(awk -v f="$asset" '$2 == f { print $1 }' "$tmp/SHA256SUMS")
  [ -n "$expected" ] || fail "$asset is not listed in SHA256SUMS"
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$tmp/$asset" | awk '{ print $1 }')
  else
    actual=$(shasum -a 256 "$tmp/$asset" | awk '{ print $1 }')
  fi
  [ "$actual" = "$expected" ] || fail "checksum mismatch for $asset; refusing to install"

  chmod 755 "$tmp/$asset"
  if ! installed=$("$tmp/$asset" --version); then
    case "$asset" in
      *-musl) fail "$asset needs the C++ runtime (Alpine 3.17+): apk add libstdc++ libgcc" ;;
      openspec-darwin-*) fail "$asset needs macOS 13 or later" ;;
      *) fail "the downloaded $asset does not run on this machine" ;;
    esac
  fi
  mv -f "$tmp/$asset" "$dir/openspec"
  echo "Installed openspec $installed to $dir/openspec"

  case ":$PATH:" in
    *":$dir:"*) ;;
    *) echo "Add $dir to your PATH to run it, e.g.: export PATH=\"$dir:\$PATH\"" ;;
  esac
}

main "$@"
