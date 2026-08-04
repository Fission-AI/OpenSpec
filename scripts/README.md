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

## regen-parity-hashes.mjs

Recomputes the golden hashes pinned in
`test/core/templates/skill-templates-parity.test.ts`.

**When to use**: After any intended workflow-template change, and after
rebasing a branch that edits templates — two branches touching different
templates collide on the same hash map, and hand-editing 64-character hashes
during a conflict is where transcription mistakes happen.

**Usage**:
```bash
pnpm build && pnpm regen:parity-hashes
pnpm vitest run test/core/templates/skill-templates-parity.test.ts
```

**What it does**:
1. Refuses to run if `dist/` is missing or older than `src/` — hashes come from
   the build, while the parity test reads `src/`, so regenerating against a
   stale build writes hashes the test then rejects
2. Recomputes every pinned hash from the built `dist/`
3. Rewrites the map in place and prints which entries moved
4. Exits non-zero, writing nothing, if it cannot account for every pinned hash:
   a label with no matching export (a renamed or deleted template), or a hash
   line these patterns do not recognise. Both would otherwise be left stale
   while the run reported success, so `nothing to update` always means it.

Line endings round-trip unchanged, so a CRLF checkout is safe — `test/**` has no
`text eol=lf` attribute, so the file arrives with CRLF on Windows.

The parity test recomputes the same hashes independently, so this script cannot
silently produce a wrong value. Always run the test afterwards; it, not this
script, is the authority.

The rewriting lives in `parity-hash-shared.mjs` so its guards can be exercised
against fabricated input — see `test/core/templates/parity-hash-shared.test.ts`.
A test that ran this script for real would rewrite the repository's own parity
test file mid-suite.

## postinstall.js

Post-installation script that runs after package installation.

## pack-version-check.mjs

Validates package version consistency before publishing.
