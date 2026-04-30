## Why

Once repos are visible and the agent has workspace context, the user should be able to plan a cross-repo change without immediately materializing repo-local artifacts.

The user goal is:

```text
Explore the product goal across repos.
Decide the scope.
Create one workspace-level proposal that identifies the repo slices.
```

Planning should be the commitment point. Repo visibility alone should remain lightweight.

## What Changes

Add workspace-level change planning:

- create a workspace change from the coordination root
- capture the product goal once
- identify target repos by registered alias
- let the agent explore before committing to implementation slices
- keep the workspace as the planning source of truth

This slice should avoid rebuilding the POC's materialization-first behavior. Repo-local artifacts should not be created merely because a workspace change exists.

Planning dependency:

- Depends on `workspace-open-agent-context`.

## Capabilities

### New Capabilities

- `workspace-change-planning`: Creates and manages workspace-level proposals for cross-repo goals.

### Modified Capabilities

- `change-creation`: Adds workspace-aware change creation semantics and target repo selection.
- `openspec-conventions`: Defines the relationship between workspace-level planning and repo-local implementation work.

## Impact

- Workspace change creation.
- Target repo metadata and validation.
- Agent instructions for proposing cross-repo changes.
- Tests that registered repos are visible before change creation and that creating a change does not imply repo-local materialization.
