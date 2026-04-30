## Why

Users need a workspace to feel like a durable place for cross-repo planning, not like a special command mode that appears only after implementation work has started.

The foundation should establish the workspace mental model before any higher-level workflow depends on it:

```text
I have a multi-repo product goal.
I create an OpenSpec workspace.
That workspace has its own planning surface and local repo registry.
```

The POC proved that workspace state is useful, but the reimplementation should make the core model boring, explicit, and easy for agents to explain.

## What Changes

Define the foundational workspace model:

- workspace root detection
- workspace metadata directory naming
- committed planning surface versus local-only machine state
- stable repo aliases as the durable identity for registered repos
- compatibility expectations between repo-local OpenSpec projects and coordination workspaces

This slice should settle whether the workspace metadata directory is `.openspec-workspace/` or another name before other changes build on the storage contract.

Planning dependency:

- None. This is the first implementation slice.

## Capabilities

### New Capabilities

- `workspace-foundation`: Defines the durable workspace root, metadata, and local-state model used by later workspace workflows.

### Modified Capabilities

- `openspec-conventions`: Adds conventions for distinguishing repo-local OpenSpec projects from coordination workspaces.

## Impact

- Workspace root and metadata helpers.
- Workspace configuration parsing and validation.
- Documentation and agent guidance for the workspace mental model.
- No repo registration, agent launch, change planning, apply, verify, or archive behavior should depend on hidden assumptions outside this foundation.
