Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 13 - Research Status Roll-Up and Reverse Links
Type: Research
Output directory: notes/workspace-poc/phase-13-status-research/
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
- Summary: notes/workspace-poc/phase-13-status-research//SUMMARY.md
- Verification: notes/workspace-poc/phase-13-status-research//VERIFY.md
- Manual test: notes/workspace-poc/phase-13-status-research//MANUAL_TEST.md
- Decision: notes/workspace-poc/phase-13-status-research//DECISION.md

Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-13-status-research//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes
- Also write or update notes/workspace-poc/phase-13-status-research//DECISION.md with the concrete decision, rationale, and rejected alternatives.
- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 13 - Research Status Roll-Up and Reverse Links

Type: Research

Usable outcome: Status semantics are concrete enough to implement without inventing misleading lifecycle labels.

Output summary directory: `notes/workspace-poc/phase-13-status-research/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 13.1 Write the research note in `notes/workspace-poc/phase-13-status-research/DECISION.md`.
- [ ] 13.2 Define the minimum v0 workspace states and their derivation rules: planned, materialized, in progress, blocked, complete, soft-done, and hard-done.
- [ ] 13.3 Decide whether repo-local changes need reverse links back to the workspace change in v0.
- [ ] 13.4 Define the minimum JSON status shape that tests can lock down.

Acceptance tests:

- [ ] 13.5 The research note gives one precise derivation rule per state.
- [ ] 13.6 The note defines which states rely on repo-local inspection and which rely on workspace state alone.
- [ ] 13.7 The note resolves whether reverse links are required, optional, or deferred.
