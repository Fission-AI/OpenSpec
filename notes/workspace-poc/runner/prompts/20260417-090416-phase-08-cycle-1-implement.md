Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 08 - Workspace Open
Type: Build
Output directory: notes/workspace-poc/phase-08-workspace-open/
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
- Summary: notes/workspace-poc/phase-08-workspace-open//SUMMARY.md
- Verification: notes/workspace-poc/phase-08-workspace-open//VERIFY.md
- Manual test: notes/workspace-poc/phase-08-workspace-open//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-08-workspace-open//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 08 - Workspace Open

Type: Build

Usable outcome: A user can open the workspace in planning-only mode or open a specific change with only its target repos attached.

Output summary directory: `notes/workspace-poc/phase-08-workspace-open/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 08.1 Implement `workspace open --change <id> [--agent <tool>]`.
- [ ] 08.2 Implement planning-only mode when no change is supplied.
- [ ] 08.3 Ensure change-scoped open resolves only the change’s targeted repos.
- [ ] 08.4 Integrate with the existing command-generation/tooling path rather than inventing a new one.
- [ ] 08.5 Fail with actionable diagnostics when targeted repos are unresolved.

Acceptance tests:

- [ ] 08.6 `workspace open` without `--change` does not attach repo roots.
- [ ] 08.7 `workspace open --change <id>` attaches only targeted repos, not all registered repos.
- [ ] 08.8 Open fails clearly when a targeted repo path is stale or missing.
- [ ] 08.9 The chosen primary agent path produces a usable session launch or instruction surface.
