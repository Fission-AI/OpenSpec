## Why

After a user creates a workspace and links repos or folders, they need to open that workspace with an agent and have the agent understand the working set immediately.

The user should not need to explain where every repo lives, which aliases matter, or whether they are currently planning versus implementing. The workspace should provide that context.

## What Changes

Add the workspace-open experience:

```text
Open this workspace with my agent.
The agent sees the workspace location, linked repos or folders, current changes, and relevant instructions.
```

Links are the planning context. The local registry is only a workspace-discovery index for finding known workspaces on the current machine.

The launch context should separate stable guidance from dynamic runtime scope:

- stable behavior belongs in workspace-level agent guidance where possible
- dynamic scope belongs in the launch prompt or equivalent runtime context
- linked repos or folders should be visible even when no change is active
- change-scoped sessions should include the selected change and target repo context

Planning dependency:

- Depends on `workspace-create-and-register-repos`.

## Capabilities

### New Capabilities

- `workspace-agent-context`: Opens a workspace session with enough dynamic context for an agent to reason across linked repos or folders.

### Modified Capabilities

- `context-injection`: Extends context construction to include workspace location, workspace links, active workspace changes, and selected change scope.

## Impact

- `openspec workspace open`
- Workspace prompt and agent-launch context.
- Generated or committed agent guidance for workspace mode.
- Tests for opening outside a workspace, opening a workspace by name, and opening change-scoped workspace sessions.
