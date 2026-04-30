Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 18 - Deferred Research: Shared-Contract Promotion and Stable IDs
Type: Research
Output directory: notes/workspace-poc/phase-18-deferred-research/
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
- Summary: notes/workspace-poc/phase-18-deferred-research//SUMMARY.md
- Verification: notes/workspace-poc/phase-18-deferred-research//VERIFY.md
- Manual test: notes/workspace-poc/phase-18-deferred-research//MANUAL_TEST.md
- Decision: notes/workspace-poc/phase-18-deferred-research//DECISION.md

Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-18-deferred-research//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes
- Also write or update notes/workspace-poc/phase-18-deferred-research//DECISION.md with the concrete decision, rationale, and rejected alternatives.
- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 18 - Deferred Research: Shared-Contract Promotion and Stable IDs

Type: Research

Usable outcome: Deferred questions are captured cleanly without bloating the POC implementation.

Output summary directory: `notes/workspace-poc/phase-18-deferred-research/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 18.1 Write the research note in `notes/workspace-poc/phase-18-deferred-research/DECISION.md`.
- [ ] 18.2 Capture the recommended next-step design for shared-contract promotion into canonical owner repos, migration from local alias/path overlays to stable project IDs, and whether any team-shared workspace semantics should exist after the POC.
- [ ] 18.3 Keep this phase explicitly non-blocking for the working POC.

Acceptance tests:

- [ ] 18.4 The research note separates deferred concerns from the shipped POC contract.
- [ ] 18.5 The note identifies which future changes would break current tests or fixture shape.
- [ ] 18.6 The note names at least one migration seam that preserves backward compatibility.
