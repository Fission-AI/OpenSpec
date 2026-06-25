## Why

After a user creates a workspace and registers repos, they need to open that workspace with an agent and have the agent understand the working set immediately.

The user should not need to explain where every repo lives, which aliases matter, or whether they are currently planning versus implementing. The workspace should provide that context.

## What Changes

Add the workspace-open experience:

```text
Open this workspace with my agent.
The agent sees the workspace root, registered repos, current changes, and relevant instructions.
```

The launch context should separate stable guidance from dynamic runtime scope:

- stable behavior belongs in workspace-level agent guidance where possible
- dynamic scope belongs in the launch prompt or equivalent runtime context
- registered repos should be visible even when no change is active
- change-scoped sessions should include the selected change and target repo context

Planning dependency:

- Depends on `workspace-create-and-register-repos`.

## Capabilities

### New Capabilities

- `workspace-agent-context`: Opens a workspace session with enough dynamic context for an agent to reason across registered repos.

### Modified Capabilities

- `context-injection`: Extends context construction to include workspace root, repo registry, active workspace changes, and selected change scope.

## Impact

- `openspec workspace open`
- Workspace prompt and agent-launch context.
- Generated or committed agent guidance for workspace mode.
- Tests for opening outside a workspace, opening a workspace by name, and opening change-scoped workspace sessions.
