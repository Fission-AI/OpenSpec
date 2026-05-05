#!/bin/bash

# Test script for postinstall.js
# Tests different scenarios: normal install, CI, opt-out, PATH hints

set -e

echo "======================================"
echo "Testing OpenSpec Postinstall Script"
echo "======================================"
echo ""

# Save original environment
ORIGINAL_CI="${CI:-}"
ORIGINAL_OPENSPEC_NO_COMPLETIONS="${OPENSPEC_NO_COMPLETIONS:-}"
ORIGINAL_NPM_CONFIG_GLOBAL="${npm_config_global:-}"
ORIGINAL_NPM_CONFIG_PREFIX="${npm_config_prefix:-}"
ORIGINAL_PATH="$PATH"
NODE_BIN="$(command -v node)"

# Test 1: Normal install
echo "Test 1: Normal install (should print tip about completions)"
echo "--------------------------------------"
unset CI
unset OPENSPEC_NO_COMPLETIONS
node scripts/postinstall.js
echo ""

# Test 2: Global install with CLI bin missing from PATH (should print PATH hint)
echo "Test 2: Global install with CLI bin missing from PATH (should print PATH hint)"
echo "--------------------------------------"
TMP_PREFIX="$(mktemp -d)"
TMP_HOME="$(mktemp -d)"
mkdir -p "$TMP_PREFIX/bin"
printf '#!/bin/sh\nexit 0\n' > "$TMP_PREFIX/bin/openspec"
chmod +x "$TMP_PREFIX/bin/openspec"
unset CI
unset OPENSPEC_NO_COMPLETIONS
export npm_config_global=true
export npm_config_prefix="$TMP_PREFIX"
HOME="$TMP_HOME" PNPM_HOME="$TMP_HOME/no-pnpm" PATH="/usr/bin:/bin" "$NODE_BIN" scripts/postinstall.js
rm -rf "$TMP_PREFIX"
rm -rf "$TMP_HOME"
unset npm_config_global
unset npm_config_prefix
export PATH="$ORIGINAL_PATH"
echo ""

# Test 3: CI environment (should skip silently)
echo "Test 3: CI=true (should skip silently)"
echo "--------------------------------------"
export CI=true
node scripts/postinstall.js
echo "[No output expected - skipped due to CI]"
echo ""

# Test 4: Opt-out flag (should skip silently)
echo "Test 4: OPENSPEC_NO_COMPLETIONS=1 (should skip silently)"
echo "--------------------------------------"
unset CI
export OPENSPEC_NO_COMPLETIONS=1
node scripts/postinstall.js
echo "[No output expected - skipped due to opt-out]"
echo ""

# Restore original environment
if [ -n "$ORIGINAL_CI" ]; then
  export CI="$ORIGINAL_CI"
else
  unset CI
fi

if [ -n "$ORIGINAL_OPENSPEC_NO_COMPLETIONS" ]; then
  export OPENSPEC_NO_COMPLETIONS="$ORIGINAL_OPENSPEC_NO_COMPLETIONS"
else
  unset OPENSPEC_NO_COMPLETIONS
fi

if [ -n "$ORIGINAL_NPM_CONFIG_GLOBAL" ]; then
  export npm_config_global="$ORIGINAL_NPM_CONFIG_GLOBAL"
else
  unset npm_config_global
fi

if [ -n "$ORIGINAL_NPM_CONFIG_PREFIX" ]; then
  export npm_config_prefix="$ORIGINAL_NPM_CONFIG_PREFIX"
else
  unset npm_config_prefix
fi

export PATH="$ORIGINAL_PATH"

echo "======================================"
echo "All tests completed successfully!"
echo "======================================"
