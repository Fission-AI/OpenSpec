# Phase 21 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke run for ROADMAP Phase 21 using the built CLI, shipped docs/help surfaces, a new temp workspace, and an existing ownerless workspace fixture.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Scenario 1: checked the fresh-user help surface with `node dist/cli/index.js workspace --help`.
- Scenario 2: checked the shipped docs and link surfaces with `rg -n "Workspace Mode|when to use cross-repo workspaces|workspace update-repo|When To Use Workspace Mode|Supported CLI Flow|Hand Off Work To Another Repo Owner" README.md docs/cli.md docs/workspace.md`.
- Scenario 3: created a fresh isolated workspace with the built CLI, registered `app` and `api` aliases, captured owner or handoff guidance, created a targeted workspace change, updated repo guidance in place, then checked both `workspace open --change owner-visibility --json` and `status --change owner-visibility --json`.
- Scenario 4: copied the existing ownerless `test/fixtures/workspace-poc/happy-path` workspace and repos into a new temp root, created `ownerless-check` with `--targets app,docs`, then checked `workspace open --change ownerless-check --json` and `status --change ownerless-check --json`.

## Results

- `pnpm run build` passed.
- Scenario 1 passed:
  - `workspace --help` still describes workspace mode as `cross-repo planning`.
  - the help output exposes `create`, `add-repo`, `update-repo`, `doctor`, and `open`.
- Scenario 2 passed:
  - `README.md` links to `docs/workspace.md`.
  - `docs/cli.md` exposes workspace mode in the CLI reference and points to the guide.
  - `docs/workspace.md` contains `When To Use Workspace Mode`, `Supported CLI Flow`, and the owner or handoff guidance section.
- Scenario 3 passed:
  - `.openspec/workspace.yaml` stored only committed repo guidance:
    - `app` had `owner: App Platform` and `handoff: Materialize app after shared review`
    - `api` had `owner: API Platform` and, after `workspace update-repo`, `handoff: API owner picks up after contract sign-off`
  - no machine-local temp path leaked into `.openspec/workspace.yaml`.
  - `workspace open --change owner-visibility --json` returned both attached repos with the expected `owner` and `handoff` fields.
  - `status --change owner-visibility --json` returned both workspace targets with the expected `owner` and `handoff` fields.
- Scenario 4 passed:
  - the copied ownerless fixture workspace stayed readable without migration or new required fields.
  - `workspace open --change ownerless-check --json` returned attached repos without `owner` or `handoff`.
  - `status --change ownerless-check --json` returned workspace targets without `owner` or `handoff`.

## Fixes applied

- No product or test fixes were required during this manual-test pass.

## Residual risks

- No additional Phase 21 residual risks were found in this manual smoke.
