## 1. Blocking Fixes (Required Before First Publish)

- [x] 1.1 Fix `scripts/pack-version-check.mjs:83` — change bin path from `@fission-ai/openspec` to `@enpal/enpalspec`
- [x] 1.2 Fix `.changeset/config.json` — change `changelog` repo from `Fission-AI/OpenSpec` to `enpal/enpalspec`
- [x] 1.3 Delete `.changeset/graceful-status-no-changes.md`
- [x] 1.4 Delete `.changeset/fix-opencode-commands-directory.md`

## 2. User-Visible Stale Reference Fixes

- [x] 2.1 Fix `scripts/postinstall.js` — rename env var `OPENSPEC_NO_COMPLETIONS` → `ENPALSPEC_NO_COMPLETIONS`; update tip text to `enpalspec completion install`
- [x] 2.2 Fix `scripts/test-postinstall.sh` — rename env var `OPENSPEC_NO_COMPLETIONS` → `ENPALSPEC_NO_COMPLETIONS`
- [x] 2.3 Fix `src/commands/feedback.ts:101,133` — change repo from `Fission-AI/OpenSpec` to `enpal/enpalspec`
- [x] 2.4 Fix `test/commands/feedback.test.ts` — update mock repo references from `Fission-AI/OpenSpec` to `enpal/enpalspec`
- [x] 2.5 Fix `src/core/update.ts:275` — replace Fission-AI learn-more link with `github.com/enpal/enpalspec`
- [x] 2.6 Fix `src/core/init.ts:764` — replace Fission-AI init footer link with `github.com/enpal/enpalspec`

## 3. Changelog Reset

- [x] 3.1 Reset `CHANGELOG.md` — add an enpalspec section header at the top marking the start of enpalspec's own changelog; preserve existing content below as the openspec baseline record

## 4. Release Workflow

- [x] 4.1 Create `.github/workflows/release.yml` with trigger on `push: branches: [main]`, steps: checkout, setup pnpm, install (`--frozen-lockfile`), build, then publish via `pnpm run release:ci` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`

## 5. Verification

- [x] 5.1 Run `pnpm run check:pack-version` locally to confirm bin path fix is valid
- [x] 5.2 Run `pnpm test` to confirm feedback command tests pass with updated repo references
- [x] 5.3 Confirm `.changeset/` no longer contains the two deleted changesets
- [x] 5.4 Confirm `.github/workflows/release.yml` is present and parses correctly (e.g., `cat` or lint with `actionlint`)
- [x] 5.5 Document in PR description that `NPM_TOKEN` must be set as a GitHub Actions repository secret before the workflow can publish
