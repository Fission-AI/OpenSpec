Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 05 - Target-Aware Workspace Change Creation
Type: Build
Output directory: notes/workspace-poc/phase-05-targeted-change-create/
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
- Summary: notes/workspace-poc/phase-05-targeted-change-create//SUMMARY.md
- Verification: notes/workspace-poc/phase-05-targeted-change-create//VERIFY.md
- Manual test: notes/workspace-poc/phase-05-targeted-change-create//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-05-targeted-change-create//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 05 - Target-Aware Workspace Change Creation

Type: Build

Usable outcome: A workspace can create a central cross-repo change with `openspec new change <id> --targets <a,b,c>`.

Output summary directory: `notes/workspace-poc/phase-05-targeted-change-create/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 05.1 Extend change creation to support workspace topology.
- [ ] 05.2 Record explicit targets in workspace change metadata.
- [ ] 05.3 Scaffold central planning artifacts in the workspace change: proposal, design, coordination tasks, and per-target draft task/spec partitions.
- [ ] 05.4 Hard-fail if a requested target alias is unknown.
- [ ] 05.5 Ensure no repo-local artifacts are created yet.

Acceptance tests:

- [ ] 05.6 Creating a targeted workspace change records the exact target set.
- [ ] 05.7 Per-target planning directories are created under the workspace change.
- [ ] 05.8 Unknown or duplicate targets fail with actionable errors.
- [ ] 05.9 Repo-local repos remain untouched until `apply`.
- [ ] 05.10 Duplicate change IDs still fail predictably.
