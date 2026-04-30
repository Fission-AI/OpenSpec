Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 21 - Workspace Guidance and Owner Visibility
Type: Build
Output directory: notes/workspace-poc/phase-21-workspace-guidance-and-owners/
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
- Summary: notes/workspace-poc/phase-21-workspace-guidance-and-owners//SUMMARY.md
- Verification: notes/workspace-poc/phase-21-workspace-guidance-and-owners//VERIFY.md
- Manual test: notes/workspace-poc/phase-21-workspace-guidance-and-owners//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-21-workspace-guidance-and-owners//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 21 - Workspace Guidance and Owner Visibility

Type: Build

Usable outcome: A fresh user can tell when workspace mode fits the job, capture owner or handoff information per repo, and see that information from the existing workspace surfaces.

Output summary directory: `notes/workspace-poc/phase-21-workspace-guidance-and-owners/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 21.1 Extend committed workspace repo metadata to capture optional owner or handoff information without storing machine-specific paths.
- [ ] 21.2 Add a backward-compatible CLI path to record or update owner or handoff information for a registered repo alias.
- [ ] 21.3 Surface owner or handoff information anywhere the workspace already shows affected repos and next actions, at minimum workspace-aware `status` and `workspace open`.
- [ ] 21.4 Add shipped user-facing guidance that explains when to use workspace mode versus stay repo-local, the supported end-to-end CLI flow, and how to re-enter or hand off an in-flight workspace change.

Acceptance tests:

- [ ] 21.5 Fresh users can discover from shipped docs or help when workspace mode is the right tool and what the supported CLI flow is.
- [ ] 21.6 When owner or handoff information is configured, workspace status and open surfaces expose it without leaking local paths into committed metadata.
- [ ] 21.7 Existing workspaces remain valid and readable when owner or handoff information is absent.
