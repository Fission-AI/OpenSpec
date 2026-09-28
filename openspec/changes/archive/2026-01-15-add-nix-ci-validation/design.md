# Design: Nix CI Validation

## Context

OpenSpec recently added Nix flake support to enable Nix users to install the tool. This includes:
- `flake.nix`: Nix package definition with pnpm dependency fetching
- `scripts/update-flake.sh`: Automation script to update version and hash when releasing

Currently, there is no CI validation ensuring these Nix artifacts remain functional. The existing CI workflow (.github/workflows/ci.yml) validates Node.js builds, tests, and linting across multiple platforms (Linux, macOS, Windows) but does not validate Nix builds.

**Stakeholders**: Nix users, maintainers, contributors who need confidence that Nix support works.

**Constraints**:
- Must work in GitHub Actions Linux runners
- Should minimize CI runtime impact (<5 minutes added)
- Should support local testing with `act` for rapid iteration
- Must integrate with existing required checks

## Goals / Non-Goals

**Goals**:
- Validate `nix build` succeeds on every PR/push
- Validate `scripts/update-flake.sh` executes without errors
- Ensure Nix support doesn't regress silently
- Support local testing with `act`
- Optimize with caching to minimize CI time

**Non-Goals**:
- Testing on macOS (GitHub-hosted macOS runners are slower and more expensive; Nix flake already declares macOS support)
- Building for all declared systems (x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin) - focus on most common platform
- Validating Nix flake quality/style (nixpkgs-fmt, etc.) - can be added later if needed
- Running OpenSpec's full test suite through Nix build - existing CI already does this

## Decisions

### Decision 1: Use DeterminateSystems nix-installer-action

**What**: Use `determinatesystems/nix-installer-action` for installing Nix in CI.

**Why**:
- Official GitHub Action maintained by Determinate Systems (Nix experts)
- Handles GitHub Actions environment quirks automatically
- Includes automatic caching configuration
- More reliable than curl | sh installation script
- Better error messages and diagnostics

**Alternatives considered**:
- Official Nix installer (`curl -L https://nixos.org/nix/install | sh`): Works but requires manual setup of flakes, caching, and CI-specific configuration
- `cachix/install-nix-action`: Popular alternative but determinatesystems is more actively maintained and has better GHA integration

### Decision 2: Use Magic Nix Cache for performance

**What**: Use `determinatesystems/magic-nix-cache-action` for automatic binary caching.

**Why**:
- Zero-configuration caching for Nix store
- Significantly reduces CI time on subsequent runs (from ~5min to ~1-2min)
- Free for public repositories
- Handles cache keys automatically

**Alternatives considered**:
- Manual Nix store caching with GitHub Actions cache: More complex, requires manual cache key management
- Cachix: Excellent tool but requires account setup and token management
- No caching: Acceptable for initial implementation, but poor developer experience

### Decision 3: Separate job for Nix validation

**What**: Create a dedicated `nix-validate` job in .github/workflows/ci.yml that runs in parallel with other jobs.

**Why**:
- Keeps Nix validation isolated from Node.js validation
- Allows parallel execution for faster CI
- Easier to debug when Nix-specific issues occur
- Can be marked as required check independently

**Alternatives considered**:
- Add Nix steps to existing jobs: Creates coupling between Node.js and Nix validation, harder to maintain
- Separate workflow file: Overkill for a single job, harder to manage required checks

### Decision 4: Validate update script by executing it

**What**: Run `scripts/update-flake.sh` as part of CI validation.

**Why**:
- Ensures the script doesn't break due to changes in package.json format, nix build output, or dependencies
- Tests the full workflow users will follow when releasing
- Catches errors early

**Implementation approach**:
- Execute script in a way that doesn't modify git state (or discard changes after)
- Verify script exits with code 0
- Optionally validate that flake.nix contains expected patterns after execution

