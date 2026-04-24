# Phase 20 Verification

Phase cycle: 1
Stage: `verification`
Date: 2026-04-17 (Australia/Sydney)

Fresh verification pass for ROADMAP Phase 20 in a new agent context.

## Checks performed

- Re-read the Phase 20 roadmap block in `ROADMAP.md`.
- Re-read the current audit summary plus the source PRD and decision record:
  - `notes/workspace-poc/phase-20-prd-audit/SUMMARY.md`
  - `WORKSPACE_POC_PRD.md`
  - `WORKSPACE_POC_DECISION_RECORD.md`
- Re-checked the implementation boundary that backs the Phase 20 conclusions:
  - `src/core/workspace/create.ts`
  - `src/core/workspace/registry.ts`
  - `src/core/workspace/change-create.ts`
  - `src/core/workspace/open.ts`
  - `src/core/workspace/apply.ts`
  - `src/core/workspace/status.ts`
  - `src/core/workspace/archive.ts`
  - `src/commands/workspace.ts`
  - `src/commands/workflow/new-change.ts`
  - `src/commands/workflow/apply.ts`
  - `src/commands/workflow/status.ts`
- Rebuilt the CLI:
  - `pnpm run build`
  - Result: passed
- Re-ran the workspace-focused automated slice:
  - `pnpm exec vitest run test/core/workspace/*.test.ts test/commands/workspace/*.test.ts test/commands/workflow/*.test.ts test/commands/archive.workspace.test.ts test/cli-e2e/workspace/*.test.ts`
  - Result: 24 files passed, 77/77 tests passed
- Re-checked the shipped help surface:
  - `node dist/cli/index.js workspace --help`
  - `node dist/cli/index.js new change --help`
  - `node dist/cli/index.js apply --help`
  - `node dist/cli/index.js archive --help`
- Re-ran the focused absence checks that support the documented PRD gaps:
  - `rg -n "workspace create|workspace add-repo|workspace doctor|workspace open|when to use workspace|repo-local" README* docs openspec/specs -S`
    - Result: no matches; no shipped workspace operator guide was found in README/docs/spec content
  - `rg -n -S -- "--owner|owner|owners|handoff" src test README* docs openspec/specs`
    - Result: only `apply` authority-handoff text was found in `src/commands/workflow/apply.ts` and related tests; no repo owner or handoff metadata surface was found for workspace registry, `workspace open`, `status`, or shipped docs/spec content
  - `rg -n "target add|target remove|remove target|add target|update targets|workspace target|--targets" src test README* docs openspec/specs -S`
    - Result: target handling exists only at change creation time through `--targets`; no shipped target-adjustment path was found
- Re-ran a fresh isolated CLI smoke to confirm the user-facing Phase 20 audit claims:
  - created a new workspace under fresh `XDG_CONFIG_HOME` and `XDG_DATA_HOME`
  - attached copied `app`, `api`, and `docs` happy-path fixture repos
  - created `phase20-verify-change` with `--targets app,api`
  - checked `workspace open --change phase20-verify-change --json`
  - checked `status --change phase20-verify-change --json`
  - Result: `workspace open` attached only `app` and `api`; `status` reported the planned change with target entries keyed by `alias`, `problems`, `source`, `state`, and `tasks`; neither JSON surface exposed owner or handoff metadata
- Verified the roadmap update logic:
  - Phase 20 is checked complete
  - the remaining PRD gaps are converted into concrete remediation phases
  - final PRD signoff is moved after those remediation phases

## Issues found

- No failing workspace behavior was found in the current implementation.
- The previous Phase 20 verification note overstated one search result and blurred another:
  - the README/docs/spec search returned no matches, not CLI help strings
  - the owner or handoff search found only `apply` authority-handoff messaging, which is separate from the missing repo owner or handoff metadata gap
- Three PRD-completeness gaps remain and are real:
  - owner or handoff visibility is missing from the shipped workspace surface
  - shipped workspace guidance is missing outside internal phase notes and CLI descriptions
  - target-set adjustment after workspace change creation is not implemented

## Fixes applied

- Corrected this verification note so its search evidence matches the repository exactly and distinguishes authority-handoff messaging from missing owner metadata.
- No product code changes were needed in this verification pass.

## Residual risks

- The product is close to signoff technically, but PRD signoff would be dishonest until the newly inserted remediation phases land.
- Later agents should treat Phase 21 as the next required step, not optional polish.
