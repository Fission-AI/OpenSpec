# Phase 25 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh final signoff smoke run for ROADMAP Phase 25 using the built CLI, shipped docs/help, `WORKSPACE_POC_PRD.md`, a roadmap completeness scan, a new managed workspace, and copied `happy-path` fixture repos under isolated XDG roots.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Re-checked the final signoff prerequisites directly:
  - re-read `WORKSPACE_POC_PRD.md`
  - `rg -n "^- \\[ \\]" ROADMAP.md`
- Checked the shipped help and docs surfaces:
  - `node dist/cli/index.js workspace --help`
  - `rg -n "When To Use Workspace Mode|Supported CLI Flow|Hand Off Work To Another Repo Owner|workspace targets" README.md docs/cli.md docs/workspace.md`
- Created a new isolated workspace:
  - fresh `XDG_CONFIG_HOME`
  - fresh `XDG_DATA_HOME`
  - copied `test/fixtures/workspace-poc/happy-path/repos` into a temp root
  - `node dist/cli/index.js workspace create phase25-manual --json`
- Registered repo aliases with guidance:
  - `workspace add-repo app <path> --owner "App Platform" --handoff "Materialize app after shared review" --json`
  - `workspace add-repo api <path> --owner "API Platform" --handoff "API owner picks up after contract sign-off" --json`
  - `workspace add-repo docs <path> --handoff "Docs owner updates public guidance after feature merge" --json`
- Exercised the final workspace flow:
  - `new change phase25-signoff --targets app,api`
  - `workspace targets phase25-signoff --add docs --json`
  - `workspace open --change phase25-signoff`
  - `workspace open --change phase25-signoff --json`
  - `status --change phase25-signoff`
  - `status --change phase25-signoff --json`
  - `apply --change phase25-signoff --repo docs`
  - post-apply `status --change phase25-signoff`
  - post-apply `status --change phase25-signoff --json`
  - guarded `workspace targets phase25-signoff --remove docs` failure after repo-local materialization

## Results

- `pnpm run build` passed.
- `WORKSPACE_POC_PRD.md` remained satisfied by the current shipped behavior exercised in this manual pass.
- `rg -n "^- \\[ \\]" ROADMAP.md` returned no matches, so no incomplete required roadmap phase was left behind.
- The shipped help and docs passed the fresh-user check:
  - `workspace --help` exposed cross-repo planning plus `update-repo` and `targets`
  - `README.md`, `docs/cli.md`, and `docs/workspace.md` exposed when to use workspace mode, the supported CLI flow, owner or handoff guidance, and target-set adjustment
- The fresh managed workspace passed:
  - workspace root was created under the isolated XDG data directory
  - `.openspec/workspace.yaml` stored committed owner or handoff guidance
  - `.openspec/local.yaml` stored local repo paths
  - no absolute repo path leaked into committed workspace metadata
- The final workspace flow passed:
  - `workspace targets --add docs` updated the active target set without manual file edits
  - `workspace open --change ...` exposed `app`, `api`, and `docs` with the expected owner or handoff notes
  - `status --change ...` exposed the workspace next step before and after materialization
  - `apply --change phase25-signoff --repo docs` materialized the docs slice and printed the authority-handoff message
  - post-apply `status --change ...` reported `docs` as `materialized` via `repo`
  - `workspace targets --remove docs` failed after materialization with the expected authority-handoff guardrail

## Fixes applied

- No product or test fixes were required during this final manual smoke.

## Residual risks

- No new residual risks were found in this manual pass.
- This stage focused on the shipped user-visible signoff surfaces. Full archive and completion roll-up behavior remains covered by the passing automated workspace acceptance suite rather than by additional manual file editing in this phase.
- The remaining limits are the documented v0 scope boundaries already accepted in `WORKSPACE_POC_PRD.md`, not unresolved fixable gaps.
