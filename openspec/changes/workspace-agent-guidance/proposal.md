## Why

Workspace change planning can now create a shared planning home and install OpenSpec workflow skills into that home, but the installed skills still behave mostly like repo-local workflow skills. They are path-aware and guarded after a change exists, yet they do not give agents a strong workspace-native operating model before and during planning.

This leaves a gap right after `workspace-change-planning`: an agent opened in a workspace should know how to explore linked repos, create a workspace change with the captured product goal, use known affected areas, and keep linked repos read-only until an explicit implementation workflow selects an allowed edit root.

## What Changes

- Add workspace-native guidance to workspace-local agent skill installation and refresh.
- Teach change-starting workflow skills how to recognize workspace planning context.
- In workspace planning homes, have generated skills pass `--goal` and known `--areas` when creating workspace changes.
- Keep unresolved affected areas visible when the agent cannot determine them confidently.
- Clarify that workspace planning metadata flags are workspace-scoped and should not be treated as generic repo-local change metadata.
- Preserve the existing path-agnostic status/instructions pattern and unsupported-workflow guards.

## Capabilities

### New Capabilities

-

### Modified Capabilities

- `workspace-links`: Workspace-local skill installation includes workspace-native agent guidance.
- `cli-artifact-workflow`: Generated workflow skills start workspace changes with workspace planning context.
- `change-creation`: Workspace planning metadata flags are treated as workspace-scoped change creation inputs.

## Impact

- Skill template content for workspace setup/update.
- Workspace-local skill generation and update behavior.
- Tests for generated skill content in workspace mode.
- CLI help/docs if flag semantics or workspace skill behavior become clearer to users.
