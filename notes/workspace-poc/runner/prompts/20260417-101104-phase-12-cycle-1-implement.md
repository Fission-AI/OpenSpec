Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 12 - Validate Materialization
Type: Test
Output directory: notes/workspace-poc/phase-12-test-apply-materialization/
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
- Summary: notes/workspace-poc/phase-12-test-apply-materialization//SUMMARY.md
- Verification: notes/workspace-poc/phase-12-test-apply-materialization//VERIFY.md
- Manual test: notes/workspace-poc/phase-12-test-apply-materialization//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-12-test-apply-materialization//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 12 - Validate Materialization

Type: Test

Usable outcome: The execution handoff is proven against real repos before status and completion semantics are layered on top.

Output summary directory: `notes/workspace-poc/phase-12-test-apply-materialization/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 12.1 Add unit tests for materialization plan construction and target resolution.
- [ ] 12.2 Add command tests for apply success, apply failure, and repeat-apply behavior.
- [ ] 12.3 Add CLI e2e coverage for selective materialization into one repo out of many.
- [ ] 12.4 Add dirty-workspace coverage for stale aliases and pre-existing target change collisions.

Acceptance tests:

- [ ] 12.5 The repo-local change ID exactly matches the workspace change ID.
- [ ] 12.6 Apply never writes to repos outside the selected alias.
- [ ] 12.7 Apply surfaces collisions and stale-path failures without partial silent success.
- [ ] 12.8 The happy-path fixture supports `create -> add-repo -> new change -> apply`.
