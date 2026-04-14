## Context

enpalspec is a fork of openspec, customized for Enpal's internal use. The package is nearly ready to publish to npm as `@enpal/enpalspec`, but several stale references inherited from the upstream fork block a clean first publish and would produce a misleading changelog. The codebase already has Changesets (`@changesets/cli`), `pnpm run release:ci`, and `publishConfig.access: "public"` in place — the Enpal npm org `@enpal` exists. What remains is:

1. A GitHub Actions workflow to automate publishing on push to `main`
2. A targeted sweep of stale references that would either break the publish or confuse users

## Goals / Non-Goals

**Goals:**
- Automated publish to npm on every push to `main` (no manual intervention)
- Fix every stale reference that would cause `pnpm run release:ci` to fail or produce incorrect output
- Clean up user-visible strings that reference openspec/Fission-AI (env vars, feedback URLs, update links)
- Start enpalspec's CHANGELOG fresh (delete inherited openspec changesets)

**Non-Goals:**
- Changing the release toolchain (Changesets stays; no Changesets bot)
- Updating `docs/`, `README_OLD.md`, `flake.nix`, or `openspec/changes/archive/**` (separate decision)
- Adding a Changesets PR bot or Changesets GitHub App
- Restructuring the existing CI pipeline beyond the new release workflow

## Decisions

### Trigger: push to `main` only, no PR drafts
**Decision**: `release.yml` triggers on `push: branches: [main]`. It runs `pnpm run release:ci` which already guards against no pending changesets (`check:pack-version`).

**Alternatives considered**:
- Changesets bot (PRs + auto-release) — unnecessary overhead for an internal tool; simple push trigger is sufficient.
- Manual `workflow_dispatch` — requires a human step; defeats the automation goal.

### Changelog: squash inherited changesets, start fresh
**Decision**: Delete `.changeset/graceful-status-no-changes.md` and `.changeset/fix-opencode-commands-directory.md`. Reset CHANGELOG.md so the enpalspec changelog begins at the first genuine release. Existing content is retained as a historical record of the openspec baseline (not deleted).

**Rationale**: The two pending changesets reference PR/issue numbers from `Fission-AI/OpenSpec`, not enpalspec. Publishing them would generate changelog entries with broken links pointing to the wrong repo.

### Stale reference fixes: targeted file list, not a global search-replace
**Decision**: Fix only the explicit list of files identified in the exploration. Do not run a bulk repo-wide search-replace.

**Rationale**: Some occurrences of "openspec" or "Fission-AI" are intentional (historical docs, internal binary name `bin/openspec.js`, archive content). A targeted list prevents unintended changes to immutable history.

### Open questions from exploration
- `src/core/update.ts` and `src/core/init.ts` Fission-AI links: replace with `github.com/enpal/enpalspec` (assume the repo will be public, or at least accessible to Enpal users). If the repo is private, these links should be removed entirely — treat as a follow-up if needed.
- `flake.nix`: out of scope for this change.

## Risks / Trade-offs

- **Risk: NPM_TOKEN secret not configured** → Publish job will fail with auth error. Mitigation: document in PR that `NPM_TOKEN` must be set as a repository secret before merging.
- **Risk: Missing a stale reference** → Some user-visible string still shows "openspec" or "Fission-AI" after the fix. Mitigation: explicit file list from exploration reduces surface area; any residual can be caught post-publish.
- **Risk: CHANGELOG reset loses traceability** → The two deleted changesets represent upstream fixes. Mitigation: they are documented in this change's exploration and commit history; the old CHANGELOG.md content stays in the file as a baseline comment.

## Migration Plan

1. Apply all stale-reference fixes and delete inherited changesets
2. Reset CHANGELOG.md header section
3. Add `.github/workflows/release.yml`
4. Ensure `NPM_TOKEN` is set as a GitHub Actions repository secret
5. Merge to `main` — first `pnpm run release:ci` run will publish `@enpal/enpalspec` at the current version

No rollback complexity: if publish fails, the worst case is an unpublished version. The code changes (stale reference fixes) are safe to keep regardless of publish outcome.

## Open Questions

- Should `github.com/enpal/enpalspec` links in `update.ts` / `init.ts` be live URLs or placeholders? (Depends on repo visibility — assume public for now, revisit if private.)
