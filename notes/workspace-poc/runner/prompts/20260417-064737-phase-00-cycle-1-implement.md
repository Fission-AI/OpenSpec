Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 00 - Testing Infrastructure Foundation
Type: Build
Output directory: notes/workspace-poc/phase-00-test-harness/
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
- Summary: notes/workspace-poc/phase-00-test-harness//SUMMARY.md
- Verification: notes/workspace-poc/phase-00-test-harness//VERIFY.md
- Manual test: notes/workspace-poc/phase-00-test-harness//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-00-test-harness//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 00 - Testing Infrastructure Foundation

Type: Build

Usable outcome: A lean test harness exists for workspace work, so later phases can use real workspace and repo state without inventing new infrastructure each time.

Output summary directory: `notes/workspace-poc/phase-00-test-harness/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 00.1 Add `test/helpers/workspace-sandbox.ts` to create a temp managed workspace root plus attached repos.
- [ ] 00.2 Add fixture seeds under `test/fixtures/workspace-poc/` for `empty`, `happy-path`, and `dirty`.
- [ ] 00.3 Add shared assertion helpers for path leakage, workspace layout, target membership, and materialization invariants.
- [ ] 00.4 Reserve test suite locations for new coverage: `test/core/workspace/`, `test/commands/workspace/`, and `test/cli-e2e/workspace/`.
- [ ] 00.5 Keep the harness compatible with the current `runCLI()` helper and forked Vitest workers.

Acceptance tests:

- [ ] 00.6 `workspaceSandbox()` creates a workspace root with `.openspec/` and `changes/`, and no inner `openspec/`.
- [ ] 00.7 Cloned fixtures can be mutated independently without cross-test bleed.
- [ ] 00.8 Committed fixture files never contain absolute repo paths.
- [ ] 00.9 CLI tests can run against the sandbox and keep JSON output free of spinner noise.
