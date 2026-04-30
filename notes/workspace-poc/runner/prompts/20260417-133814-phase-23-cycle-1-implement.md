Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 23 - Workspace Target Set Adjustment
Type: Build
Output directory: notes/workspace-poc/phase-23-workspace-target-set-adjustment/
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
- Summary: notes/workspace-poc/phase-23-workspace-target-set-adjustment//SUMMARY.md
- Verification: notes/workspace-poc/phase-23-workspace-target-set-adjustment//VERIFY.md
- Manual test: notes/workspace-poc/phase-23-workspace-target-set-adjustment//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-23-workspace-target-set-adjustment//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 23 - Workspace Target Set Adjustment

Type: Build

Usable outcome: Users can adjust the target set on a workspace change after creation without manual file edits or silent authority drift.

Output summary directory: `notes/workspace-poc/phase-23-workspace-target-set-adjustment/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 23.1 Add a minimal explicit command path to add or remove target aliases from an existing workspace change.
- [ ] 23.2 Keep workspace change metadata, per-target draft artifacts, and workspace registry validation coherent when targets are added or removed.
- [ ] 23.3 Define and implement safe guardrails for removing a target that has already been materialized or otherwise moved into repo-local execution.
- [ ] 23.4 Update workspace `open`, `apply`, and workspace-aware `status` to respect the adjusted target set.

Acceptance tests:

- [ ] 23.5 Adding a target updates the workspace change metadata and scaffolds the new per-target draft slice.
- [ ] 23.6 Removing an unmaterialized target updates the workspace cleanly without corrupting other targets.
- [ ] 23.7 Removing or mutating a materialized target fails or requires an explicit documented safety path instead of silently breaking authority handoff.
