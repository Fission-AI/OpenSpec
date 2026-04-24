# Phase 23 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh independent manual smoke run for ROADMAP Phase 23 using the built CLI and copied `happy-path` workspace and repo fixtures in a new temp sibling layout so the relative repo overlay stayed valid.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Copied `test/fixtures/workspace-poc/happy-path/workspace` and `test/fixtures/workspace-poc/happy-path/repos` into a fresh temp root so the checked-in relative local overlay stayed valid.
- Scenario 1: created `manual-add` with `app,api`, then ran:
  - `node dist/cli/index.js workspace targets manual-add --add docs`
  - `node dist/cli/index.js workspace open --change manual-add --json`
  - `node dist/cli/index.js status --change manual-add --json`
  - `node dist/cli/index.js apply --change manual-add --repo docs`
  - `node dist/cli/index.js workspace targets manual-add --remove docs`
- Scenario 2: created `manual-remove` with `app,api,docs`, then ran:
  - `node dist/cli/index.js workspace targets manual-remove --remove docs`
  - `node dist/cli/index.js workspace open --change manual-remove --json`
  - `node dist/cli/index.js status --change manual-remove --json`
  - `node dist/cli/index.js apply --change manual-remove --repo docs`

## Results

- `pnpm run build` passed.
- Scenario 1 passed:
  - `workspace targets manual-add --add docs` updated the workspace change metadata and scaffolded the `targets/docs/` draft slice.
  - `workspace open --change manual-add --json` attached `app`, `api`, and `docs`.
  - `status --change manual-add --json` reported `api`, `app`, and `docs` as planned targets.
  - `apply --change manual-add --repo docs` materialized the docs slice into `repos/docs/openspec/changes/manual-add`.
  - `workspace targets manual-add --remove docs` failed with the explicit authority-handoff guardrail once that repo-local change existed.
- Scenario 2 passed:
  - `workspace targets manual-remove --remove docs` removed `docs` from `.openspec.yaml` and deleted `changes/manual-remove/targets/docs/`.
  - `workspace open --change manual-remove --json` attached only `app` and `api`.
  - `status --change manual-remove --json` reported only `api` and `app`.
  - `apply --change manual-remove --repo docs` failed cleanly because `docs` was no longer targeted.

## Fixes applied

- No additional product or test fixes were required during this manual smoke.

## Residual risks

- No additional Phase 23 residual risks were found in this manual smoke.
