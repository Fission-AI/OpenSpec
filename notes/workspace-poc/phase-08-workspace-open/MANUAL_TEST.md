# Phase 08 Manual Test

Manual smoke re-run in a fresh temp context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 08, cycle 1.

## Scenarios run

- Rebuilt the current CLI with `pnpm run build`.
- Checked `node dist/cli/index.js workspace open --help`.
- Created a brand-new temp sandbox by copying the real fixture state into sibling `workspace/` and `repos/` directories under one temp root, because `.openspec/local.yaml` resolves repo overlays through `../repos/*`:
  - `test/fixtures/workspace-poc/dirty/workspace`
  - `test/fixtures/workspace-poc/dirty/repos`
- Ran the planning-only flow from inside the copied workspace:
  - `node dist/cli/index.js workspace open --json`
- Created a healthy change-scoped case:
  - `node dist/cli/index.js new change shared-refresh --targets app,api`
  - `node dist/cli/index.js workspace open --change shared-refresh --json`
- Verified the success case output reported:
  - `mode: "change-scoped"`
  - `change.id: "shared-refresh"`
  - attached repos for `app` and `api` only
  - no `docs` attachment
  - instruction surface path `.claude/commands/opsx/workspace-open.md`
- Verified `workspace open` did not materialize repo-local execution state:
  - `repos/app/openspec/changes/shared-refresh` remained absent
  - `repos/api/openspec/changes/shared-refresh` remained absent
  - `repos/docs/openspec/changes/shared-refresh` remained absent
- Created a stale-target failure case:
  - `node dist/cli/index.js new change shared-broken --targets app,docs`
  - `node dist/cli/index.js workspace open --change shared-broken`
- Exercised the unsupported-agent path:
  - `node dist/cli/index.js workspace open --agent codex`

## Results

- All manual smoke scenarios passed.
- Planning-only open succeeded even though the copied fixture still had a stale `docs` path in `.openspec/local.yaml`, confirming that the no-change path does not attach repo roots.
- Change-scoped open for `shared-refresh` attached only `app` and `api`, not all registered repos.
- Change-scoped open for `shared-broken` failed with a non-zero exit and the expected actionable message naming `docs` plus the `workspace doctor` repair path.
- The unsupported-agent path failed cleanly with `Unsupported agent 'codex' for workspace open in v0. Supported agent: claude.`
- `workspace open` left repo-local `openspec/changes/shared-refresh` directories absent in all copied repos after the smoke run.
- The help surface still exposes the Phase 08 contract cleanly: `--change <id>`, `--agent <tool>` with `claude` as the v0 default, and `--json`.

## Fixes applied

- No product fixes were required during this manual-test pass.

## Residual risks

- No Phase 08 user-visible regressions or residual risks were identified in this manual smoke cycle.
- Phase 09 can still widen the permanent validation matrix, but the shipped Phase 08 user path behaved as intended end to end.
