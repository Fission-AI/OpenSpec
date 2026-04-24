Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 06 - Validate Target-Aware Change Creation
Type: Test
Output directory: notes/workspace-poc/phase-06-test-targeted-change-create/
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
- Summary: notes/workspace-poc/phase-06-test-targeted-change-create//SUMMARY.md
- Verification: notes/workspace-poc/phase-06-test-targeted-change-create//VERIFY.md
- Manual test: notes/workspace-poc/phase-06-test-targeted-change-create//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-06-test-targeted-change-create//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 06 - Validate Target-Aware Change Creation

Type: Test

Usable outcome: The central planning object is stable before any agent-open or materialization work begins.

Output summary directory: `notes/workspace-poc/phase-06-test-targeted-change-create/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 06.1 Add unit tests for target parsing and workspace change metadata rules.
- [ ] 06.2 Add command tests for targeted change creation against a registered workspace.
- [ ] 06.3 Add CLI e2e coverage for successful creation, unknown aliases, and untouched repo-local roots.

Acceptance tests:

- [ ] 06.4 `new change --targets` rejects aliases not present in the workspace registry.
- [ ] 06.5 The workspace change layout matches the chosen topology.
- [ ] 06.6 The workspace change contains central planning artifacts and per-target partitions only.
- [ ] 06.7 Running status or doctor after creation still sees the workspace as healthy.
