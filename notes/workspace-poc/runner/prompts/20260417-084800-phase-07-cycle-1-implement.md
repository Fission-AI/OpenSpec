Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 07 - Research Minimum `workspace open` Contract
Type: Research
Output directory: notes/workspace-poc/phase-07-open-contract-research/
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
- Summary: notes/workspace-poc/phase-07-open-contract-research//SUMMARY.md
- Verification: notes/workspace-poc/phase-07-open-contract-research//VERIFY.md
- Manual test: notes/workspace-poc/phase-07-open-contract-research//MANUAL_TEST.md
- Decision: notes/workspace-poc/phase-07-open-contract-research//DECISION.md

Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-07-open-contract-research//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes
- Also write or update notes/workspace-poc/phase-07-open-contract-research//DECISION.md with the concrete decision, rationale, and rejected alternatives.
- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 07 - Research Minimum `workspace open` Contract

Type: Research

Usable outcome: The team decides the smallest honest v0 behavior for `workspace open --change` without overcommitting to multi-root agent support that may not be real.

Output summary directory: `notes/workspace-poc/phase-07-open-contract-research/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 07.1 Write the research note in `notes/workspace-poc/phase-07-open-contract-research/DECISION.md`.
- [ ] 07.2 Decide the minimum v0 behavior for planning-only mode, change-scoped attached mode, supported agent targets for the demo path, and failure behavior when one or more targeted repos are unresolved.
- [ ] 07.3 Choose whether non-primary agents are supported, partial, or explicitly out of scope in v0.

Acceptance tests:

- [ ] 07.4 The research note names one recommended contract and at least one rejected alternative.
- [ ] 07.5 The note defines exact user-visible behavior for `workspace open --change <id>` and `workspace open` with no change.
- [ ] 07.6 The note lists testable success and failure cases for the next phase.
