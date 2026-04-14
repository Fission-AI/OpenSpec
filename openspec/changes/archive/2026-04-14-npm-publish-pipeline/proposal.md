## Why

enpalspec needs to be published to npm under `@enpal/enpalspec` so Enpal teams can install it as a proper versioned package. The repository was forked from openspec and retains stale references (package names, repo URLs, env vars) that will break publishing and produce a misleading changelog if left in place.

## What Changes

- Add `.github/workflows/release.yml` — automated publish to npm on push to `main` using `NPM_TOKEN` secret
- Fix blocking stale reference in `scripts/pack-version-check.mjs:83` — bin path `@fission-ai/openspec` → `@enpal/enpalspec`
- Fix `.changeset/config.json:5` — changelog GitHub repo `Fission-AI/OpenSpec` → `enpal/enpalspec`
- Delete stale inherited changesets: `.changeset/graceful-status-no-changes.md`, `.changeset/fix-opencode-commands-directory.md`
- Reset `CHANGELOG.md` to start fresh for enpalspec (historical openspec content moved or noted as baseline)
- Fix user-visible stale references in `scripts/postinstall.js`, `scripts/test-postinstall.sh` (env var rename), `src/commands/feedback.ts`, `test/commands/feedback.test.ts`, `src/core/update.ts`, `src/core/init.ts`

## Capabilities

### New Capabilities

- `npm-release-workflow`: GitHub Actions workflow that publishes enpalspec to npm on every push to `main`

### Modified Capabilities

- `ci-fork-config`: Changeset config and stale-reference fixes required before first publish (repo URL, pack-version-check bin path, postinstall env vars, feedback command repo)

## Impact

- **CI/CD**: New GitHub Actions workflow file; requires `NPM_TOKEN` secret configured on the repository
- **Release process**: Publish happens automatically on `main` push — no manual `pnpm run release:ci` needed in day-to-day flow
- **Changelog**: Existing CHANGELOG.md content stays as historical record; enpalspec changelog starts at first genuine release
- **Affected files**: `scripts/pack-version-check.mjs`, `.changeset/config.json`, `scripts/postinstall.js`, `scripts/test-postinstall.sh`, `src/commands/feedback.ts`, `test/commands/feedback.test.ts`, `src/core/update.ts`, `src/core/init.ts`, `CHANGELOG.md`
- **Deleted files**: `.changeset/graceful-status-no-changes.md`, `.changeset/fix-opencode-commands-directory.md`
- **No breaking changes** to the CLI's public interface
