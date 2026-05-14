## Phase 1: Workspace Setup Skills

User-testable outcome: A user can run workspace setup, choose which agents get the active profile's OpenSpec skills, and verify the selected skills are generated in the workspace root only.

- [x] 1.1 Add an interactive workspace setup step named "Install agent skills" that asks which agents should get OpenSpec skills in this workspace.
- [x] 1.2 Preselect the preferred opener when that opener supports skills, while allowing users to choose different or additional agents.
- [x] 1.3 Support non-interactive agent selection with the existing `--tools all|none|<ids>` style.
- [x] 1.4 Validate workspace setup tool IDs using the same supported skill-generation tool set as repo initialization.
- [x] 1.5 Resolve the active global profile and use it to choose which workflow skills workspace setup installs.
- [x] 1.6 Ensure `openspec workspace setup` generates or refreshes OpenSpec agent skills in the workspace root for the selected agents.
- [x] 1.7 Keep setup-time skill generation scoped to the workspace planning home; do not write skills or OpenSpec artifacts into linked repos or folders during workspace setup.
- [x] 1.8 Keep workspace setup skill generation skills-only for this slice; do not generate slash commands or global command files even when global delivery includes commands.
- [x] 1.9 Define how setup reports generated, refreshed, skipped, failed, and skills-only delivery work in human and JSON output.
- [x] 1.10 Store the selected workspace skill agents and last-applied workflow IDs in workspace-local machine state.
- [x] 1.11 Preserve non-interactive setup compatibility when `--tools` is omitted by skipping skill installation with clear guidance.
- [x] 1.12 Manually run workspace setup in interactive and non-interactive modes and verify the selected profile workflows land only in the workspace root.
- [x] 1.13 Review the setup UX: prompt wording, defaults, skip path, profile/delivery messaging, success output, and JSON output are clear before moving on.

## Phase 2: Workspace Skill Updates

User-testable outcome: A user can change the global profile, run workspace update in an existing workspace, and see workspace-local skills refresh to the selected workflows with clear human and JSON output.

- [x] 2.1 Add a workspace update flow that refreshes, adds, or removes OpenSpec agent skills in an existing workspace.
- [x] 2.2 Let `openspec workspace update` resolve the current workspace when run from inside a workspace.
- [x] 2.3 Support named and selected-workspace update forms such as `openspec workspace update platform` and `openspec workspace update --workspace platform`.
- [x] 2.4 Support non-interactive update forms such as `openspec workspace update platform --tools codex,claude`.
- [x] 2.5 Remove only known OpenSpec-managed workflow skill directories for agents that are no longer selected.
- [x] 2.6 Sync workspace-local workflow skill directories to the current global profile selection.
- [x] 2.7 Keep workspace update skills-only for this slice; do not generate slash commands or global command files even when global delivery includes commands.
- [x] 2.8 Define how update reports refreshed, added, removed, skipped, failed, and skills-only delivery work in human and JSON output.
- [x] 2.9 Use stored selected agents when workspace update runs without `--tools`, and update that stored selection when `--tools` is passed.
- [x] 2.10 Detect workspace-local skill drift from the active global profile and report `openspec workspace update` guidance.
- [x] 2.11 Manually run workspace update for refresh, add, remove, no-op, omitted-`--tools`, and profile-change cases and verify linked repos remain unchanged.
- [x] 2.12 Review the update UX: command forms, current-workspace detection, profile/delivery messaging, drift messaging, removal messaging, and JSON output are understandable.

## Phase 3: Config Profile Workspace Apply

User-testable outcome: A user can run `openspec config profile` inside a workspace and choose whether to apply the changed global profile to that workspace now.

