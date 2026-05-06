## Why

After a user creates a workspace and links repos or folders, they need to open that workspace with their preferred agent or editor and have the working set available immediately.

The workspace should provide repo and folder locations, link names, and the context that distinguishes planning from implementation.

## What Changes

Add the workspace-open experience:

```text
Open this workspace.
Use my preferred opener by default and honor explicit opener overrides.
The opener sees the workspace location, linked repos or folders, current changes, and relevant instructions.
```

Links are the planning context. The local registry serves as a workspace-discovery index for finding known workspaces on the current machine.

Expected user surface:

```bash
openspec workspace open
openspec workspace open platform
openspec workspace open --agent codex
openspec workspace open platform --agent github-copilot
openspec workspace open --editor
```

`workspace open` should open the current workspace when run from inside one, auto-select the only known workspace when run outside a workspace, and present an interactive picker when multiple known workspaces are available. Users can pass a workspace name as the positional argument when they want to choose explicitly.

Workspace setup should ask for and store a preferred opener in machine-local workspace state. `workspace open` uses that preference by default. `--agent <tool>` is a one-session override that leaves the saved preference unchanged.

`--editor` opens the workspace as an editor workspace. This is related to, but distinct from, `--agent github-copilot`: GitHub Copilot needs editor workspace support plus agent prompt context, while plain editor open should focus on opening the linked working set.

Workspace guidance should live in durable workspace files where possible:

- stable behavior belongs in workspace-level `AGENTS.md`
- opener-specific launch prompts stay minimal when required
- linked repos or folders are visible for exploration and planning before a change exists

This slice supports root workspace launching through the documented opener forms. Public preview (`--prepare-only`) and machine-readable context (`--json`) surfaces belong in a future context/query design if a clear user need appears.

This slice focuses on root workspace open behavior. Change-scoped sessions need the target model from workspace change planning before they can be specified cleanly.

Planning dependency:

- Depends on `workspace-create-and-register-repos`.

## Capabilities

### New Capabilities

- `workspace-open`: Opens a workspace through a preferred agent or VS Code editor with linked repos or folders available for exploration and planning.

### Modified Capabilities

- `workspace-foundation`: Extends machine-local workspace state and setup/link/relink behavior with a preferred opener and maintained openable workspace surface.

## Impact

- `openspec workspace open`
- Workspace setup preferred opener prompt and local preference storage.
- Workspace prompt, editor workspace, and agent-launch context.
- Generated or committed agent guidance for workspace mode.
- Tests for opening inside a workspace, auto-selecting one known workspace, picking among multiple known workspaces, opening by workspace name, one-session agent overrides, and editor open.
