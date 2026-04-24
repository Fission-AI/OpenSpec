Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 24 - Validate Target Set Adjustment
Type: Test
Output directory: notes/workspace-poc/phase-24-test-workspace-target-set-adjustment/
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
- Summary: notes/workspace-poc/phase-24-test-workspace-target-set-adjustment//SUMMARY.md
- Verification: notes/workspace-poc/phase-24-test-workspace-target-set-adjustment//VERIFY.md
- Manual test: notes/workspace-poc/phase-24-test-workspace-target-set-adjustment//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-24-test-workspace-target-set-adjustment//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 24 - Validate Target Set Adjustment

Type: Test

Usable outcome: Target-set edits behave safely under real workspace conditions and do not regress the shipped POC flow.

Output summary directory: `notes/workspace-poc/phase-24-test-workspace-target-set-adjustment/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 24.1 Add unit, command, and CLI coverage for target-add and target-remove behavior, including materialized-target guardrails.
- [ ] 24.2 Run manual re-entry, `status`, `workspace open`, and `apply` checks after target-set edits in a fresh workspace.
- [ ] 24.3 Re-run the workspace acceptance slice to confirm target adjustment does not regress the existing happy path or interruption flow.

Acceptance tests:

- [ ] 24.4 Adjusted target sets are reflected consistently in workspace metadata, `workspace open`, `apply`, and workspace-aware `status`.
- [ ] 24.5 Guardrails prevent silent divergence for already materialized targets.
- [ ] 24.6 The existing Phase 19 acceptance scenario still passes after target-set support lands.
