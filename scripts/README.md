# OpenSpec Scripts

Utility scripts for OpenSpec maintenance and development.

## update-flake.sh

Updates `flake.nix` pnpm dependency hash automatically.

**When to use**: After updating dependencies (`pnpm install`, `pnpm update`).

**Usage**:
```bash
./scripts/update-flake.sh
```

**What it does**:
1. Reads version from `package.json` (dynamically used by `flake.nix`)
2. Automatically determines the correct pnpm dependency hash
3. Updates the hash in `flake.nix`
4. Verifies the build succeeds

**Example workflow**:
```bash
# After dependency updates
pnpm install
./scripts/update-flake.sh
git add flake.nix
git commit -m "chore: update flake.nix dependency hash"
```

## postinstall.js

Post-installation script that runs after package installation.

## pack-version-check.mjs

Validates package version consistency before publishing.

## ralph-roadmap.sh

Runs `ROADMAP.md` in an autonomous Codex loop.

What it does:
1. Picks the first incomplete roadmap phase
2. Runs that phase in a fresh `codex exec` implementation context
3. Runs the same phase in a fresh verification context
4. Runs the same phase in a fresh manual-test context
5. Repeats until the phase is complete, then moves to the next phase
6. Continues until the roadmap is complete

Defaults:
- model: `gpt-5.4`
- reasoning effort: `xhigh`
- run cap: unlimited
- phase cycle cap: unlimited

Quick checks without running the loop:
```bash
bash -n ./scripts/ralph-roadmap.sh
./scripts/ralph-roadmap.sh --validate
./scripts/ralph-roadmap.sh --dry-run
./scripts/ralph-roadmap.sh --help
```

Typical usage:
```bash
./scripts/ralph-roadmap.sh
./scripts/ralph-roadmap.sh --search
```
