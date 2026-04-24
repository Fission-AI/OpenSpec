Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 19 - End-to-End POC Acceptance
Type: Test
Output directory: notes/workspace-poc/phase-19-e2e-acceptance/
Phase cycle: 1
Stage: implementation

Rules:
- Fresh context. Do not rely on prior chat state.
- Read the relevant phase block in ROADMAP.md and the current on-disk phase artifacts before acting.
- Execute only this phase. Do not intentionally start a later phase.
- Own failures. If something is broken or incomplete, diagnose and fix it yourself before calling it blocked.
- Keep decisions lean and practical.
- Do not silently defer fixable work.
- Update the relevant checkboxes for this phase in ROADMAP.md as tasks, acceptance tests, verification, and manual testing become complete.

Phase artifacts:
- Summary: notes/workspace-poc/phase-19-e2e-acceptance//SUMMARY.md
- Verification: notes/workspace-poc/phase-19-e2e-acceptance//VERIFY.md
- Manual test: notes/workspace-poc/phase-19-e2e-acceptance//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-19-e2e-acceptance//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 19 - End-to-End POC Acceptance

Type: Test

Usable outcome: The whole POC is proven with a small number of realistic, repeatable scenarios.

Output summary directory: `notes/workspace-poc/phase-19-e2e-acceptance/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 19.1 Add one golden happy-path e2e scenario covering: create workspace, register three repos, create one targeted change, open the change, materialize one repo, inspect status, archive repo-local work, and explicitly complete/archive the workspace.
- [ ] 19.2 Add one interruption/re-entry scenario covering: an existing workspace, one materialized target, one stale target, and status/doctor output that points to the next action.
- [ ] 19.3 Add one failure-recovery scenario covering: duplicate aliases, unknown targets, repeat apply, stale repo paths, and partial completion.

Acceptance tests:

- [ ] 19.4 The happy-path scenario can run end-to-end with real filesystem state and no broad mocks.
- [ ] 19.5 The interruption scenario can be resumed without reconstructing context manually.
- [ ] 19.6 The failure-recovery scenario produces actionable errors and no silent corruption.
- [ ] 19.7 The final suite demonstrates the product promise: plan centrally, execute locally, preserve repo ownership.
