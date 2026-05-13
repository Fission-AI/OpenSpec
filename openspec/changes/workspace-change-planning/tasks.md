## 1. Workspace Setup Skills

- [ ] 1.1 Add an interactive workspace setup step named "Install agent skills" that asks which agents should get OpenSpec skills in this workspace.
- [ ] 1.2 Preselect the preferred opener when that opener supports skills, while allowing users to choose different or additional agents.
- [ ] 1.3 Support non-interactive agent selection with the existing `--tools all|none|<ids>` style.
- [ ] 1.4 Validate workspace setup tool IDs using the same supported skill-generation tool set as repo initialization.
- [ ] 1.5 Ensure `openspec workspace setup` generates or refreshes OpenSpec agent skills in the workspace root for the selected agents.
- [ ] 1.6 Keep setup-time skill generation scoped to the workspace planning home; do not write skills or OpenSpec artifacts into linked repos or folders during workspace setup.
- [ ] 1.7 Keep workspace setup skill generation skills-only for this slice; do not generate slash commands or global command files.
- [ ] 1.8 Define how setup reports generated, refreshed, skipped, or failed skill installation work in human and JSON output.

## 2. Workspace Skill Updates

- [ ] 2.1 Add a workspace update flow that refreshes, adds, or removes OpenSpec agent skills in an existing workspace.
- [ ] 2.2 Let `openspec workspace update` resolve the current workspace when run from inside a workspace.
- [ ] 2.3 Support named and selected-workspace update forms such as `openspec workspace update platform` and `openspec workspace update --workspace platform`.
- [ ] 2.4 Support non-interactive update forms such as `openspec workspace update platform --tools codex,claude`.
- [ ] 2.5 Remove only known OpenSpec-managed workflow skill directories for agents that are no longer selected.
- [ ] 2.6 Define how update reports refreshed, added, removed, skipped, or failed skill work in human and JSON output.

## 3. Workspace Change Creation

- [ ] 3.1 Add a built-in `workspace-planning` schema and templates.
- [ ] 3.2 Add workspace-aware change creation from the workspace coordination root.
- [ ] 3.3 Default workspace-scoped change creation to the `workspace-planning` schema.
- [ ] 3.4 Store workspace-level changes under the workspace planning path rather than under linked repos or folders.
- [ ] 3.5 Capture the product goal once at the workspace change level.
- [ ] 3.6 Record or validate affected areas using registered workspace link names where applicable.
- [ ] 3.7 Ensure creating a workspace change does not create repo-local OpenSpec artifacts or edit linked repos.
- [ ] 3.8 Preserve repo-local change creation behavior outside workspaces.

## 4. Planning Home And Agent Context

- [ ] 4.1 Introduce a shared planning-home resolver that identifies repo-local versus workspace planning homes.
- [ ] 4.2 Enrich `openspec status --change <id> --json` with planning home, change root, relevant artifact paths, affected areas, next steps, and action context.
- [ ] 4.3 Enrich `openspec instructions <artifact> --change <id> --json` with resolved artifact paths for repo-local and workspace-scoped changes.
- [ ] 4.4 Keep workspace-level planning as the source of truth until an explicit implementation workflow selects an affected area.

## 5. Workflow Skill Instructions

- [ ] 5.1 Update generated workflow skill templates to run `openspec status --change <id> --json` before artifact work and trust returned planning context.
- [ ] 5.2 Update generated workflow skill templates to run `openspec instructions <artifact> --change <id> --json` before writing artifacts and use the resolved output path.
- [ ] 5.3 Audit source workflow templates for hardcoded `openspec/changes/<name>` assumptions and replace them with CLI-reported path guidance.
- [ ] 5.4 Keep a separate artifact-context command out of this slice unless enriched status/instructions prove insufficient during implementation.

## 6. Verification

- [ ] 6.1 Add tests that workspace setup installs skills in the workspace root and leaves linked repos unchanged.
- [ ] 6.2 Add tests that workspace update refreshes, adds, and removes only managed workspace skill directories.
- [ ] 6.3 Add tests that registered repos are visible before change creation.
- [ ] 6.4 Add tests that workspace change creation does not imply repo-local artifact creation.
- [ ] 6.5 Add cross-platform path tests for workspace-root skill paths and workspace change paths.
- [ ] 6.6 Run `openspec validate workspace-change-planning --strict`.
