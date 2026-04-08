## Why

EnpalSpec is a fork of OpenSpec. The inherited CI workflows contain jobs and steps that are tightly coupled to the upstream repository (Nix flake validation, npm publishing via OIDC, GitHub App token generation), which either fail silently or require secrets/infrastructure that does not exist in this fork. These steps add noise and confusion to the CI pipeline and should be removed so only what actually runs in this repo remains.

## What Changes

- Remove the `nix-flake-validate` job from `ci.yml` (and its `changes` detection job that only serves it)
- Remove Nix-related path filters from the `changes` job (or remove the job entirely if it only served `nix-flake-validate`)
- Remove `nix-flake-validate` from the `needs` arrays in `required-checks-pr` and `required-checks-main`
- Remove references to Nix validation from the `required-checks-*` scripts
- Remove `release-prepare.yml` entirely — it has a hard-coded `if: github.repository == 'Fission-AI/OpenSpec'` guard and relies on GitHub App secrets and npm OIDC publishing not available in this fork
- Update the `validate-changesets` job if changesets are not used in this fork (or keep as-is if they are)

## Capabilities

### New Capabilities
- `ci-fork-config`: A lean CI workflow scoped to what runs in the EnpalSpec fork: PR/push testing (build + test), lint & type-check, and a consolidated required-checks gate — no Nix, no release automation.

### Modified Capabilities
<!-- No existing spec-level behavior changes -->

## Impact

- `.github/workflows/ci.yml` — jobs removed/simplified
- `.github/workflows/release-prepare.yml` — file deleted
- No source code, dependencies, or APIs are affected
