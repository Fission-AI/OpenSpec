## Why

Maintaining the Nix flake requires manual updates to version and dependency hash when releasing new versions or updating dependencies. This is error-prone and requires maintainers to understand Nix internals. Automating this process ensures consistency and reduces friction for releases.

## What Changes

- Add `scripts/update-flake.sh` to automatically update flake.nix version and dependency hash
- Add `scripts/README.md` documenting all maintenance scripts
- Script extracts version from package.json and determines correct pnpm dependency hash automatically

## Capabilities

### New Capabilities
- `flake-update-script`: Automation script for maintaining flake.nix

### Modified Capabilities
- None

## Impact

- **New files**: `scripts/update-flake.sh`, `scripts/README.md`
- **Maintainer workflow**: Version bumps now include running `./scripts/update-flake.sh`
- **Dependencies**: Script requires Node.js (already a dependency) and Nix (for maintainers using Nix)
