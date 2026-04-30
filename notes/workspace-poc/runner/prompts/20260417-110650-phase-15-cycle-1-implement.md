Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 15 - Validate Workspace Status
Type: Test
Output directory: notes/workspace-poc/phase-15-test-workspace-status/
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
- Summary: notes/workspace-poc/phase-15-test-workspace-status//SUMMARY.md
- Verification: notes/workspace-poc/phase-15-test-workspace-status//VERIFY.md
- Manual test: notes/workspace-poc/phase-15-test-workspace-status//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-15-test-workspace-status//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 15 - Validate Workspace Status

Type: Test

Usable outcome: Roll-up semantics are verified with deterministic scenarios rather than manual interpretation.

Output summary directory: `notes/workspace-poc/phase-15-test-workspace-status/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 15.1 Add pure tests for state derivation logic.
- [ ] 15.2 Add command tests for workspace-aware status output.
- [ ] 15.3 Add CLI e2e coverage for mixed states across three repos.
- [ ] 15.4 Add regression tests for JSON shape and spinner-free output.

Acceptance tests:

- [ ] 15.5 Status correctly reports a mix of planned, materialized, archived, and blocked targets in one workspace.
- [ ] 15.6 Status remains readable when one repo is missing or stale.
- [ ] 15.7 JSON output can be parsed directly by an agent or automation.
- [ ] 15.8 The dirty fixture supports interruption and resume scenarios.
