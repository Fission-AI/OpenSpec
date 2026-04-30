## Why

Users start workspace work by collecting the repos involved in a product goal. They should not have to create a change before the system can see those repos.

The product rule is:

```text
Repository visibility is not change commitment.
```

A registered repo is part of the workspace working set. A change is a later planning commitment.

## What Changes

Add the user-facing flow for creating a workspace and registering repos:

```text
Create a workspace.
Add repos by stable aliases.
See which repos are available to the workspace.
```

Expected user surface:

```bash
openspec workspace create my-workspace
openspec workspace add-repo openspec /path/to/openspec
openspec workspace add-repo landing /path/to/openspec-landing
```

The system should store committed repo guidance separately from local checkout paths so a workspace can be shared without committing machine-specific state.

Planning dependency:

- Depends on `workspace-foundation`.

## Capabilities

### New Capabilities

- `workspace-repo-registry`: Lets users create a workspace and register repos as the working set for future cross-repo planning.

### Modified Capabilities

- `cli-artifact-workflow`: Introduces workspace setup commands that happen before change creation.

## Impact

- `openspec workspace create`
- `openspec workspace add-repo`
- Workspace metadata and local overlay files.
- Docs and generated agent guidance that explain registered repos as visibility, not implementation commitment.
