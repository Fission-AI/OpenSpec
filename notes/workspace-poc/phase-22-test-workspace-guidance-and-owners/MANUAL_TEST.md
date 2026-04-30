# Phase 22 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke run for ROADMAP Phase 22 using the built CLI, shipped help/docs surfaces, and new temp workspaces in isolated XDG roots.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Scenario 1: checked the fresh-user help surface with `node dist/cli/index.js workspace --help`.
- Scenario 2: checked the shipped docs/help text with `rg -n "When To Use Workspace Mode|Supported CLI Flow|Re-Enter An Existing Workspace|Hand Off Work To Another Repo Owner|workspace update-repo|Workspace Mode" README.md docs/cli.md docs/workspace.md`.
- Scenario 3: created a fresh isolated workspace with the built CLI, copied the `app` and `api` fixture repos into a temp root, registered both aliases, recorded owner or handoff guidance, created a targeted workspace change, updated repo guidance in place, then checked both text and JSON output for `workspace open --change phase22-guidance` and `status --change phase22-guidance`.
- Scenario 4: created a second fresh isolated workspace against the older ownerless fixture shape, registered `app` and `docs` without any owner or handoff metadata, created a targeted workspace change, then checked both text and JSON output for `workspace open --change ownerless-guidance` and `status --change ownerless-guidance`.

## Results

- `pnpm run build` passed.
- Scenario 1 passed:
  - `workspace --help` still describes workspace mode as `cross-repo planning`.
  - the help output exposes `create`, `add-repo`, `update-repo`, `doctor`, and `open`.
- Scenario 2 passed:
  - `README.md` links to `docs/workspace.md`.
  - `docs/cli.md` exposes workspace mode in the CLI reference and points to the guide.
  - `docs/workspace.md` contains `When To Use Workspace Mode`, `Supported CLI Flow`, `Re-Enter An Existing Workspace`, and `Hand Off Work To Another Repo Owner`.
- Scenario 3 passed:
  - the fresh workspace stored only committed owner or handoff guidance in `.openspec/workspace.yaml`.
  - `.openspec/local.yaml` remained free of owner or handoff strings.
  - `workspace open --change phase22-guidance` text plus JSON both returned the expected `owner` and `handoff` guidance for `app` and the expected `owner` guidance for `api`.
  - `status --change phase22-guidance` text plus JSON returned the same owner or handoff values as `workspace open`.
- Scenario 4 passed:
  - the ownerless workspace remained readable without adding any new metadata.
  - `workspace open --change ownerless-guidance` text plus JSON did not emit `owner` or `handoff` fields.
  - `status --change ownerless-guidance` text plus JSON also stayed free of `owner` or `handoff` fields.

## Fixes applied

- No product or test fixes were required during this manual smoke.

## Residual risks

- No additional Phase 22 residual risks were found in this manual smoke.
