Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 14 - Workspace Status Roll-Up
Type: Build
Output directory: notes/workspace-poc/phase-14-workspace-status/
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
- Summary: notes/workspace-poc/phase-14-workspace-status//SUMMARY.md
- Verification: notes/workspace-poc/phase-14-workspace-status//VERIFY.md
- Manual test: notes/workspace-poc/phase-14-workspace-status//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-14-workspace-status//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 14 - Workspace Status Roll-Up

Type: Build

Usable outcome: Running status from the workspace tells the user what is planned, materialized, active, blocked, complete, soft-done, and hard-done.

Output summary directory: `notes/workspace-poc/phase-14-workspace-status/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 14.1 Extend status behavior to recognize workspace topology.
- [ ] 14.2 Roll up central coordination state plus per-target execution state.
- [ ] 14.3 Keep output honest and minimal.
- [ ] 14.4 Add stable JSON output for workspace status.
- [ ] 14.5 Do not infer more than the underlying workspace and repo-local state can actually support.

Acceptance tests:

- [ ] 14.6 Workspace status distinguishes planning-only targets from materialized targets.
- [ ] 14.7 Status can report blocked states for stale repo paths or missing materializations when appropriate.
- [ ] 14.8 Soft-done only appears when all known coordination and target work is complete.
- [ ] 14.9 Hard-done only appears after explicit workspace archive/completion in a later phase.
- [ ] 14.10 JSON status output is stable and free of spinner contamination.
