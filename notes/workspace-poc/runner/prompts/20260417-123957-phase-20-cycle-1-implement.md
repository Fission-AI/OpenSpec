Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 20 - PRD Satisfaction Audit
Type: Test
Output directory: notes/workspace-poc/phase-20-prd-audit/
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
- Summary: notes/workspace-poc/phase-20-prd-audit//SUMMARY.md
- Verification: notes/workspace-poc/phase-20-prd-audit//VERIFY.md
- Manual test: notes/workspace-poc/phase-20-prd-audit//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-20-prd-audit//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 20 - PRD Satisfaction Audit

Type: Test

Usable outcome: The implementation is checked directly against `WORKSPACE_POC_PRD.md` rather than only against the roadmap or inferred intent.

Output summary directory: `notes/workspace-poc/phase-20-prd-audit/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 20.1 Compare the full implementation, docs, tests, and user-facing behavior against `WORKSPACE_POC_PRD.md`.
- [ ] 20.2 Identify every unmet, partially met, or ambiguous PRD requirement.
- [ ] 20.3 Validate that the implementation still respects the key guardrails from the PRD and decision record.
- [ ] 20.4 If any PRD gaps remain, insert concrete remediation phases immediately after this phase, each with acceptance tests and output directories, before allowing final signoff to proceed.

Acceptance tests:

- [ ] 20.5 Every meaningful PRD requirement is mapped to implemented behavior, explicit non-goal, or a documented gap.
- [ ] 20.6 Any remaining gaps result in newly inserted remediation phases, not a vague TODO list.
- [ ] 20.7 The audit output is concrete enough for a fresh agent session to act on immediately.
