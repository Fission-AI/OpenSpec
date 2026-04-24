Execute the implementation context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: /Users/tabishbidiwale/fission/repos/openspec
Roadmap: ROADMAP.md
Phase: 03 - Repo Registry and Doctor
Type: Build
Output directory: notes/workspace-poc/phase-03-repo-registry/
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
- Summary: notes/workspace-poc/phase-03-repo-registry//SUMMARY.md
- Verification: notes/workspace-poc/phase-03-repo-registry//VERIFY.md
- Manual test: notes/workspace-poc/phase-03-repo-registry//MANUAL_TEST.md


Stage-specific instructions:
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update notes/workspace-poc/phase-03-repo-registry//SUMMARY.md with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes

- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.

Phase block from ROADMAP.md:

## Phase 03 - Repo Registry and Doctor

Type: Build

Usable outcome: A workspace can register repo aliases and validate them with `workspace add-repo` and `workspace doctor`.

Output summary directory: `notes/workspace-poc/phase-03-repo-registry/`

Completion checklist:

- [ ] Tasks completed
- [ ] Acceptance tests satisfied
- [ ] Independent verification complete
- [ ] Manual testing complete
- [ ] Phase complete

Tasks:

- [ ] 03.1 Implement committed alias storage in `.openspec/workspace.yaml`.
- [ ] 03.2 Implement absolute path storage in `.openspec/local.yaml`.
- [ ] 03.3 Validate that registered paths exist and contain repo-local OpenSpec state.
- [ ] 03.4 Canonicalize stored local paths.
- [ ] 03.5 Implement `workspace doctor` to check alias resolution, missing repos, and overlay drift.

Acceptance tests:

- [ ] 03.6 `workspace add-repo <alias> <path>` stores the alias in committed metadata and the path only in local metadata.
- [ ] 03.7 Missing paths and duplicate aliases fail cleanly.
- [ ] 03.8 Paths are canonicalized before persistence.
- [ ] 03.9 `workspace doctor` reports stale or missing repos without mutating state.
- [ ] 03.10 No absolute path leaks into committed workspace files.
