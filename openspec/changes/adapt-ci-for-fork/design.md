## Context

EnpalSpec is a fork of OpenSpec. The upstream repo includes CI workflows designed for OpenSpec's own infrastructure: Nix flake builds, npm OIDC publishing, and GitHub App tokens. None of these are available in the EnpalSpec fork. The `release-prepare.yml` workflow already guards itself with `if: github.repository == 'Fission-AI/OpenSpec'` (so it never runs), and `nix-flake-validate` in `ci.yml` will fail when triggered because the Nix tooling and flake files are present but the infrastructure secrets are not. The `changes` job exists solely to feed path-based filtering into `nix-flake-validate`.

The goal is to strip the CI down to only what actually runs and provides value in this fork: build, test, and lint on PRs and pushes.

## Goals / Non-Goals

**Goals:**
- Remove `release-prepare.yml` entirely
- Remove `nix-flake-validate` job and the `changes` detection job from `ci.yml`
- Remove Nix references from `required-checks-pr` and `required-checks-main`
- Leave `test_pr`, `test_matrix`, `lint`, and `validate-changesets` jobs intact

**Non-Goals:**
- Modifying the test or lint steps themselves
- Setting up new release or publishing workflows
- Removing the `validate-changesets` job (kept as-is; it gracefully skips if changesets aren't configured)

## Decisions

**Delete `release-prepare.yml` rather than keeping it gated.**
The file already has a repository guard that prevents it from running. Keeping dead workflow files creates confusion and maintenance burden. Deletion is cleaner.

**Remove `changes` job entirely rather than repurposing it.**
The `changes` job's only consumer is `nix-flake-validate`. With that job gone, the `changes` job serves no purpose. Removing both avoids an orphaned job.

**Keep `validate-changesets` as-is.**
It already handles the "no changesets configured" case gracefully with a skip message. No change needed.

**Simplify `required-checks-pr` and `required-checks-main` to remove Nix deps.**
Both jobs reference `nix-flake-validate` in their `needs` arrays and check its result. Remove the dependency and the conditional check. The jobs become straightforward: test + lint must pass.

## Risks / Trade-offs

- **Risk**: If Nix support is re-introduced later, the jobs will need to be re-added. → Mitigation: This is an intentional fork divergence; the proposal documents the removal clearly.
- **Risk**: `validate-changesets` may produce confusing "skipping" output if changesets are never used. → Low impact; the job is non-blocking.

## Migration Plan

1. Delete `.github/workflows/release-prepare.yml`
2. Edit `.github/workflows/ci.yml`:
   - Remove `changes` job
   - Remove `nix-flake-validate` job
   - Remove `needs: changes` and `nix` output references
   - Update `required-checks-pr`: remove `nix-flake-validate` from `needs` and from the result checks
   - Update `required-checks-main`: same as above
3. Verify CI passes on a test PR

Rollback: revert the commit — no infrastructure changes are involved.
