#!/usr/bin/env bash
# Checks `openspec install` against a release served at OPENSPEC_DOWNLOAD_URL:
# run from the Node build, as an npm user would, and by the binary on itself,
# which reinstalls in place. Needs `pnpm build`.
#
#   OPENSPEC_DOWNLOAD_URL=http://127.0.0.1:8766 bash scripts/binary/install-check.sh dist-bin/openspec-<asset>
set -euo pipefail

asset=$1
ext=""
case "$asset" in *.exe) ext=".exe" ;; esac
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export XDG_CONFIG_HOME="$work/config" XDG_DATA_HOME="$work/data" OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1
fail() { echo "FAIL: $*" >&2; exit 1; }

# 1. From the Node build, into a fresh folder.
OPENSPEC_INSTALL_DIR="$work/from-node" node bin/openspec.js install
cmp "$work/from-node/openspec$ext" "$asset" || fail "install from Node wrote the wrong file"
"$work/from-node/openspec$ext" version | grep -q '(standalone)' || fail "installed copy is not standalone"

# 2. The binary replacing itself where it is, under its own (custom) name.
# Twice: on Windows the running exe is set aside, and the next run removes it.
mkdir "$work/self"
self="$work/self/my-openspec$ext"
cp "$asset" "$self"
for run in 1 2; do
  out=$(env -u OPENSPEC_INSTALL_DIR -u OPENSPEC_INSTALL_NAME "$self" install 2>&1) || fail "self-install run $run failed: $out"
  case "$out" in *"Installed openspec"*"my-openspec$ext"*) ;; *) fail "self-install run $run did not replace itself: $out" ;; esac
  cmp "$self" "$asset" || fail "self-install run $run wrote the wrong file"
done
"$self" version | grep -q '(standalone)' || fail "reinstalled copy is not standalone"
leftovers=$(find "$work/self" -mindepth 1 -maxdepth 1 ! -name "my-openspec$ext" | wc -l | tr -d ' ')
[ "$leftovers" -le 1 ] || fail "files pile up next to the binary: $(ls -A "$work/self")"

echo "OK: openspec install ($asset)"
