#!/usr/bin/env bash
set -euo pipefail

# Updates pnpm dependency hash in flake.nix after pnpm-lock.yaml changes.
# Version is read dynamically from package.json.
# Usage: ./scripts/update-flake.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FLAKE_FILE="$PROJECT_ROOT/flake.nix"
PACKAGE_JSON="$PROJECT_ROOT/package.json"

# Every hash read and every hash rewrite below is confined to this sed address
# range. flake.nix holds one fixed-output derivation today, so an unscoped
# `hash = "sha256-..."` happens to hit the right line; the moment a second FOD
# is added, an unscoped script would stamp the placeholder over both, extract
# whichever mismatch Nix reported first, and write pnpmDeps' hash into the
# other derivation. Scoping is what keeps that from being a silent corruption.
PNPM_DEPS_BLOCK='/pnpmDeps = /,/};/'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect OS and set sed in-place flag
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed) requires empty string argument for -i
  SED_INPLACE=(-i '')
else
  # Linux (GNU sed)
  SED_INPLACE=(-i)
fi

echo -e "${BLUE}==> Updating flake.nix pnpm dependency hash...${NC}"
echo ""

# Extract version from package.json
VERSION=$(node -p "require('$PACKAGE_JSON').version")
echo -e "${BLUE}📦 Detected package version:${NC} $VERSION"

# Verify flake.nix uses dynamic version
if ! grep -q "(builtins.fromJSON (builtins.readFile ./package.json)).version" "$FLAKE_FILE"; then
  echo -e "${YELLOW}⚠️  Warning: flake.nix doesn't use dynamic version from package.json${NC}"
  echo -e "   Expected pattern: version = (builtins.fromJSON (builtins.readFile ./package.json)).version;"
  echo ""
fi

# Check if pnpm-lock.yaml exists
if [ ! -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
  echo -e "${RED}❌ Error: pnpm-lock.yaml not found${NC}"
  exit 1
fi

echo -e "${BLUE}🔧 Current pnpm-lock.yaml:${NC} $(stat -c%y "$PROJECT_ROOT/pnpm-lock.yaml" 2>/dev/null || stat -f%Sm "$PROJECT_ROOT/pnpm-lock.yaml")"
echo ""

# Get current pnpmDeps hash from flake.nix
CURRENT_HASH=$(sed -nE "$PNPM_DEPS_BLOCK"' s/.*hash = "(sha256-[^"]+)".*/\1/p' "$FLAKE_FILE" | head -1)
if [ -z "$CURRENT_HASH" ]; then
  echo -e "${RED}❌ Error: no pnpmDeps hash found in flake.nix${NC}"
  echo -e "   Looked for 'hash = \"sha256-...\"' inside the 'pnpmDeps = ... };' block."
  echo -e "   Nothing was modified."
  exit 1
fi
echo -e "${BLUE}📌 Current hash:${NC} $CURRENT_HASH"
echo ""

# Set placeholder hash to trigger error
echo -e "${YELLOW}⏳ Setting placeholder hash to calculate correct value...${NC}"
PLACEHOLDER="sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
sed "${SED_INPLACE[@]}" "$PNPM_DEPS_BLOCK s|hash = \"sha256-[^\"]*\"|hash = \"$PLACEHOLDER\"|" "$FLAKE_FILE"

# Try to build and capture the correct hash
echo -e "${BLUE}🔨 Building to determine correct hash (expected to fail)...${NC}"
BUILD_OUTPUT=$(nix build --no-link 2>&1 || true)

# Extract the correct hash from error output
# Try multiple patterns for compatibility with different Nix versions
CORRECT_HASH=$(echo "$BUILD_OUTPUT" | sed -nE 's/.*got:[[:space:]]*(sha256-[A-Za-z0-9+/=]+).*/\1/p' | head -1)
if [ -z "$CORRECT_HASH" ]; then
  CORRECT_HASH=$(echo "$BUILD_OUTPUT" | sed -nE 's/.*got:.*(sha256-[A-Za-z0-9+/=]+).*/\1/p' | head -1)
fi

if [ -z "$CORRECT_HASH" ]; then
  echo -e "${RED}❌ Error: Could not extract hash from build output${NC}"
  echo ""
  echo -e "${YELLOW}Build output:${NC}"
  echo "$BUILD_OUTPUT"
  echo ""
  echo -e "${YELLOW}Restoring original hash...${NC}"
  sed "${SED_INPLACE[@]}" "$PNPM_DEPS_BLOCK s|hash = \"$PLACEHOLDER\"|hash = \"$CURRENT_HASH\"|" "$FLAKE_FILE"
  exit 1
fi

echo -e "${GREEN}✓ Calculated hash:${NC} $CORRECT_HASH"
echo ""

# Check if hash changed
if [ "$CURRENT_HASH" = "$CORRECT_HASH" ]; then
  echo -e "${GREEN}✓ Hash is already up-to-date!${NC}"
  sed "${SED_INPLACE[@]}" "$PNPM_DEPS_BLOCK s|hash = \"$PLACEHOLDER\"|hash = \"$CORRECT_HASH\"|" "$FLAKE_FILE"
  echo ""
  echo -e "${BLUE}ℹ️  No changes needed. Your flake is in sync with pnpm-lock.yaml${NC}"
  exit 0
fi

echo -e "${YELLOW}🔄 Updating hash in flake.nix...${NC}"
sed "${SED_INPLACE[@]}" "$PNPM_DEPS_BLOCK s|hash = \"$PLACEHOLDER\"|hash = \"$CORRECT_HASH\"|" "$FLAKE_FILE"

# Verify the build works
echo -e "${BLUE}🔍 Verifying build with new hash...${NC}"
BUILD_OUTPUT=$(nix build --no-link 2>&1) && BUILD_SUCCESS=true || BUILD_SUCCESS=false
if [ "$BUILD_SUCCESS" = false ]; then
  echo -e "${RED}❌ Build verification failed!${NC}"
  echo ""
  echo "$BUILD_OUTPUT"
  exit 1
fi
if echo "$BUILD_OUTPUT" | grep -q "warning: Git tree.*is dirty"; then
  echo -e "${YELLOW}⚠️  Git tree is dirty, but build succeeded${NC}"
else
  echo -e "${GREEN}✓ Build verification successful${NC}"
fi
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ flake.nix updated successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   Version:    $VERSION ${YELLOW}(read dynamically from package.json)${NC}"
echo -e "   Old hash:   $CURRENT_HASH"
echo -e "   New hash:   $CORRECT_HASH"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "   1. Test:   ${GREEN}nix run . -- --version${NC}"
echo -e "   2. Verify: ${GREEN}nix flake check${NC}"
echo -e "   3. Commit: ${GREEN}git add flake.nix${NC}"
echo ""
