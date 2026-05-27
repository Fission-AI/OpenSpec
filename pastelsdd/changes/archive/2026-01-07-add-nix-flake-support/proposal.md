## Why

Pastelsdd users on NixOS or using the Nix package manager cannot easily install or run Pastelsdd without going through npm. Adding a Nix flake makes Pastelsdd a first-class citizen in the Nix ecosystem, enabling users to run `nix run github:thiagodiogo/Pastelsdd -- init` or include Pastelsdd in their development environments declaratively.

## What Changes

- Add `flake.nix` to repository root with multi-platform support (x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin)
- Package uses pnpm for dependency management (matching existing development workflow)
- Support both direct execution via `nix run` and installation via `nix profile install`
- Provide dev shell for contributors using Nix

## Capabilities

### New Capabilities
- `nix-flake-support`: Nix flake configuration for building and running Pastelsdd

### Modified Capabilities
- None

## Impact

- **New files**: `flake.nix` in repository root
- **Documentation**: Should add installation instructions for Nix users
- **CI/CD**: Could add flake checking to CI pipeline (optional)
- **Maintenance**: Requires updating pnpmDeps hash when dependencies change
