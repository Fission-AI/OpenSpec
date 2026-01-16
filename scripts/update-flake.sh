#!/usr/bin/env bash
set -euo pipefail

# Script to update flake.nix version and dependency hash
# Run this after updating package.json version

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FLAKE_FILE="$PROJECT_ROOT/flake.nix"
PACKAGE_JSON="$PROJECT_ROOT/package.json"

# Detect OS and set sed in-place flag
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed) requires empty string argument for -i
  SED_INPLACE=(-i '')
else
  # Linux (GNU sed)
  SED_INPLACE=(-i)
fi

echo "==> Updating flake.nix..."

# Extract version from package.json
VERSION=$(node -p "require('$PACKAGE_JSON').version")
echo "    Detected version: $VERSION"

# Update version in flake.nix
if ! grep -q "version = \"$VERSION\"" "$FLAKE_FILE"; then
  echo "    Updating version in flake.nix..."
  sed "${SED_INPLACE[@]}" "s|version = \"[^\"]*\"|version = \"$VERSION\"|" "$FLAKE_FILE"
else
  echo "    Version already up-to-date in flake.nix"
fi

# Set placeholder hash to trigger error
echo "    Setting placeholder hash..."
PLACEHOLDER="sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
sed "${SED_INPLACE[@]}" "s|hash = \"sha256-[^\"]*\"|hash = \"$PLACEHOLDER\"|" "$FLAKE_FILE"

# Try to build and capture the correct hash
echo "    Building to get correct hash (this will fail)..."
BUILD_OUTPUT=$(nix build 2>&1 || true)

# Extract the correct hash from error output
CORRECT_HASH=$(echo "$BUILD_OUTPUT" | grep -oP 'got:\s+\Ksha256-[A-Za-z0-9+/=]+' | head -1)

if [ -z "$CORRECT_HASH" ]; then
  echo "❌ Error: Could not extract hash from build output"
  echo "Build output:"
  echo "$BUILD_OUTPUT"
  exit 1
fi

echo "    Detected hash: $CORRECT_HASH"

# Update flake.nix with correct hash
sed "${SED_INPLACE[@]}" "s|hash = \"$PLACEHOLDER\"|hash = \"$CORRECT_HASH\"|" "$FLAKE_FILE"

# Verify the build works
echo "    Verifying build..."
if nix build 2>&1 | grep -q "warning: Git tree.*is dirty"; then
  echo "⚠️  Warning: Git tree is dirty, but build succeeded"
else
  echo "✅ Build successful"
fi

echo ""
echo "✅ flake.nix updated successfully!"
echo "   Version: $VERSION"
echo "   Hash: $CORRECT_HASH"
echo ""
echo "Next steps:"
echo "  1. Test: nix run . -- --version"
echo "  2. Commit: git add flake.nix"
echo "  3. Include in version bump commit"
