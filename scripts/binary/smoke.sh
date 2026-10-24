#!/usr/bin/env bash
# Smoke-tests a standalone binary from build.mjs: version, built-in schemas,
# and a real init → change → status → instructions run in a scratch project.
#
#   bash scripts/binary/smoke.sh dist-bin/openspec-<os>-<arch>
set -euo pipefail

expected=$(sed -nE 's/^  "version": "([^"]+)".*/\1/p' "$(dirname "$0")/../../package.json")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Run it from, and keep its data under, paths with a space and non-ASCII
# characters, as on a machine whose user name has them. Renamed too, as a
# user would after downloading.
mkdir -p "$work/bin dir ü"
bin="$work/bin dir ü/openspec"
case "$1" in *.exe) bin="$bin.exe" ;; esac
cp "$1" "$bin"

# Keep the run off the user's real config and data, and offline.
export XDG_CONFIG_HOME="$work/config ü" XDG_DATA_HOME="$work/data ü"
export OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1 NO_COLOR=1
mkdir "$work/project" && cd "$work/project"

fail() { echo "FAIL: $*" >&2; exit 1; }

version=$("$bin" --version)
[ "$version" = "$expected" ] || fail "--version printed '$version', expected '$expected'"

"$bin" schemas --json | grep -q '"source": "package"' || fail "built-in schema not found"
"$bin" init --tools claude > /dev/null
[ -f openspec/config.yaml ] || fail "init did not write openspec/config.yaml"
"$bin" new change demo > /dev/null
"$bin" status --change demo --json | grep -q '"schemaName": "spec-driven"' || fail "status did not resolve the schema"
"$bin" instructions proposal --change demo | grep -q '<template>' || fail "instructions missing the proposal template"

# A damaged copy of the extracted schemas is repaired, not trusted.
find "$XDG_DATA_HOME" -path '*binary-schemas*' -name proposal.md -delete
"$bin" instructions proposal --change demo | grep -q '<template>' || fail "damaged schema copy was not repaired"

# The CLI must run once per invocation, not once per entry point.
[ "$("$bin" schemas | grep -c 'Available schemas')" = 1 ] || fail "CLI ran more than once"

echo "OK: $(basename "$1") ($version)"
