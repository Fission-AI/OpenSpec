Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 01 - Workspace Create Entrypoint
Type: Build
Output directory: notes/workspace-poc/phase-01-workspace-create/
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
- Summary: notes/workspace-poc/phase-01-workspace-create//SUMMARY.md
- Verification: notes/workspace-poc/phase-01-workspace-create//VERIFY.md
- Manual test: notes/workspace-poc/phase-01-workspace-create//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-01-workspace-create//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 01 - Workspace Create Entrypoint

Type: Build

Usable outcome: A user can create a persistent workspace root through `openspec workspace create <name>`.

Output summary directory: `notes/workspace-poc/phase-01-workspace-create/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 01.1 Add the `workspace` command group and the `workspace create` entrypoint.
- [ ] 01.2 Reuse the current init/setup path rather than inventing a second bootstrap system.
- [ ] 01.3 Implement managed workspace root creation.
- [ ] 01.4 Create `.openspec/workspace.yaml`, `.openspec/local.yaml`, and top-level `changes/`.
- [ ] 01.5 Ensure `.openspec/local.yaml` is treated as local-only state.
- [ ] 01.6 Make the created layout clearly distinct from repo-local `openspec/` roots.

Acceptance tests:

- [ ] 01.7 Creating a workspace produces `.openspec/workspace.yaml`, `.openspec/local.yaml`, and `changes/`.
- [ ] 01.8 The workspace root does not contain `openspec/changes`.
- [ ] 01.9 Re-running against an existing workspace fails or behaves idempotently in one explicit, documented way.
- [ ] 01.10 Invalid or duplicate workspace names fail with actionable errors.
