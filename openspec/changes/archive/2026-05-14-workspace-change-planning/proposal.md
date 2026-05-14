## Why

Once repos are visible and the agent has workspace context, the user should be able to plan a cross-repo change without creating repo-local artifacts before implementation starts.

The user goal is:

```text
Explore the product goal across repos.
Decide the scope.
Create one workspace-level proposal that identifies the affected areas.
```

Planning should be the commitment point. Repo visibility alone should remain lightweight.

## What Changes

Add workspace-level change planning:

- install and refresh OpenSpec agent skills from the workspace root so agents can operate from the planning home
- use the active global workflow profile to decide which workflow skills are installed in the workspace
- keep `--tools` focused on which agents receive those workspace-local skills
- add a workspace-specific planning schema for workspace changes
- create a workspace change from the coordination root
- capture the product goal once
- identify affected areas by registered workspace link name where applicable
- let the agent explore before committing to affected areas or delivery slices
- keep the workspace as the planning source of truth
- update workflow skill instructions to use CLI-reported artifact paths instead of hardcoded repo-local paths

This slice should avoid creating repo-local artifacts as a side effect of planning. Repo-local artifacts should not be created merely because a workspace change exists.

Workspace setup and update may write agent skill files into the workspace root, such as `.codex/skills/` or `.claude/skills/`, because those files make the workspace planning home usable by agents. That setup work must not write OpenSpec artifacts or agent skill files into linked repos or folders.

Interactive setup should ask which agents should get OpenSpec skills in the workspace, preselecting the preferred opener when that opener supports skills. Workspace update should let users refresh or change those installed agent skills later, including when run from inside the workspace.

Workspace setup and update should treat the global profile as the workflow selection source. For this slice, workspace setup and update are skills-only even when global delivery is `commands` or `both`; command generation for workspaces is deferred.

`openspec config profile` should remain global, but when it runs from inside an OpenSpec workspace and changes the global profile or delivery settings, it should offer to apply the new workflow selection to the current workspace by running `openspec workspace update`.

Workspace-local skill selection should be machine-local state: setup records which agents received skills, update refreshes that stored selection by default, and explicit `--tools` changes the stored selection. OpenSpec should detect when workspace-local skills drift from the current global profile and give clear update guidance.

Selected profile workflows that are not yet fully implemented for workspace-scoped changes should still be safe. Generated skills and CLI guidance must guard unsupported workspace actions instead of falling back to repo-local behavior or editing linked repos implicitly.

Workspace help, docs, and completions should make the distinction legible: `openspec update` remains repo/project sync, while `openspec workspace update` syncs workspace-local agent skills.

Planning dependency:

- Depends on `workspace-open-agent-context`.

## Capabilities

### New Capabilities

- `workspace-change-planning`: Creates and manages workspace-level proposals for cross-repo goals.

### Modified Capabilities

- `workspace-links`: Adds workspace setup/update behavior for workspace-local agent skill installation.
- `cli-config`: Makes `openspec config profile` aware of workspace roots and able to apply global profile changes to the current workspace.
- `change-creation`: Adds workspace-aware change creation semantics and affected area identification.
- `cli-artifact-workflow`: Enriches workflow status and instructions so agents can discover planning context and artifact paths without hardcoded repo-local assumptions.
- `artifact-graph`: Adds a built-in workspace planning schema for workspace-scoped changes.
- `schema-resolution`: Ensures workspace-scoped change creation and workflow commands can resolve the workspace planning schema.
- `openspec-conventions`: Defines the relationship between workspace-level planning and repo-local implementation work.

## Impact

- Workspace change creation.
- Workspace-specific planning schema and templates.
- Affected area metadata and validation.
- Workspace setup and update behavior for installing or refreshing agent skills in the workspace root.
- Global profile integration for workspace-local skill workflow selection.
- Workspace-aware `openspec config profile` apply prompt behavior.
- Workspace-local agent skill selection state and drift detection.
- Guarded workflow guidance for profile workflows whose workspace behavior is not implemented in this slice.
- Docs, help, and completions for workspace skill update behavior.
- Agent instructions for proposing cross-repo changes without hardcoded change paths.
- Tests that registered repos are visible before change creation and that creating a change does not imply repo-local artifact creation.
