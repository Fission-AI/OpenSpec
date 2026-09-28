## Why

Users need a workspace to feel like the obvious home for planning across multiple repos or folders.

They should be able to think:

```text
I have repos or folders that are often planned together.
I create an OpenSpec workspace.
That workspace is where changes live.
My code stays where it is.
OpenSpec links the workspace to those local paths.
```

A workspace is not a feature. It is the durable planning home. Individual features, fixes, and projects are changes inside the workspace.

Users should not have to choose a storage location, create a change early, or understand internal workspace state before OpenSpec can orient itself.

The POC proved that workspace state is useful. This reimplementation should turn that into a simple product model that users and agents can explain without special-case vocabulary.

## What Changes

This change defines the user-facing foundation for OpenSpec workspaces.

An OpenSpec workspace has a recognizable planning home:

```text
workspace-root/
  changes/
  .openspec-workspace/
```

`changes/` is where workspace-level planning lives. `.openspec-workspace/` identifies the directory as an OpenSpec workspace and stores workspace state.

OpenSpec-managed workspaces live in one standard location:

```text
<global-data-dir>/workspaces/
```

Users should not need to choose that location. OpenSpec still shows the workspace path after setup so users know where planning files live. This foundation slice does not provide a workspace-specific environment-variable or configuration override for managed workspace storage.

OpenSpec also keeps a lightweight local registry of known workspaces on the current machine. The registry powers global commands, pickers, and listing, but each workspace folder remains the source of truth.

Workspace state is split by user expectation:

- shared workspace information can move between machines
- local checkout paths stay local to each machine
- linked repos and folders are referred to by stable link names, not by absolute paths

A linked path can be a full repo, a folder inside a monorepo, or another existing folder the workspace should plan against. A linked path does not need repo-local `openspec/` state before it can be included in workspace planning. Repo-local OpenSpec state may still matter later for implementation, verification, or archive workflows, but it is not a prerequisite for planning visibility.

Native Windows/PowerShell and WSL2 are both supported. Each runtime uses its own path conventions. OpenSpec does not translate paths between Windows and WSL in this foundation slice.

## Outcome

After this change, later workspace features can rely on one clear product contract:

- OpenSpec can tell when the user is inside a workspace.
- OpenSpec knows where to create managed workspaces by default.
- OpenSpec can keep a local registry of known workspaces.
- A workspace has one visible planning area: `changes/`.
- Workspace state is distinguishable from repo-local `openspec/` state.
- Shared workspace state does not force one user's local paths onto another user.
- Workspace planning can reference existing repos or folders by stable link names.
- Linked repos or folders do not need repo-local OpenSpec state for workspace planning.
- Multi-repo and large-monorepo work can use the same workspace planning model.
- Repo-owned specs and implementation remain owned by their repos or source areas.
- Windows, PowerShell, and WSL2 path behavior is predictable.

This change does not deliver the full workspace workflow. It gives `workspace-create-and-register-repos` the foundation it needs to add the first user-facing commands.

## POC Findings

Behavior to preserve:

- A workspace is a durable coordination home for cross-repo planning.
- The workspace has a visible `changes/` directory at its root.
- Linked repos and folders provide the context the workspace can plan against.
- Stable link names matter more than local checkout paths.
- Local machine paths should not become shared workspace state.
- Canonical specs and implementation still belong to the owning repos.

Lessons to carry forward:

- The POC's hidden `.openspec/` workspace metadata shape made workspace state too easy to confuse with repo-local OpenSpec state.
- Users should not need to run repo-local `openspec init` inside the workspace root.
- The POC's requirement that registered repos already have `openspec/` is too strict for planning. Repos and folders should be linkable before they adopt repo-local OpenSpec state.
- Repo or folder visibility should not depend on creating a change.
- Workspace setup should not imply repo-local implementation, branch, worktree, apply, verify, or archive behavior.
- `add-repo` is too narrow for the user-facing model. Linking an existing repo or folder is clearer.

## Decisions

- Workspace identity directory: `.openspec-workspace/`.
- Workspace identity file: `.openspec-workspace/workspace.yaml`.
- Workspace name: a valid folder name for the current OS, excluding empty names, `.`/`..`, and path separators.
- Workspace name usage: stored in `workspace.yaml`, used as the default managed workspace folder name, and used as the local registry name.
- Planning surface: top-level `changes/`.
- Local machine state: `.openspec-workspace/local.yaml`.
- Local machine state exclusion: OpenSpec-created workspaces exclude `.openspec-workspace/local.yaml` from portable collaboration state by default.
- Local workspace registry: `<global-data-dir>/workspaces/registry.yaml`.
- Default workspace base: `<global-data-dir>/workspaces/`.
- Platform behavior: native Windows and WSL2 each use the path conventions of the runtime running OpenSpec.
- Linked paths may be full repos, monorepo folders, or other existing folders.
- Link names: non-empty stable names, unique within a workspace, excluding `.`/`..` and path separators.
- Repo-local `openspec/` state is not required for workspace planning visibility.
- Linking records the relationship only; it does not create, copy, move, initialize, or edit files in the linked repo or folder.

Planning dependency:

- None. This is the first implementation slice.

## Non-Goals

- No complete `openspec workspace setup`, `openspec workspace link`, or `openspec workspace relink` flow yet.
- No public `openspec workspace create` command in the first user-facing workspace flow.
- No user-facing command, environment variable, or configuration setting for changing the standard workspace location.
- No question that asks users where OpenSpec should store workspaces by default.
- No automatic Windows-to-WSL or WSL-to-Windows path translation.
- No workspace-open agent launch behavior.
- No workspace-level proposal creation.
- No repo-slice apply, verify, archive, branch, or worktree behavior.
- No copying workspace planning files into linked repos or folders as a side effect of creating, detecting, or linking a workspace.

## Capabilities

### New Capabilities

- `workspace-foundation`: Defines the product foundation for OpenSpec workspaces.

### Modified Capabilities

- `openspec-conventions`: Describes how coordination workspaces differ from repo-local OpenSpec projects.

## Impact

- Workspace recognition and path behavior.
- Workspace state parsing.
- Local workspace registry parsing.
- Documentation and agent guidance for the workspace mental model.
- Later workspace slices should build on this contract instead of redefining workspace storage, identity, registry, or path behavior.
