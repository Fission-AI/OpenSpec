# Phase 12 Manual Test

Manual smoke re-run in a fresh local context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 12, cycle 1, stage `manual-test`.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Re-ran the focused Phase 12 regression slice before the manual smoke:
  - `pnpm vitest run test/core/workspace/apply.test.ts test/commands/workflow/apply.test.ts test/cli-e2e/workspace/workspace-apply-cli.test.ts test/cli-e2e/workspace/workspace-create-cli.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- Scenario 1: happy-path selective materialization into one repo out of many using copied fixture repos and isolated XDG roots.
  - Ran `workspace create phase-12-manual --json`.
  - Registered `app`, `api`, and `docs` with `workspace add-repo ... --json`.
  - Ran `new change shared-refresh --targets app,api,docs`.
  - Ran `apply --change shared-refresh --repo app --json`.
  - Re-ran `apply --change shared-refresh --repo app` to confirm repeat-apply collision behavior.
  - Inspected the temp repo trees and the JSON payload after apply.
- Scenario 2: dirty-workspace stale alias failure using the committed dirty fixture plus a rewritten temp `local.yaml` overlay with `docs` still pointing at a missing path.
  - Copied `test/fixtures/workspace-poc/dirty/workspace` and `test/fixtures/workspace-poc/dirty/repos` into a temp root.
  - Rewrote `.openspec/local.yaml` to absolute temp paths for `app` and `api`, while leaving `docs` pointed at `<tmp>/repos/docs-missing`.
  - Ran `new change docs-repair --targets docs`.
  - Ran `apply --change docs-repair --repo docs`.
  - Inspected the temp repo trees to confirm no new repo-local change was created in the healthy repos.

## Results

- `pnpm run build` passed.
- The focused Phase 12 regression slice passed: 5 files, 17/17 tests passed.
- Scenario 1 passed end to end:
  - workspace creation and repo registration succeeded
  - `new change shared-refresh --targets app,api,docs` succeeded
  - `apply --change shared-refresh --repo app --json` succeeded
  - the JSON payload reported `change.id = shared-refresh`
  - `target.changePath` ended in `/shared-refresh`, so the repo-local change ID exactly matched the workspace change ID
  - only `app` received `openspec/changes/shared-refresh/`
  - `api` and `docs` kept only their pre-existing fixture changes and did not receive `shared-refresh`
  - the materialized app change contained `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, `specs/`, and `.openspec.materialization.yaml`
  - the repeat `app` apply exited with code `1` and surfaced the explicit create-only collision
- Scenario 2 passed for the failure path:
  - `new change docs-repair --targets docs` succeeded inside the copied dirty workspace
  - `apply --change docs-repair --repo docs` exited with code `1`
  - the error reported `Target alias 'docs' points to a missing repo path: <tmp>/repos/docs-missing`
  - the error also told the user to run `openspec workspace doctor` and repair the failing alias before retrying
  - no `docs-repair` repo-local materialization appeared in `app` or `api`, so the stale-path failure did not produce silent partial success

## Fixes applied

- No product fixes were required from this manual smoke pass.
- Updated this manual-test note to capture the exact fresh-context scenarios, outputs, and repo-tree inspections from the current run.

## Residual risks

- No residual risks were found within the Phase 12 scope during this pass.
- Status roll-up and completion semantics remain future work for Phase 13 onward.
