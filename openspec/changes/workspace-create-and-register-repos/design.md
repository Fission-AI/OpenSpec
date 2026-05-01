## Product Shape

This slice is the first user-facing step after `workspace-foundation`.

The user experience should be:

```text
I set up a workspace.
I link the repos or folders it should know about.
I can list my workspaces later.
I can ask OpenSpec what is broken and how to fix it.
```

No change proposal is required yet.

## Links

A workspace link is a stable name plus a local path on the current machine.

Examples:

```text
api      -> /repos/api
web      -> /repos/web
checkout -> /repos/platform/apps/checkout
billing  -> /repos/platform/services/billing
```

The path may point at a full repo or a folder inside a large monorepo. It may point at a repo or folder that has not adopted repo-local OpenSpec yet.

The product language should say "repos or folders". It should avoid "working set", "code area", "entry", "alias", and "local overlay" in user-facing output.

Link names are normally inferred from the folder basename:

```text
/repos/api                         -> api
/repos/platform/apps/checkout      -> checkout
```

If the inferred name conflicts, interactive flows should ask for a different name. Non-interactive flows should fail with a clear message.

## Commands

### `workspace setup`

Guided onboarding:

- create a workspace in the standard workspace location
- ask for a workspace name
- require at least one existing repo or folder path
- infer link names from folder names
- let the user add more repos or folders with a simple repeated prompt
- register the workspace in the local workspace registry
- run `workspace doctor`
- print the workspace root, planning path, linked repos/folders, and next useful commands

This slice should not ask for preferred agent or open the workspace with an agent. Those belong to `workspace-open-agent-context`.

Setup should support a non-interactive mode for automation:

```bash
openspec workspace setup --no-interactive --name platform --link /path/to/api --link web=/path/to/web
```

In non-interactive mode, setup should fail cleanly unless the user provides a valid workspace name and at least one valid link. `--link` should accept either a path, which infers the name from the folder basename, or `name=path`.

There is no public `workspace create` command in this slice. Setup is the creation flow.

### `workspace list`

Show known OpenSpec-managed workspaces from the local workspace registry.

`workspace ls` should behave the same way.

The output should answer what exists and what each workspace links to:

```yaml
workspaces:
  - name: platform
    root: /.../openspec/workspaces/platform
    links:
      - name: api
        path: /repos/api
      - name: web
        path: /repos/web
  - name: checkout
    root: /.../openspec/workspaces/checkout
    links:
      - name: app
        path: /repos/platform/apps/checkout
```

List should keep deep validation for `workspace doctor`. It can still report obviously stale workspace registry entries if a registered workspace path no longer exists.

### `workspace link [name] <path>`

Record an existing repo or folder path for the selected workspace.

Supported forms:

```bash
openspec workspace link /path/to/api
openspec workspace link api-service /path/to/api
```

The one-argument form infers the link name from the folder basename. The two-argument form lets the user choose the link name.

The path must exist. The command should accept:

- full repo roots
- monorepo folders such as packages, services, and apps
- repos or folders without repo-local `openspec/`

If the path has repo-local OpenSpec state, OpenSpec can report the repo specs path in doctor output. If it does not, OpenSpec should still allow workspace planning.

`workspace link` only records the link. It must not create, copy, move, initialize, or edit files in the linked repo or folder.

### `workspace relink <name> <path>`

Repair or change the local path for an existing link.

This slice should keep relink focused on path repair. It should not include owner/handoff metadata; that language was too process-heavy in the POC and can be revisited later if users need contact or notes fields.

### `workspace doctor`

Explain the current workspace from the user's machine:

- workspace root
- workspace planning path
- linked repos and folders
- whether each local path exists
- repo-local specs path when present
- missing local paths
- local names that are not in shared workspace state
- shared link names that are missing local paths
- stale local registry entries
- suggested fixes for each issue

Doctor should report issues and suggested fixes. It should not repair anything automatically.

Human output should be YAML-like with snake_case keys:

```yaml
workspace:
  name: platform
  root: /.../openspec/workspaces/platform
  planning_path: /.../openspec/workspaces/platform/changes

links:
  - name: api
    path: /repos/api
    path_status: exists
    repo_specs_path: /repos/api/openspec/specs

  - name: web
    path: /old/path/web
    path_status: missing
    repo_specs_path: null
    issue: linked_path_missing
    fix: openspec workspace relink web /path/to/web

summary:
  status: needs_attention
  issues: 1
```

JSON output can keep the same structure using JSON syntax.

## Workspace Selection

Workspace commands should work from anywhere.

Commands that do not need one workspace:

- `workspace setup`
- `workspace list`
- `workspace ls`

Commands that need one workspace:

- `workspace link`
- `workspace relink`
- `workspace doctor`

If the current command needs one workspace and `--workspace <name>` is not provided:

- use the current workspace when running from inside a workspace
- otherwise show an interactive picker when multiple known workspaces exist
- otherwise select the only known workspace
- otherwise explain that no workspaces exist and suggest `openspec workspace setup`

In non-interactive mode, commands that need one workspace should fail when selection is ambiguous and suggest `--workspace <name>`.

## Machine-Local Files

Workspace creation should make machine-local state safe by default.

The workspace should ignore:

```text
/.openspec-workspace/local.yaml
```

The local workspace registry should also be machine-local:

```text
<global-data-dir>/workspaces/registry.yaml
```

Generated agent-open surfaces can be ignored by `workspace-open-agent-context` when that slice creates them.

## JSON Output

Interactive setup does not need JSON output as its primary contract. Non-interactive setup and direct commands should support JSON output for scripting:

- `workspace setup --no-interactive --json`
- `workspace list --json`
- `workspace link --json`
- `workspace relink --json`
- `workspace doctor --json`

## POC Adjustments

Keep:

- guided setup as the default first run
- direct list/link/check commands
- shared state separate from local paths
- clean non-interactive failure when required setup inputs are missing
- JSON output for non-interactive/direct commands

Change:

- do not expose public `workspace create` in the first release
- do not require repo-local OpenSpec state to link a repo or folder
- use `workspace link` instead of `workspace add-repo`
- use `workspace relink` instead of `workspace update-repo`
- do not save preferred agent during setup
- do not offer to open the workspace from setup
- require setup to link at least one existing repo or folder
- keep update behavior focused on path repair rather than owner/handoff metadata
- do not use "working set", "code area", "entry", "alias", or "local overlay" in human-facing output
