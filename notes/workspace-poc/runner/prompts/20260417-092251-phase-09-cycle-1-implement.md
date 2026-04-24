Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 09 - Validate Workspace Open
Type: Test
Output directory: notes/workspace-poc/phase-09-test-workspace-open/
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
- Summary: notes/workspace-poc/phase-09-test-workspace-open//SUMMARY.md
- Verification: notes/workspace-poc/phase-09-test-workspace-open//VERIFY.md
- Manual test: notes/workspace-poc/phase-09-test-workspace-open//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-09-test-workspace-open//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 09 - Validate Workspace Open

Type: Test

Usable outcome: The open contract is pinned down with real fixture state before materialization depends on it.

Output summary directory: `notes/workspace-poc/phase-09-test-workspace-open/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 09.1 Add tests for planning-only vs change-scoped mode.
- [ ] 09.2 Add tests that verify only the expected repo aliases are attached.
- [ ] 09.3 Add tests for unresolved target paths and unsupported agent/tool combinations.
- [ ] 09.4 Add CLI e2e coverage for the selected primary demo path.

Acceptance tests:

- [ ] 09.5 Planning-only open never exposes attached repo roots.
- [ ] 09.6 Change-scoped open never attaches unrelated repos.
- [ ] 09.7 Open diagnostics point to `workspace doctor` or the alias that needs repair.
- [ ] 09.8 Test coverage does not depend on real multi-root writes.
