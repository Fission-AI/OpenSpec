# Phase 19 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke rerun in isolated temp roots against the built CLI from the current worktree.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Scenario 1: golden happy path in a fresh XDG-isolated workspace with copied `happy-path` repos.
  - Ran `workspace create phase19-manual-happy --json`, then registered `app`, `api`, and `docs`.
  - Ran `new change phase19-manual-happy-change --targets app,api`, `workspace open --change phase19-manual-happy-change`, and `apply --change phase19-manual-happy-change --repo app --json`.
  - Marked workspace coordination tasks `2/2`, marked `app` repo tasks `2/2`, and archived the repo-local `app` change from the repo root.
  - Ran `apply --change phase19-manual-happy-change --repo api --json`, marked `api` repo tasks `2/2`, then checked `status --change phase19-manual-happy-change --json` before and after `archive phase19-manual-happy-change --workspace`.
  - Confirmed the repo-local archive entry was preserved under `repos/app/openspec/changes/archive/` and that `docs` was never materialized.
- Scenario 2: interruption and re-entry in a fresh copy of the `dirty` fixture.
  - Copied `test/fixtures/workspace-poc/dirty/workspace` and `test/fixtures/workspace-poc/dirty/repos` into a new temp root.
  - Rewrote `.openspec/local.yaml` so `app` and `api` used canonical copied repo paths while `docs` pointed at an intentionally missing `docs-missing` path, matching the helper behavior used by the e2e suite.
  - Ran `new change phase19-manual-resume --targets app,api,docs`, `apply --change phase19-manual-resume --repo app`, marked `app` repo tasks `1/2`, then ran `status --change phase19-manual-resume` and `workspace doctor`.
- Scenario 3: failure recovery in a second fresh copy of the `dirty` fixture with the same overlay normalization.
  - Ran `workspace add-repo app <existing-app-path>` to confirm duplicate alias rejection.
  - Ran `new change phase19-manual-unknown --targets app,missing` to confirm unknown-target rejection and no partial change creation.
  - Ran `new change phase19-manual-recovery --targets app,docs`, then `apply --change phase19-manual-recovery --repo app`, marked `app` repo tasks `1/2`, reran `apply` for `app`, ran `apply` for stale `docs`, and inspected `status --change phase19-manual-recovery --json`.

## Results

- `pnpm run build` passed.
- Scenario 1 matched `19.4` and `19.7`.
  - After the first materialization, `status --json` reported workspace state `in-progress`.
  - After coordination completion, repo-local `app` archive, and repo-local `api` completion, `status --json` reported `soft-done`.
  - After `openspec archive phase19-manual-happy-change --workspace`, `status --json` reported `hard-done`.
  - Final targets were `api: complete` and `app: archived`.
  - The repo-local archive entry remained under `repos/app/openspec/changes/archive/2026-04-17-phase19-manual-happy-change`.
  - `docs` stayed untouched, which preserved targeted execution and repo ownership boundaries.
- Scenario 2 matched `19.5`.
  - `status --change phase19-manual-resume` reported workspace state `blocked`.
  - `status` printed `Next step: run 'openspec workspace doctor' and repair repo alias 'docs' before resuming 'phase19-manual-resume'.`
  - `workspace doctor` exited non-zero, named the stale `docs` path explicitly, and printed `Next step: repair '.openspec/local.yaml' for alias 'docs', then rerun 'openspec workspace doctor'.`
  - The workspace was resumed from on-disk state alone; no manual reconstruction was needed.
- Scenario 3 matched `19.6`.
  - Duplicate alias registration failed explicitly.
  - Unknown target creation failed explicitly and did not create a new workspace change directory.
  - Repeat apply failed with the documented create-only collision.
  - Stale `docs` apply failed with explicit alias naming plus `workspace doctor` guidance.
  - Final workspace status stayed coherent at `blocked`, with targets rendered as `app: in-progress (1/2)` and `docs: blocked (0/2)`.
- Combined outcome matched `19.7`.
  - Planning remained central in the workspace.
  - Execution materialized only into the explicitly targeted repos.
  - Repo-local archive ownership stayed repo-local even after explicit workspace completion.

## Fixes applied

- No product or test code changes were required during this manual-test pass.
- Refreshed this note to record the fresh direct built-CLI rerun against current on-disk state.

## Residual risks

- No new Phase 19 residual risks were found in this manual smoke pass.
- `ROADMAP.md` Phase 19 checkboxes were already accurate, so no checkbox changes were needed in this pass.
