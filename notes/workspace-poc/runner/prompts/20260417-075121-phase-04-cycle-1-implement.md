Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 04 - Validate Repo Registry and Doctor
Type: Test
Output directory: notes/workspace-poc/phase-04-test-repo-registry/
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
- Summary: notes/workspace-poc/phase-04-test-repo-registry//SUMMARY.md
- Verification: notes/workspace-poc/phase-04-test-repo-registry//VERIFY.md
- Manual test: notes/workspace-poc/phase-04-test-repo-registry//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-04-test-repo-registry//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 04 - Validate Repo Registry and Doctor

Type: Test

Usable outcome: Repo registration becomes trustworthy enough for targeted changes and later agent attachment.

Output summary directory: `notes/workspace-poc/phase-04-test-repo-registry/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 04.1 Add pure tests for alias parsing, path canonicalization, committed-vs-local serialization, and doctor diagnostics.
- [ ] 04.2 Add command tests for add-repo and doctor using the workspace sandbox.
- [ ] 04.3 Add CLI e2e coverage for happy path and stale path scenarios.

Acceptance tests:

- [ ] 04.4 Doctor detects missing repo roots, missing `openspec/`, and alias/path drift.
- [ ] 04.5 Committed metadata remains stable across local path changes.
- [ ] 04.6 Repairing a stale path in `local.yaml` restores doctor success.
- [ ] 04.7 The registry remains readable after multiple repo additions in one workspace.
