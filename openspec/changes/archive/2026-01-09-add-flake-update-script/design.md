## Context

The Nix flake added in the previous change requires manual maintenance when:
1. Package version changes (must update flake.nix version field)
2. Dependencies change (must update pnpmDeps hash)

Currently this requires maintainers to:
- Manually edit flake.nix version
- Set placeholder hash
- Run nix build to get error
- Copy hash from error message
- Update flake.nix again
- Verify build works

This is tedious and error-prone, especially for maintainers unfamiliar with Nix.

## Goals

- Automate version and hash updates for flake.nix
- Make script idempotent and safe to run multiple times
- Provide clear feedback during execution
- Integrate easily into release workflow

## Non-Goals

- Automatically commit changes (maintainer decides when to commit)
- Support non-pnpm package managers
- Handle complex Nix configurations beyond OpenSpec's use case

## Decisions

### Use Bash instead of Node.js script

**Decision**: Implement as bash script rather than Node.js.

**Rationale**:
- Needs to call Nix commands which are bash-native
- Parsing Nix output is simpler in bash with grep/sed
- Maintainers updating flake.nix likely have Nix installed (bash environment)
- Node.js would add unnecessary complexity for shell operations

**Alternative considered**: Node.js script with child_process - adds dependency on extra npm packages for shell operations, less natural for Nix tooling.

### Extract hash from build error output

**Decision**: Trigger intentional build failure with placeholder hash to get correct hash.

**Rationale**: This is the standard Nix workflow for updating fixed-output derivations. No API exists to compute the hash without building.

**Alternative considered**: Pre-compute hash from pnpm-lock.yaml - would require understanding Nix's hash algorithm and pnpm's lockfile structure, fragile and non-standard.

### Use sed for in-place file editing

**Decision**: Use `sed -i` for updating flake.nix in place.

**Rationale**: Simple, available on all Unix-like systems, handles the specific replacement patterns needed.

**Alternative considered**:
- Using Node.js to parse/modify: Overkill for simple string replacement
- Manual `sed` without `-i`: Requires temp files, more complex

### Verify build after hash update

**Decision**: Always run verification build after updating hash.

**Rationale**: Catches errors immediately, gives maintainer confidence the update worked.

**Trade-off**: Takes extra time (~30s) but prevents broken flake.nix commits.

## Key Implementation Details

### Path Resolution

Script calculates paths relative to its own location:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
```

This allows running from any working directory.

### Error Handling

Uses `set -euo pipefail` for strict error handling:
- `-e`: Exit on any command failure
- `-u`: Exit on undefined variable access
- `-o pipefail`: Catch failures in pipes

### Hash Extraction Pattern

Uses grep with Perl regex to extract hash:
```bash
grep -oP 'got:\s+\Ksha256-[A-Za-z0-9+/=]+'
```

This reliably extracts the hash regardless of surrounding text.

## Risks / Trade-offs

**[Risk]** Script assumes standard Nix error message format → **Mitigation**: If extraction fails, script exits with error and shows full output

**[Risk]** Build might fail for reasons other than hash mismatch → **Mitigation**: Script checks for hash in output before proceeding

**[Trade-off]** Requires Nix installed to run → **Benefit**: Only maintainers updating flake need to run this, and they have Nix

## Migration Plan

1. Add script to scripts directory
2. Document in scripts/README.md
3. Use in next version bump to verify workflow
4. Update CONTRIBUTING.md if needed to mention script

No breaking changes - purely additive tooling.

## Open Questions

None - straightforward automation script.