- [x] 3.1 Detect when `openspec config profile` runs from inside an OpenSpec workspace.
- [x] 3.2 After an actual profile or delivery change inside a workspace, prompt to apply changes to the current workspace now.
- [x] 3.3 When confirmed, run `openspec workspace update` for the current workspace instead of repo-local `openspec update`.
- [x] 3.4 When declined, report that global config changed and that `openspec workspace update` applies it later.
- [x] 3.5 Preserve existing repo-local `openspec config profile` apply behavior outside workspaces.
- [x] 3.6 Keep `openspec config profile core` non-interactive, but print workspace-specific `openspec workspace update` guidance when run inside a workspace.
- [x] 3.7 Warn on no-op config profile inside a workspace when workspace-local skills drift from the active global profile.
- [x] 3.8 Manually run `openspec config profile` inside a workspace for confirm, decline, no-op, drift-warning, and `core` preset paths.
- [x] 3.9 Review the config-profile UX: prompt wording, project/workspace distinction, no-op behavior, preset guidance, and follow-up guidance are clear.

## Phase 4: Workspace Change Creation

User-testable outcome: A user can create a workspace-level change from the coordination root, inspect its workspace planning artifacts, and confirm linked repos were not edited.

- [x] 4.1 Add a built-in `workspace-planning` schema and templates that keep the normal proposal/specs/design/tasks artifact shape.
- [x] 4.2 Define the workspace-planning specs artifact with nested `specs/**/*.md` output support and instructions for `specs/<area-or-repo>/<capability>/spec.md`.
- [x] 4.3 Add workspace-aware change creation from the workspace coordination root.
- [x] 4.4 Default workspace-scoped change creation to the `workspace-planning` schema.
- [x] 4.5 Store workspace-level changes under the workspace planning path rather than under linked repos or folders.
- [x] 4.6 Capture the product goal once at the workspace change level.
- [x] 4.7 Record or validate affected area names through workspace-scoped specs or task sections using registered workspace link names where applicable.
- [x] 4.8 Ensure creating a workspace change does not create repo-local OpenSpec artifacts or edit linked repos.
- [x] 4.9 Preserve repo-local change creation behavior outside workspaces.
- [x] 4.10 Manually create a workspace change from a coordination root and verify the generated artifacts, workspace-scoped specs/tasks, affected areas, and untouched linked repos.
- [x] 4.11 Review the change creation UX: goal capture, affected-area identification, artifact paths, and next-step guidance feel clear.

## Phase 5: Planning Home And Agent Context

User-testable outcome: A user can run status and instructions for repo-local and workspace changes and see the resolved planning home, artifact paths, affected areas, constraints, and next steps.

- [x] 5.1 Introduce a shared planning-home resolver that identifies repo-local versus workspace planning homes.
- [x] 5.2 Enrich `openspec status --change <id> --json` with planning home, change root, relevant artifact paths, affected areas, next steps, and action context.
- [x] 5.3 Enrich `openspec instructions <artifact> --change <id> --json` with resolved artifact paths for repo-local and workspace-scoped changes.
- [x] 5.4 Keep workspace-level planning as the source of truth until an explicit implementation workflow selects an affected area.
- [x] 5.5 Preserve nested workspace spec paths in status and instructions output without flattening them into repo-local capability paths.
- [x] 5.6 Manually run status and instructions for both repo-local and workspace-scoped changes and verify paths and action context are correct.
- [x] 5.7 Review the planning-context UX: human output, JSON field names, and next-step guidance are easy for users and agents to follow.

## Phase 6: Workflow Skill Instructions

User-testable outcome: A user can inspect regenerated workflow skills and verify they are path-agnostic and tell agents to use CLI-reported artifact paths.

