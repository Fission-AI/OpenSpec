# Phase 09 Manual Test

Manual smoke re-run in a fresh temp context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 09, cycle 1.

## Scenarios run

- Rebuilt the current CLI with `pnpm run build`.
- Created a brand-new temp sandbox by copying the real dirty fixture into sibling `workspace/` and `repos/` directories under one temp root:
  - `test/fixtures/workspace-poc/dirty/workspace`
  - `test/fixtures/workspace-poc/dirty/repos`
- Canonicalized the temp root with `pwd -P` before making path assertions so the smoke matched the CLI's real canonical path output on macOS.
- Confirmed the copied dirty fixture preserved the stale `docs` alias pointing at a missing `repos/docs-missing` path before exercising the failure case.
- Ran the planning-only flow:
  - `node dist/cli/index.js workspace open --json`
- Created a healthy change-scoped case:
  - `node dist/cli/index.js new change shared-refresh --targets app,api`
  - `node dist/cli/index.js workspace open --change shared-refresh --agent claude`
- Verified the success case output reported:
  - `Prepared change-scoped workspace open surface for claude.`
  - instruction surface path `.claude/commands/opsx/workspace-open.md`
  - attached repos for `app` and `api` only
  - no `docs` attachment
  - the `openspec apply --change shared-refresh --repo <alias>` reminder
- Verified the session-prep contract stayed intact:
  - `workspace/.claude/commands/opsx/workspace-open.md` was still absent on disk after the command
  - `repos/app/openspec/changes/shared-refresh` was absent
  - `repos/api/openspec/changes/shared-refresh` was absent
- Created a stale-target failure case:
  - `node dist/cli/index.js new change shared-broken --targets app,docs`
  - `node dist/cli/index.js workspace open --change shared-broken`
- Exercised the unsupported-agent path:
  - `node dist/cli/index.js workspace open --agent codex`

## Results

- All manual smoke scenarios passed.
- Planning-only open succeeded without exposing attached repo roots, even with the copied fixture still carrying the stale `docs -> repos/docs-missing` alias.
- Change-scoped open for `shared-refresh` attached only `app` and `api`, not all registered repos.
- The Claude demo path remained instruction-surface only; it did not write a `.claude` command file and did not materialize repo-local execution state.
- Change-scoped open for `shared-broken` failed with a non-zero exit and the expected actionable message naming `docs`, the missing `repos/docs-missing` path, and the `workspace doctor` repair path.
- The unsupported-agent path failed cleanly with `Unsupported agent 'codex' for workspace open in v0. Supported agent: claude.`

## Fixes applied

- No product fixes were required during this manual-test pass.

## Residual risks

- No new user-visible residual risks were identified within the Phase 09 validation scope.
