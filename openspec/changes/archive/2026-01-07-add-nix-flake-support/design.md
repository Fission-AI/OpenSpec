## Context

OpenSpec is a TypeScript CLI tool using pnpm for dependency management. The project requires Node.js ≥20.19.0. Nix uses its own build system that needs to understand how to fetch dependencies and build the project reproducibly.

The Nix ecosystem has specific patterns for packaging Node.js/pnpm projects that differ from the traditional npm ecosystem.

## Goals

- Enable OpenSpec to be run directly via `nix run github:Fission-AI/OpenSpec`
- Support all major platforms (Linux x86/ARM, macOS x86/ARM)
- Use existing pnpm-lock.yaml for reproducible builds
- Provide development environment for Nix users

## Non-Goals

- Replace existing npm/pnpm publishing workflow
- Publish to nixpkgs (can be done later as separate effort)
- Support Windows (Nix doesn't run natively on Windows)

## Decisions

### Use stdenv.mkDerivation instead of buildNpmPackage

**Decision**: Package OpenSpec using `stdenv.mkDerivation` with pnpm hooks.

**Rationale**: The zigbee2mqtt package in nixpkgs demonstrates the current best practice for pnpm projects. Using `buildNpmPackage` with pnpm requires complex configuration, while `mkDerivation` with the right hooks is more straightforward and better supported.

**Alternative considered**: Using `buildNpmPackage` with `npmConfigHook = pkgs.pnpmConfigHook` - this is the older pattern and causes issues with dependency fetching.

### Use fetchPnpmDeps with explicit pnpm version

**Decision**: Use `pkgs.fetchPnpmDeps` with `pnpm = pkgs.pnpm_9` and `fetcherVersion = 3`.

**Rationale**:
- pnpm lockfile version 9.0 requires fetcherVersion 3
- Explicit pnpm_9 ensures consistency between fetch and build
- This is the documented way to handle pnpm projects in nixpkgs

### Multi-platform support without flake-utils

**Decision**: Implement multi-platform support using plain Nix with `nixpkgs.lib.genAttrs`.

**Rationale**: Per user request, avoid extra dependencies. The `genAttrs` pattern is simple and well-understood in the Nix community.

### Node.js 20 instead of latest

**Decision**: Pin to nodejs_20 to match package.json engines requirement.

**Rationale**: Ensures consistency with development environment and npm package requirements. Avoids potential compatibility issues with newer Node versions.

## Key Implementation Details

### Dependency Hash Management

The `pnpmDeps.hash` field must be updated whenever dependencies change. The workflow:
1. Set hash to fake value (all zeros)
2. Run `nix build`
3. Nix fails with actual hash
4. Update flake.nix with correct hash

This is standard Nix workflow for fixed-output derivations.

### Build Inputs

Required nativeBuildInputs:
- `nodejs_20` - runtime
- `npmHooks.npmInstallHook` - handles installation phase
- `pnpmConfigHook` - configures pnpm environment
- `pnpm_9` - pnpm executable

The `dontNpmPrune = true` is important to keep all dependencies after build.

## Risks / Trade-offs

**[Risk]** Hash needs updating when dependencies change → **Mitigation**: Document this clearly; error message from Nix provides correct hash

**[Risk]** Nix builds might lag behind npm releases → **Mitigation**: This is fine; Nix users can still use npm if they need bleeding edge

**[Trade-off]** Additional maintenance burden for hash updates → **Benefit**: Better experience for Nix ecosystem users

## Migration Plan

1. Add flake.nix to repository
2. Test builds on multiple platforms (can use GitHub Actions with Nix)
3. Update README with Nix installation instructions
4. Optionally add to CI pipeline to catch hash mismatches early

No breaking changes - this is purely additive.

## Open Questions

- Should we add automatic hash updating to CI? (Could use nix-update-script)
- Should we submit to nixpkgs after validation? (Separate decision)
- Do we want to support older Node versions in flake? (Probably no - stick to package.json requirement)
