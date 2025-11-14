#!/bin/bash

# Test script for postinstall.js
# Tests different scenarios: normal install, CI, opt-out

set -e

echo "======================================"
echo "Testing OpenSpec Postinstall Script"
echo "======================================"
echo ""

# Save original environment
ORIGINAL_CI="${CI:-}"
ORIGINAL_OPENSPEC_NO_COMPLETIONS="${OPENSPEC_NO_COMPLETIONS:-}"

# Test 1: Normal install
echo "Test 1: Normal install (should attempt to install completions)"
echo "--------------------------------------"
unset CI
unset OPENSPEC_NO_COMPLETIONS
node scripts/postinstall.js
echo ""

# Test 2: CI environment (should skip silently)
echo "Test 2: CI=true (should skip silently)"
echo "--------------------------------------"
export CI=true
node scripts/postinstall.js
echo "[No output expected - skipped due to CI]"
echo ""

# Test 3: Opt-out flag (should skip silently)
echo "Test 3: OPENSPEC_NO_COMPLETIONS=1 (should skip silently)"
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

echo "======================================"
echo "All tests completed successfully!"
echo "======================================"
