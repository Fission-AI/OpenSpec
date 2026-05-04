## Product Model

An OpenSpec workspace is the durable planning home for work that spans multiple repos or folders.

It should feel like this:

```text
workspace = where related changes live
link      = a named repo or folder the workspace can plan against
change    = one feature, fix, project, or other planned piece of work
```

The foundation intentionally avoids the rest of the workflow. It only defines how OpenSpec recognizes a workspace, where managed workspaces live, how linked paths are represented, and how shared state differs from local state.

A workspace is not a feature. It can hold many changes over time. The linked repos or folders provide planning context, while the code stays where it is.

## Workspace Shape

OpenSpec workspaces use this shape:

```text
workspace-root/
  changes/                       # workspace-level proposals, tasks, specs
  .openspec-workspace/
    workspace.yaml               # shared workspace information
    local.yaml                   # this machine's paths and preferences
```

The user-facing planning surface is `changes/`. The identity file that makes the directory a workspace is `.openspec-workspace/workspace.yaml`.

Repo-local projects keep the existing shape:

```text
repo-root/
  openspec/
    specs/
    changes/
```

That distinction lets a user or agent tell which surface they are working in:

```text
coordination workspace -> shared cross-repo planning
repo-local project     -> repo-owned specs and implementation planning
```

Users should not run repo-local `openspec init` inside the workspace root. A workspace is already an OpenSpec coordination surface; it is not a product repo adopting repo-local OpenSpec.

## Workspace Names

A workspace name is a simple folder-style identifier, not a display name.

The name must be usable as a folder name in the current runtime. It must not be empty, must not be `.` or `..`, and must not contain path separators.

OpenSpec should not maintain a cross-platform reserved-name list in this slice. Setup/create flows should let filesystem creation surface OS-specific invalid folder names, then report that failure clearly.

The same workspace name is stored in `.openspec-workspace/workspace.yaml`, used as the default managed workspace folder name, and used as the local registry name.

## Shared And Local State

Workspace state follows a simple sharing rule:

```text
share stable link names and planning
keep local checkout paths local
```

Expected shared state:

```yaml
version: 1
name: platform
links:
  api: {}
  web: {}
```

Expected local state:

```yaml
version: 1
paths:
  api: /repos/api
  web: /repos/web
```

Later slices can expand these shapes, but the product rule should stay stable: a shared workspace should not commit one user's absolute checkout paths.

OpenSpec-created workspaces should include an ignore rule for `.openspec-workspace/local.yaml` so local checkout paths are not accidentally shared. `.openspec-workspace/workspace.yaml` remains the portable workspace identity and link-name state.

## Workspace Location

OpenSpec should create managed workspaces in one standard place:

```text
getGlobalDataDir()/workspaces
```

That reuses existing OpenSpec data-directory behavior:

- `$XDG_DATA_HOME/openspec/workspaces` when `XDG_DATA_HOME` is set
- `~/.local/share/openspec/workspaces` on Unix/macOS fallback
- `%LOCALAPPDATA%\openspec\workspaces` on native Windows fallback

This slice intentionally does not define a workspace-specific environment-variable, command, or configuration override for managed workspace storage. Tests should rely on existing global data-directory controls and test helpers instead of a separate workspace-home override.

This is deliberately quiet. The product should not ask most users where workspaces should live.

OpenSpec should show the resolved workspace path after setup. Quiet defaults should avoid a prompt, not hide where planning files were created.

## Local Workspace Registry

OpenSpec should keep a lightweight local registry of known workspaces:

```text
getGlobalDataDir()/workspaces/registry.yaml
```

Expected registry state:

```yaml
version: 1
workspaces:
  platform: /Users/tabish/.local/share/openspec/workspaces/platform
  checkout: /Users/tabish/.local/share/openspec/workspaces/checkout
```

The registry is a local index, not the source of truth. It exists so workspace commands can work from anywhere, show a picker when multiple workspaces exist, and list known workspaces without scanning arbitrary folders.

Each workspace folder remains authoritative for its own `.openspec-workspace/workspace.yaml` and `.openspec-workspace/local.yaml`. If a registry entry points at a missing or invalid workspace, later check/list flows can report that and suggest a repair.

## Windows And WSL2

Path behavior is runtime-local:

- PowerShell/native Windows uses Windows paths and Windows data-directory fallback.
- WSL2 uses Linux paths and Linux/XDG fallback inside WSL.
- Local repo paths are stored as the user supplied them for the current runtime.

Examples:

```text
PowerShell:
  default base -> %LOCALAPPDATA%\openspec\workspaces

WSL2:
  default base -> ~/.local/share/openspec/workspaces
```

This slice should not translate between `D:\repo`, `/mnt/d/repo`, and `\\wsl$` paths. Cross-runtime translation can be reconsidered later if an agent-launch workflow requires it.

## Link Names

A link name is the stable way to refer to a repo or folder inside workspace planning.

The local path can vary by machine:

```text
shared link name: landing
Tabish path:      /Users/tabish/repos/landing
Windows path:     D:\repos\landing
WSL2 path:        /mnt/d/repos/landing
```

Later workflows should refer to `landing` in workspace planning, status, and apply context. The local path is only how the current machine finds that repo or folder.

Link names are intentionally minimal: they must be non-empty, must not be `.` or `..`, must not contain path separators, and must be unique within the workspace.

The owning repo or folder remains the home of canonical specs and implementation work. The workspace makes the cross-boundary plan legible; it does not take ownership away from the linked repos or folders.

Link names are normally inferred from the folder basename in guided flows. Direct flows can allow an explicit name when the default would conflict or be unclear.

## Linked Repos And Folders

Workspace planning visibility should not require repo-local OpenSpec state.

That matters for two common cases:

- a repo has not adopted OpenSpec yet, but still needs to be considered in planning
- a large monorepo has folders such as packages, services, or apps that should be planned like separate areas, without each folder having its own `openspec/`

Foundation should allow the link model to describe both:

```text
multi-repo:
  api      -> /repos/api
  web      -> /repos/web

large monorepo:
  billing  -> /repos/platform/services/billing
  checkout -> /repos/platform/apps/checkout
```

Later apply/verify/archive workflows can decide what extra readiness is needed for implementation. Planning should be able to start before that.

Linking only records the relationship between a workspace link name and a local path. It must not create, copy, move, initialize, or edit files inside the linked repo or folder.

Repo-local spec availability is computed when needed. For example, `repo_specs_path` can be reported by a later doctor command when a linked path contains `openspec/specs`, but that path should not be treated as required workspace state.

## Later Slices

This foundation stops before user-facing workspace workflows:

- `workspace-create-and-register-repos` owns setup, link, relink, list, and doctor behavior.
- `workspace-open-agent-context` owns agent launch context.
- `workspace-change-planning` owns workspace proposals and repo scope.
- `workspace-apply-repo-slice` owns implementation of one repo slice.
- `workspace-verify-and-archive` owns completion and archive behavior.