- [x] 6.1 Update generated workflow skill templates to run `openspec status --change <id> --json` before artifact work and trust returned planning context.
- [x] 6.2 Update generated workflow skill templates to run `openspec instructions <artifact> --change <id> --json` before writing artifacts and use the resolved output path.
- [x] 6.3 Audit source workflow templates for hardcoded `openspec/changes/<name>` assumptions and replace them with CLI-reported path guidance.
- [x] 6.4 Keep a separate artifact-context command out of this slice unless enriched status/instructions prove insufficient during implementation.
- [x] 6.5 Manually regenerate or inspect installed workflow skills and verify they follow CLI-reported artifact paths in a workspace change.
- [x] 6.6 Guard profile-selected workflow skills whose workspace behavior is not implemented yet so they do not fall back to repo-local paths or edit linked repos.
- [x] 6.7 Review the agent-instruction UX: instructions are concise, path-agnostic, safe for unsupported workspace workflows, and practical for both repo-local and workspace planning.

## Phase 7: Verification

User-testable outcome: A user or reviewer can run the full manual checklist from a clean workspace and compare expected versus actual evidence for every earlier phase.

- [x] 7.1 Add tests that workspace setup installs skills in the workspace root and leaves linked repos unchanged.
- [x] 7.2 Add tests that workspace update refreshes, adds, and removes only managed workspace skill directories.
- [x] 7.3 Add tests that workspace setup/update use the current global profile for workflow skill selection while keeping workspace delivery skills-only.
- [x] 7.4 Add tests that `openspec config profile` inside a workspace can apply changes through `openspec workspace update`.
- [x] 7.5 Add tests for stored workspace skill agent selection, omitted-`--tools` behavior, and profile drift reporting.
- [x] 7.6 Add tests that `openspec update` from a workspace planning home redirects to `openspec workspace update`.
- [x] 7.7 Add tests that unsupported workspace workflow skills are guarded and do not instruct repo-local fallback edits.
- [x] 7.8 Add tests that registered repos are visible before change creation.
- [x] 7.9 Add tests that workspace change creation does not imply repo-local artifact creation.
- [x] 7.10 Add tests that the workspace-planning schema resolves nested `specs/<area-or-repo>/<capability>/spec.md` files as workspace-scoped specs.
- [x] 7.11 Add cross-platform path tests for workspace-root skill paths and workspace change paths.
- [x] 7.12 Update CLI docs, command help, and shell completion coverage for `workspace update`, `--tools`, profile behavior, and workspace skills-only delivery.
- [x] 7.13 Run `openspec validate workspace-change-planning --strict`.
- [x] 7.14 Run the full manual acceptance checklist across setup, update, config profile, change creation, planning context, and workflow skills before marking the change complete.
- [x] 7.15 Complete a final UX review across the whole workflow and record any follow-up fixes or intentional deferrals.
- [x] 7.16 Before implementation sign-off, record the manual commands or interaction paths, expected observations, and actual observations for each phase.
- [x] 7.17 Have a separate reviewer or fresh agent context rerun the manual acceptance and UX checklist when available; otherwise rerun it from a clean temporary workspace and report the evidence.

## Verification Evidence

Completion evidence was recorded on 2026-05-14.

Automated checks:

```bash
pnpm run build
pnpm vitest run test/commands/workspace.test.ts test/commands/artifact-workflow.test.ts test/core/workspace/skills.test.ts test/core/planning-home.test.ts test/core/templates/skill-templates-parity.test.ts
node dist/cli/index.js validate workspace-change-planning --strict
git diff --check
```

Clean workspace rerun covered non-interactive workspace setup, workspace doctor, config profile update guidance, workspace update redirection, workspace change creation with `--areas api,web`, status/instructions JSON for nested workspace specs, linked repo cleanliness, and guarded unsupported workflow skills.

Observed results:

- Build, targeted tests, strict validation, and whitespace checks passed.
- Workspace setup/update generated skills only in the workspace root and left linked repos untouched.
- Workspace change creation used schema `workspace-planning`, reported affected areas `api` and `web`, preserved nested `specs/api/login/spec.md`, and kept `actionContext.allowedEditRoots` empty during planning.
- Generated workflow skills used CLI-reported paths and workspace guards rather than hardcoded `openspec/changes/<name>` paths.
- Fresh-agent rerun was not available; the clean temporary workspace rerun served as the fallback independent acceptance pass.
