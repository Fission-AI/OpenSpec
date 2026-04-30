# Phase 05 Manual Test

Manual smoke re-run in a fresh temp/XDG context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 05, cycle 1.

## Scenarios run

- Rebuilt the current CLI with `pnpm run build`.
- Checked `node dist/cli/index.js new change --help` and confirmed the Phase 05 surface still documents:
  - `--description <text>` as seeding the initial change artifact
  - `--targets <aliases>` for workspace-targeted change creation
- Created a brand-new isolated CLI environment with:
  - `OPENSPEC_TELEMETRY=0`
  - fresh `XDG_CONFIG_HOME`
  - fresh `XDG_DATA_HOME`
- Created three real repo roots under the temp sandbox:
  - `app`
  - `api`
  - `docs`
- Seeded each repo root with repo-local OpenSpec state via `openspec/changes/` so the real `workspace add-repo` path validation would accept them.
- Ran `node dist/cli/index.js workspace create phase05-manual-cycle1 --json`.
- Ran the real repo registration flow from inside that managed workspace:
  - `node dist/cli/index.js workspace add-repo app <path> --json`
  - `node dist/cli/index.js workspace add-repo api <path> --json`
  - `node dist/cli/index.js workspace add-repo docs <path> --json`
- Ran the target-aware create flow:
  - `node dist/cli/index.js new change shared-auth --targets app,api --description "Cross-repo auth rollout"`
- Inspected the created workspace change and confirmed:
  - `changes/shared-auth/.openspec.yaml` exists
  - metadata recorded `schema: spec-driven`
  - metadata recorded `targets: [app, api]`
  - `proposal.md`, `design.md`, and `tasks/coordination.md` exist
  - `targets/app/tasks.md` and `targets/api/tasks.md` exist
  - `targets/app/specs/` and `targets/api/specs/` exist
- Verified the untargeted and targeted repos all remained free of repo-local materialization:
  - `<app>/openspec/changes/shared-auth` does not exist
  - `<api>/openspec/changes/shared-auth` does not exist
  - `<docs>/openspec/changes/shared-auth` does not exist
- Exercised the negative CLI cases in the same fresh workspace:
  - `node dist/cli/index.js new change dup-targets --targets app,app`
  - `node dist/cli/index.js new change unknown-target --targets app,missing`
  - reran `node dist/cli/index.js new change shared-auth --targets app,api`
- Re-ran `node dist/cli/index.js workspace doctor --json` after targeted creation.

## Results

- All manual smoke scenarios passed.
- The real targeted-create flow produced the expected central workspace scaffold under `changes/shared-auth/`.
- The workspace change metadata recorded the exact requested target set: `app`, `api`.
- Duplicate target aliases failed with a non-zero exit and the expected actionable message: `Duplicate target alias 'app' in --targets. Remove duplicates and retry.`
- Unknown target aliases failed with a non-zero exit and the expected actionable message naming the missing alias and registered aliases.
- Reusing the same workspace change ID failed predictably with the existing duplicate-change error.
- No repo-local change directories were created in any registered repo during `new change`.
- `workspace doctor --json` still returned `status: "ok"` after targeted creation, so the registry remained healthy.
- The generated metadata still stored `created: 2026-04-16` during this 2026-04-17 Australia/Sydney run because the shared date path remains UTC-based.

## Fixes applied

- No product fixes were required during this manual-test pass.

## Residual risks

- No Phase 05 user-visible regressions were found in this manual smoke cycle.
- The shared metadata `created` field still reflects UTC day boundaries rather than local date boundaries. That was observed again here, but it is existing shared behavior rather than a Phase 05-specific regression.
- Permanent automated coverage for this flow is still expected in Phase 06.
