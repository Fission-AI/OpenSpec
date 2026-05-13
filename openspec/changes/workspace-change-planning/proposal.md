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

Planning dependency:

- Depends on `workspace-open-agent-context`.

## Capabilities

### New Capabilities

- `workspace-change-planning`: Creates and manages workspace-level proposals for cross-repo goals.

### Modified Capabilities

- `workspace-links`: Adds workspace setup/update behavior for workspace-local agent skill installation.
- `change-creation`: Adds workspace-aware change creation semantics and affected area selection.
- `cli-artifact-workflow`: Enriches workflow status and instructions so agents can discover planning context and artifact paths without hardcoded repo-local assumptions.
- `artifact-graph`: Adds a built-in workspace planning schema for workspace-scoped changes.
- `schema-resolution`: Ensures workspace-scoped change creation and workflow commands can resolve the workspace planning schema.
- `openspec-conventions`: Defines the relationship between workspace-level planning and repo-local implementation work.

## Impact

- Workspace change creation.
- Workspace-specific planning schema and templates.
- Affected area metadata and validation.
- Workspace setup and update behavior for installing or refreshing agent skills in the workspace root.
- Agent instructions for proposing cross-repo changes without hardcoded change paths.
- Tests that registered repos are visible before change creation and that creating a change does not imply repo-local artifact creation.
