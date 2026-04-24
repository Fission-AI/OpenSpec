# Phase 24 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke run for ROADMAP Phase 24 using the built CLI, a fresh isolated managed workspace, copied `happy-path` fixture repos under a new temp root, and direct inspection of workspace change metadata after each target-set mutation.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Created a new isolated temp root with dedicated `XDG_CONFIG_HOME` and `XDG_DATA_HOME`.
- Copied the `app`, `api`, and `docs` fixture repos from `test/fixtures/workspace-poc/happy-path/repos` into that temp root.
- Created a fresh managed workspace with `node dist/cli/index.js workspace create phase24-manual --json`.
- Registered `app`, `api`, and `docs` with `workspace add-repo ... --json`.
- Inspected workspace change metadata after each mutation to confirm `.openspec.yaml` stayed aligned with the CLI-visible target set.
- Scenario 1: add target plus re-entry checks
  - `node dist/cli/index.js new change manual-add --targets app,api`
  - `node dist/cli/index.js workspace targets manual-add --add docs --json`
  - `node dist/cli/index.js workspace open --change manual-add --json`
  - `node dist/cli/index.js status --change manual-add --json`
  - `node dist/cli/index.js apply --change manual-add --repo docs --json`
  - re-entry check: `node dist/cli/index.js workspace open --change manual-add --json`
  - re-entry check: `node dist/cli/index.js status --change manual-add --json`
  - guardrail check: `node dist/cli/index.js workspace targets manual-add --remove docs`
- Scenario 2: remove target plus re-entry checks
  - `node dist/cli/index.js new change manual-remove --targets app,api,docs`
  - `node dist/cli/index.js workspace targets manual-remove --remove docs --json`
  - `node dist/cli/index.js workspace open --change manual-remove --json`
  - `node dist/cli/index.js status --change manual-remove --json`
  - `node dist/cli/index.js apply --change manual-remove --repo docs`

## Results

- `pnpm run build` passed.
- Scenario 1 passed:
  - `workspace targets manual-add --add docs --json` updated the target set to `app`, `api`, `docs`.
  - Workspace change metadata also recorded `app`, `api`, `docs` after the add-target mutation.
  - `workspace open --change manual-add --json` attached `app`, `api`, and `docs`.
  - `status --change manual-add --json` reported all three targets as planned before materialization.
  - `apply --change manual-add --repo docs --json` materialized `docs`.
  - fresh re-entry via `workspace open` still attached `app`, `api`, and `docs`.
  - fresh re-entry via `status` reported `docs` as `materialized` via `repo` while `app` and `api` remained planned.
  - `workspace targets manual-add --remove docs` failed with the expected authority-handoff guardrail once repo-local execution existed.
- Scenario 2 passed:
  - `workspace targets manual-remove --remove docs --json` reduced the target set to `app` and `api`.
  - Workspace change metadata also recorded only `app` and `api` after the remove-target mutation.
  - `workspace open --change manual-remove --json` attached only `app` and `api`.
  - `status --change manual-remove --json` reported only `app` and `api`.
  - `apply --change manual-remove --repo docs` failed cleanly because `docs` was no longer part of the workspace target set.
- On this macOS temp-root run, the registered repo paths were canonicalized to `/private/...` realpaths and `workspace open --json` reflected those same canonical paths consistently.

## Fixes applied

- No repository code or test changes were required during this manual-test rerun.
- Corrected the manual assertion harness during the rerun to compare against the canonical repo realpaths emitted by `workspace add-repo` and `workspace open` under macOS temp roots.

## Residual risks

- No additional Phase 24 residual risks were found in this manual smoke.
