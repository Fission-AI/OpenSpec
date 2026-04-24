Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 16 - Workspace Completion and Archive Semantics
Type: Build
Output directory: notes/workspace-poc/phase-16-workspace-archive/
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
- Summary: notes/workspace-poc/phase-16-workspace-archive//SUMMARY.md
- Verification: notes/workspace-poc/phase-16-workspace-archive//VERIFY.md
- Manual test: notes/workspace-poc/phase-16-workspace-archive//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-16-workspace-archive//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 16 - Workspace Completion and Archive Semantics

Type: Build

Usable outcome: The workspace has an explicit top-level completion/hard-done path while repo-local archive remains repo-local.

Output summary directory: `notes/workspace-poc/phase-16-workspace-archive/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 16.1 Decide the minimal command path for explicit workspace completion/archive using the existing archive surface where practical.
- [ ] 16.2 Preserve repo-local archive behavior and canonical spec ownership.
- [ ] 16.3 Ensure top-level hard-done is explicit and never implied by repo-local activity alone.
- [ ] 16.4 Record enough workspace-level completion state for status to report hard-done.

Acceptance tests:

- [ ] 16.5 Archiving a repo-local change does not automatically archive the workspace change.
- [ ] 16.6 Workspace hard-done requires explicit top-level user action.
- [ ] 16.7 Repo-local archive continues to operate against repo-local canonical specs.
- [ ] 16.8 Mixed repo cadences are allowed without invalidating workspace state.
