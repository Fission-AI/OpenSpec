---
title: "NPM Publish Pipeline for enpalspec"
date: 2026-04-14
topic: npm-publish-pipeline-enpalspec
status: active
---

# NPM Publish Pipeline for enpalspec

## Context

enpalspec is a fork/adaptation of the openspec framework, customized for Enpal's internal use.
The question: how does openspec's release/publish infrastructure work, and what needs to be adapted
to publish enpalspec to npmjs?

## Rounds

<!-- Q&A rounds appended here -->

## Insights & Decisions

### Release tooling
- **Tooling**: Changesets (`@changesets/cli`) — already in place, no change needed.
- **Publish command**: `pnpm run release:ci` → `check:pack-version && changeset publish`. Keep as-is.
- **Access**: `publishConfig.access: "public"` already set. npm org `@enpal` exists.
- **Automated publish**: Add a `release.yml` GitHub Actions workflow that runs `pnpm run release:ci`
  on push to main, with `NPM_TOKEN` secret. No Changesets bot — Option B (simple trigger) is
  sufficient for an internal tool.

### Changelog strategy
- **Decision**: Start CHANGELOG.md fresh for enpalspec (Option B — squash inherited changesets).
- **Rationale**: The two pending changesets (`graceful-status-no-changes`, `fix-opencode-commands-directory`)
  describe upstream openspec fixes inherited via the fork. Their PR/issue references (#714, #748)
  point to `Fission-AI/OpenSpec`, not enpalspec. Publishing them would produce a misleading changelog.
- **Action**: Delete both `.changeset/*.md` pending changesets. Reset `CHANGELOG.md` to start from
  the first genuine enpalspec release. The existing CHANGELOG.md content stays as historical record
  of the openspec baseline but enpalspec's own changelog begins at the first public release.

### Stale reference fixes required before first publish

**Blocking (publish will fail without these):**
- `scripts/pack-version-check.mjs:83` — bin path hardcoded as `@fission-ai/openspec`, must be `@enpal/enpalspec`
- `.changeset/config.json:5` — changelog GitHub repo `Fission-AI/OpenSpec` → `enpal/enpalspec`
- Delete `.changeset/graceful-status-no-changes.md` and `.changeset/fix-opencode-commands-directory.md`

**User-visible / fix before first public release:**
- `scripts/postinstall.js` — env var `OPENSPEC_NO_COMPLETIONS` → `ENPALSPEC_NO_COMPLETIONS`; tip text `openspec completion install` → `enpalspec completion install`
- `scripts/test-postinstall.sh` — same env var rename
- `src/commands/feedback.ts:101,133` — repo `Fission-AI/OpenSpec` → `enpal/enpalspec`
- `test/commands/feedback.test.ts` — update mock repo references alongside feedback.ts
- `src/core/update.ts:275` — Fission-AI learn-more link → enpalspec equivalent
- `src/core/init.ts:764` — Fission-AI init footer link → enpalspec equivalent

**Leave as-is (intentional or historical):**
- `bin/openspec.js` filename — internal only, not user-visible
- `CHANGELOG.md` existing content — historical record of openspec baseline
- `README_OLD.md`, `openspec/changes/archive/**` — immutable history
- `flake.nix` — separate decision
- `docs/` — separate docs pass

### New file required
- `.github/workflows/release.yml` — automated publish on push to main

## Open Questions

- Should `src/core/update.ts` and `src/core/init.ts` Fission-AI links point to the enpalspec GitHub
  repo, or be removed entirely? (Depends on whether `github.com/enpal/enpalspec` is public.)
- Should `flake.nix` be updated or removed? (Nix support may not be relevant for enpalspec users.)
