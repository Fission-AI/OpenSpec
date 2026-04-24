# Phase 20 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Created the missing Phase 20 audit artifacts under `notes/workspace-poc/phase-20-prd-audit/`.
- Audited the shipped workspace POC against `WORKSPACE_POC_PRD.md` and `WORKSPACE_POC_DECISION_RECORD.md` across code, tests, prior phase notes, help text, and direct CLI behavior.
- Updated `ROADMAP.md` to mark Phase 20 complete.
- Inserted concrete PRD-remediation phases before final signoff:
  - Phase 21: workspace guidance and owner visibility
  - Phase 22: validation for guidance and owner visibility
  - Phase 23: workspace target-set adjustment
  - Phase 24: validation for target-set adjustment
  - moved final PRD signoff to Phase 25

## Tests or research performed

- Re-read:
  - `WORKSPACE_POC_PRD.md`
  - `WORKSPACE_POC_DECISION_RECORD.md`
  - `notes/workspace-poc/phase-07-open-contract-research/DECISION.md`
  - `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`
  - `notes/workspace-poc/phase-13-status-research/DECISION.md`
  - `notes/workspace-poc/phase-18-deferred-research/DECISION.md`
  - `notes/workspace-poc/phase-19-e2e-acceptance/SUMMARY.md`
  - `notes/workspace-poc/phase-19-e2e-acceptance/VERIFY.md`
- Re-inspected the current workspace implementation surface:
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
- Re-searched the current shipped docs and specs for workspace guidance and owner visibility:
  - `rg -n "workspace create|workspace add-repo|workspace doctor|workspace open|when to use workspace|repo-local" README* docs openspec/specs -S`
  - `rg -n -S -- "--owner|owner|owners|handoff" src test README* docs openspec/specs`
  - `rg -n "target add|target remove|remove target|add target|update targets|workspace target|--targets" src test README* docs openspec/specs -S`
- Rebuilt the CLI:
  - `pnpm run build`
- Re-ran the focused workspace automated slice:
  - `pnpm exec vitest run test/core/workspace/*.test.ts test/commands/workspace/*.test.ts test/commands/workflow/*.test.ts test/commands/archive.workspace.test.ts test/cli-e2e/workspace/*.test.ts`
- Re-checked the currently shipped help surface:
  - `node dist/cli/index.js workspace --help`
  - `node dist/cli/index.js new change --help`
  - `node dist/cli/index.js apply --help`
  - `node dist/cli/index.js archive --help`
- Ran a fresh manual CLI smoke in a new temp workspace:
  - created a managed workspace
  - attached `app`, `api`, and `docs` fixture repos
  - created `phase20-manual-change` with `--targets app,api`
  - inspected `workspace open --change phase20-manual-change --json`
  - inspected `status --change phase20-manual-change --json`

## Results

### PRD areas that are satisfied

- Persistent managed workspace home: implemented by `workspace create`, with `.openspec/` metadata plus top-level `changes/`, no inner repo-local `openspec/`, and a default managed location.
- Central planning with the existing `change` primitive and `spec-driven` methodology: implemented by workspace-aware `new change --targets`, shared proposal/design, coordination tasks, and per-target draft slices.
- Change-scoped repo attachment and local execution authority: implemented by `workspace open --change <id>` and create-only `apply --change <id> --repo <alias>`, with the same change ID reused in repo-local execution.
- Explicit top-level completion semantics: implemented by workspace-aware `status` plus `archive --workspace`, with `soft-done` and `hard-done` kept separate from repo-local archive.
- Key guardrails from the PRD and decision record are still respected:
  - committed workspace metadata stays under `.openspec/`
  - machine-specific repo paths stay in `.openspec/local.yaml`
  - repo attachment is change-scoped, not workspace-wide
  - workspace planning remains central while repo-local execution and archive stay repo-local
  - create-only materialization preserves clear authority handoff
- End-to-end resilience is strong: the fresh automated slice passed and the Phase 19 acceptance suite still proves the happy path, interruption/re-entry, and failure recovery.

### PRD areas mapped to explicit non-goals or deferred scope

- Multi-agent parity for `workspace open` is still intentionally out of scope for v0. Phase 07 locked the supported demo path to Claude, which remains consistent with the PRD's "Claude headline, Codex secondary if straightforward" positioning.
- Refresh or re-materialization, shared-contract promotion, stable project IDs, and team-shared mutable workspaces remain open questions or deferred work rather than shipped v0 promises.

### Remaining PRD gaps that block final signoff

- Owner visibility is missing.
  - The PRD says users should be able to identify affected repos, owners, and next actions from one planning surface.
  - Current evidence: `workspace add-repo` accepts only `<alias> <path>`, committed repo entries are written as empty mappings by default, and current `workspace open` / workspace-aware `status` surfaces expose aliases, paths, and task state only.
- Shipped workspace guidance is missing.
  - The PRD says users should be able to recognize when workspace mode is the right tool, onboard another engineer, and re-enter an in-flight workspace without relying on scattered notes.
  - Current evidence: the shipped surface exposes CLI help text, but the doc/spec search found no README, docs, or canonical spec content that explains when to use workspace mode, the supported workflow, or the handoff/re-entry model.
- Target-set adjustment after change creation is missing.
  - The PRD says teams should be able to adjust targets and continue when repos move at different cadences.
  - Current evidence: different cadences are supported by the shipped status and archive behavior, but target membership can only be declared at `new change --targets ...`; there is no add/remove target command or guarded update path after creation.

### Audit conclusion

- The shipped workspace POC is stable and aligned with the roadmap on the features it implements.
- The PRD is not yet fully satisfied.
- Final signoff must wait for the newly inserted remediation phases, because the remaining gaps are concrete product omissions rather than vague polish.

## Blockers and next-step notes

- No correctness regressions were found in the shipped workspace implementation.
- The blocker is PRD completeness, not failing code or failing tests.
- The next actionable phase is Phase 21, which should add shipped workspace guidance plus owner or handoff visibility before the PRD is checked again.
