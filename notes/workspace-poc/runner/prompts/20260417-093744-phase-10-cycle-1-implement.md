Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 10 - Research Materialization Contract
Type: Research
Output directory: notes/workspace-poc/phase-10-materialization-contract-research/
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
- Summary: notes/workspace-poc/phase-10-materialization-contract-research//SUMMARY.md
- Verification: notes/workspace-poc/phase-10-materialization-contract-research//VERIFY.md
- Manual test: notes/workspace-poc/phase-10-materialization-contract-research//MANUAL_TEST.md
- Decision: notes/workspace-poc/phase-10-materialization-contract-research//DECISION.md

Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-10-materialization-contract-research//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes
- Also write or update notes/workspace-poc/phase-10-materialization-contract-research//DECISION.md with the concrete decision, rationale, and rejected alternatives.
- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 10 - Research Materialization Contract

Type: Research

Usable outcome: The materialization contract is explicit before `apply --change --repo` is implemented.

Output summary directory: `notes/workspace-poc/phase-10-materialization-contract-research/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 10.1 Write the research note in `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`.
- [ ] 10.2 Decide the v0 rule for create-only vs refresh, overwrite behavior, rerun behavior, conflict handling, and the minimum metadata written during materialization.
- [ ] 10.3 Prefer the simplest honest contract for the POC, even if refresh is deferred.

Acceptance tests:

- [ ] 10.4 The research note chooses one v0 contract and names explicit non-goals.
- [ ] 10.5 The note defines what counts as a successful materialization.
- [ ] 10.6 The note defines the expected behavior for repeat `apply` calls.
