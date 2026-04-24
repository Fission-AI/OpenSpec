Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 22 - Validate Guidance and Owner Visibility
Type: Test
Output directory: notes/workspace-poc/phase-22-test-workspace-guidance-and-owners/
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
- Summary: notes/workspace-poc/phase-22-test-workspace-guidance-and-owners//SUMMARY.md
- Verification: notes/workspace-poc/phase-22-test-workspace-guidance-and-owners//VERIFY.md
- Manual test: notes/workspace-poc/phase-22-test-workspace-guidance-and-owners//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-22-test-workspace-guidance-and-owners//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 22 - Validate Guidance and Owner Visibility

Type: Test

Usable outcome: Guidance and owner or handoff visibility are proven on real workspace state and remain backward-compatible with the shipped POC.

Output summary directory: `notes/workspace-poc/phase-22-test-workspace-guidance-and-owners/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 22.1 Add unit, command, and CLI coverage for owner or handoff metadata plus the updated docs or help surface.
- [ ] 22.2 Verify older workspace fixtures and workspaces without owner or handoff metadata still pass unchanged.
- [ ] 22.3 Run manual CLI checks for docs or help, `workspace open`, and workspace-aware `status` from a fresh workspace.

Acceptance tests:

- [ ] 22.4 Shipped docs or help no longer require the PRD or roadmap to explain when workspace mode is appropriate.
- [ ] 22.5 Workspace text and JSON surfaces show configured owner or handoff information consistently.
- [ ] 22.6 Existing ownerless workspaces and the Phase 19 acceptance flow continue to pass.
