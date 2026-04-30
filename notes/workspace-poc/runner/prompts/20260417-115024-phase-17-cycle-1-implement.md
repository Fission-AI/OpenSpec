Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 17 - Validate Workspace Completion and Archive
Type: Test
Output directory: notes/workspace-poc/phase-17-test-workspace-archive/
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
- Summary: notes/workspace-poc/phase-17-test-workspace-archive//SUMMARY.md
- Verification: notes/workspace-poc/phase-17-test-workspace-archive//VERIFY.md
- Manual test: notes/workspace-poc/phase-17-test-workspace-archive//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-17-test-workspace-archive//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 17 - Validate Workspace Completion and Archive

Type: Test

Usable outcome: Completion semantics are proven and do not collapse repo ownership boundaries.

Output summary directory: `notes/workspace-poc/phase-17-test-workspace-archive/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 17.1 Add command and CLI tests for workspace hard-done behavior.
- [ ] 17.2 Add tests for partial repo archive, staggered repo archive, and explicit workspace archive.
- [ ] 17.3 Add regression tests to ensure repo-local archive behavior is unchanged outside workspace flows.

Acceptance tests:

- [ ] 17.4 One repo can archive while another remains in progress without forcing top-level done.
- [ ] 17.5 Status shows soft-done before hard-done when the documented conditions are met.
- [ ] 17.6 Existing repo-local archive tests still pass without workspace regressions.
