## 1. Create Flake Structure

- [x] 1.1 Create flake.nix in repository root
- [x] 1.2 Define inputs (nixpkgs only, no flake-utils)
- [x] 1.3 Set up supportedSystems list (4 platforms)
- [x] 1.4 Create forAllSystems helper function

## 2. Configure Package Build

- [x] 2.1 Set up stdenv.mkDerivation with finalAttrs pattern
- [x] 2.2 Configure pnpmDeps with fetchPnpmDeps
- [x] 2.3 Set pnpm = pnpm_9 and fetcherVersion = 3
- [x] 2.4 Add placeholder hash (all zeros)
- [x] 2.5 Configure nativeBuildInputs (nodejs_20, hooks, pnpm_9)
- [x] 2.6 Set dontNpmPrune = true

## 3. Define Build Phase

- [x] 3.1 Add buildPhase with runHook preBuild
- [x] 3.2 Add pnpm run build command
- [x] 3.3 Add runHook postBuild

## 4. Configure Installation

- [x] 4.1 Let npmInstallHook handle installation automatically
- [x] 4.2 Verify binary ends up in $out/bin/openspec

## 5. Add Metadata

- [x] 5.1 Set meta.description
- [x] 5.2 Set meta.homepage
- [x] 5.3 Set meta.license (MIT)
- [x] 5.4 Set meta.mainProgram = "openspec"

## 6. Configure App Entry Point

- [x] 6.1 Add apps output with forAllSystems
- [x] 6.2 Set default app to openspec binary
- [x] 6.3 Test that nix run works

## 7. Add Development Shell

- [x] 7.1 Add devShells output with forAllSystems
- [x] 7.2 Include nodejs_20 and pnpm_9 in buildInputs
- [x] 7.3 Add shellHook with welcome message and instructions

## 8. Get Correct Dependency Hash

- [x] 8.1 Run nix build to trigger hash mismatch
- [x] 8.2 Copy correct hash from error message
- [x] 8.3 Update pnpmDeps.hash in flake.nix
- [x] 8.4 Verify build succeeds

## 9. Testing

- [x] 9.1 Test `nix build` on x86_64-linux
- [x] 9.2 Test `nix run . -- --version` works
- [x] 9.3 Test `nix develop` provides correct environment
- [ ] 9.4 Test on macOS if available
- [ ] 9.5 Test `nix run github:Fission-AI/OpenSpec -- init` after merge to main

## 10. Documentation

- [x] 10.1 Add Nix installation section to README
- [x] 10.2 Include example commands for common Nix workflows in README