**Alternatives considered**:
- Mock/dry-run mode: Would require modifying the script significantly
- Skip validation: Risky - script could break and only be discovered at release time
- Only run on release branches: Misses issues early in development

### Decision 5: Run on pull_request and push to main

**What**: Configure Nix validation job to run on:
- `pull_request` events (any PR to main)
- `push` events (direct pushes to main)
- `workflow_dispatch` (manual trigger for testing)

**Why**:
- Catches issues before merge (pull_request)
- Validates main branch stays healthy (push)
- Allows manual testing without creating PRs (workflow_dispatch)

### Decision 6: Support act for local testing

**What**: Ensure workflow is compatible with `act` tool for local CI testing.

**Why**:
- Faster iteration when developing CI changes
- Allows testing without pushing to GitHub
- Reduces commit noise from CI debugging

**Requirements**:
- Use standard GitHub Actions syntax
- Document any act-specific configuration needed
- Test that Nix can be installed in act's Docker containers

**Limitations**:
- act may not perfectly replicate GitHub's runners, but close enough for validation

## Risks / Trade-offs

### Risk: CI runtime increase

**Impact**: Adding Nix validation will increase total CI time by 2-5 minutes per run.

**Mitigation**:
- Run Nix job in parallel with existing jobs (no blocking delay)
- Use magic-nix-cache for subsequent runs (~1-2 min with cache)
- Configure appropriate timeout (10 minutes max)

**Acceptance**: The benefit of preventing Nix regressions outweighs the cost.

### Risk: Nix installer failures in CI

**Impact**: Transient failures in Nix installation could block PRs.

**Mitigation**:
- Use determinatesystems action which has retry logic
- Monitor for flaky failures and adjust if needed
- Document troubleshooting steps

**Acceptance**: Nix installation is generally stable in GHA; this is low risk.

### Risk: Update script modifies git state

**Impact**: Running update-flake.sh modifies flake.nix, which could cause CI to fail if git state is checked.

**Mitigation**:
- Run script in isolation without committing changes
- Add `git checkout -- flake.nix` after validation
- Or accept dirty git state in CI (doesn't affect build validation)

**Acceptance**: Script validation is important enough to handle this carefully.

### Risk: act compatibility issues

**Impact**: Workflow might not work perfectly with act due to Docker environment differences.

**Mitigation**:
- Document known limitations
- Focus on GitHub Actions as primary validation target
- Use act as best-effort local testing

**Acceptance**: act support is nice-to-have, not required.

## Migration Plan

### Phase 1: Add Nix job (new, non-required)
1. Add `nix-validate` job to .github/workflows/ci.yml
2. Configure to run in parallel with existing jobs
3. Do NOT mark as required check initially
4. Monitor for ~1 week to ensure stability

### Phase 2: Make required
1. After validation is stable, add to required checks
2. Update branch protection rules in GitHub settings
3. Document in CONTRIBUTING.md or README

### Rollback Plan
If Nix validation causes issues:
1. Remove job from required checks in GitHub settings (immediate)
2. Comment out or remove job from workflow (permanent fix)
3. Investigate and fix issues
4. Re-enable following same phased approach

## Open Questions

- **Q**: Should we test update-flake.sh on every CI run, or only when package.json or pnpm-lock.yaml changes?
  - **A**: Test on every run for simplicity. The script is fast (<30 seconds) and catching regressions is valuable.

- **Q**: Should we validate on macOS as well?
  - **A**: No for initial implementation. Linux validation is sufficient and macOS runners are slower/more expensive. Can add later if users report macOS-specific issues.

- **Q**: Should we run full OpenSpec tests through the Nix build?
  - **A**: No. The Nix build already runs `pnpm test` as part of its build phase. Existing CI jobs cover testing thoroughly. Nix validation focuses on build success.

- **Q**: What timeout should we use for the Nix validation job?
  - **A**: Start with 10 minutes. With caching, jobs should complete in 1-3 minutes. Without cache (first run), 5-7 minutes is expected.
