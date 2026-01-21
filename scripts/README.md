# OpenSpec Scripts

Utility scripts for OpenSpec maintenance and development.

## update-flake.sh

Updates `flake.nix` version and dependency hash automatically.

**When to use**: After updating dependencies or releasing a new version.

**Usage**:
```bash
./scripts/update-flake.sh
```

**What it does**:
1. Extracts version from `package.json`
2. Updates version in `flake.nix`
3. Automatically determines the correct pnpm dependency hash
4. Updates the hash in `flake.nix`
5. Verifies the build succeeds

**Example workflow**:
```bash
# After version bump and dependency updates
pnpm install
./scripts/update-flake.sh
git add flake.nix
git commit -m "chore: update flake.nix for v0.18.0"
```

## postinstall.js

Post-installation script that runs after package installation.

## pack-version-check.mjs

Validates package version consistency before publishing.
