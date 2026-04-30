Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 11 - Target Materialization via `apply`
Type: Build
Output directory: notes/workspace-poc/phase-11-apply-materialization/
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
- Summary: notes/workspace-poc/phase-11-apply-materialization//SUMMARY.md
- Verification: notes/workspace-poc/phase-11-apply-materialization//VERIFY.md
- Manual test: notes/workspace-poc/phase-11-apply-materialization//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-11-apply-materialization//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 11 - Target Materialization via `apply`

Type: Build

Usable outcome: A selected target can be materialized into its repo with `openspec apply --change <id> --repo <alias>`.

Output summary directory: `notes/workspace-poc/phase-11-apply-materialization/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 11.1 Extend `apply` to understand workspace topology.
- [ ] 11.2 Materialize only the selected target slice into the target repo.
- [ ] 11.3 Reuse the same change ID in the target repo.
- [ ] 11.4 Keep workspace planning artifacts intact after materialization.
- [ ] 11.5 Make the authority handoff explicit: workspace draft before `apply`, repo-local execution after `apply`.
- [ ] 11.6 Write the minimum trace metadata needed for later status roll-up.

Acceptance tests:

- [ ] 11.7 Materialization creates a repo-local change with the same change ID.
- [ ] 11.8 Only the selected target repo is modified.
- [ ] 11.9 Untargeted aliases and unknown aliases fail clearly.
- [ ] 11.10 Repeating `apply` follows the v0 contract from Phase 10.
- [ ] 11.11 Workspace drafts remain intact after successful materialization.
