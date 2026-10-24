#!/usr/bin/env bash
# Runs every CLI test (each test file that uses runCLI) against a standalone
# binary instead of `node dist/cli/index.js`. Needs `pnpm install`.
#
#   bash scripts/binary/e2e.sh dist-bin/openspec-<asset>
set -euo pipefail

files=()
while IFS= read -r file; do files+=("$file"); done < <(grep -rl 'runCLI' test | grep '\.test\.ts$' | sort)
# Without files vitest would run the whole suite and prove nothing about $1.
[ "${#files[@]}" -gt 0 ] || { echo "No CLI test files found" >&2; exit 1; }
echo "Running ${#files[@]} CLI test files against $1"
OPENSPEC_TEST_BINARY="$1" pnpm exec vitest run "${files[@]}"
