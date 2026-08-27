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

Path handling should behave like a folder picker. The user may type a relative or absolute path, but OpenSpec should verify that it points to an existing folder, convert it to an absolute path relative to the command's current working directory when needed, and store that verified absolute path in local workspace state. OpenSpec should not store the raw string the user typed.

Path conversion stays in the current runtime. Native Windows paths, WSL2 paths, and Unix paths should not be translated across runtimes. Where duplicate-path detection needs canonical comparisons, OpenSpec may compare canonical existing paths internally, but it should store and display the verified absolute path for the current runtime.

## Names

Workspace names should be kebab-case:

```text
platform
checkout-web
api2
```

Invalid workspace names include uppercase letters, underscores, dots, spaces, leading hyphens, trailing hyphens, empty names, dot names, and path separators. Interactive setup should explain the expected form and let the user retry. Non-interactive setup should fail with the same expectation in the error message.

Link names should keep the folder-style validation from `workspace-foundation`: they must not be empty, must not be `.` or `..`, must not contain path separators, and must be unique inside the workspace. This lets inferred link names match existing folder basenames without forcing users to rename local folders for workspace planning.

Link names are normally inferred from the folder basename:

```text
/repos/api                         -> api
/repos/platform/apps/checkout      -> checkout
```

If the inferred name conflicts, interactive setup should show the conflicting name and the existing path it maps to, then ask for a different name. Non-interactive setup and direct `workspace link` should fail with a clear message instead of silently overwriting.

Duplicate-name errors should be specific:

```text
Cannot use link name 'api' because another link already uses that name.
Existing link:
  api -> /repos/api

Choose a different name:
  openspec workspace link archived-api /archive/api

If you meant to change the existing link path:
  openspec workspace relink api /archive/api
```

This slice does not add a separate link-rename command. Renaming a link can be considered later if users need it, but v1 should keep the command model crisp: `link` adds a new link, and `relink` changes the local path for an existing link.

## Commands

### `workspace setup`

Guided onboarding:

- create a workspace in the standard workspace location
- ask for a workspace name
- require at least one existing repo or folder path
- infer link names from folder names
- let the user add more repos or folders with a simple repeated prompt
- record the workspace in the local workspace registry
- run `workspace doctor`
- print the workspace location, planning path, linked repos or folders, and next useful commands

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
    location: /.../openspec/workspaces/platform
    links:
      - name: api
        path: /repos/api
      - name: web
        path: /repos/web
  - name: checkout
    location: /.../openspec/workspaces/checkout
    links:
      - name: app
        path: /repos/platform/apps/checkout
```

List should keep deep validation for `workspace doctor`. It can still report obviously stale workspace registry entries if a known workspace location no longer exists. Stale registry entries are report-only in this slice: `workspace list` should not delete, rewrite, or repair registry entries, and this slice should not add a `workspace forget` command.

For JSON output, list should use typed workspace objects with a structured `status` array for issues:

```json
{
  "workspaces": [
    {
      "name": "platform",
      "root": "/.../openspec/workspaces/platform",
      "links": [
        {
          "name": "api",
          "path": "/repos/api",
          "status": []
        }
      ],
      "status": []
    },
    {
      "name": "old-platform",
      "root": "/.../openspec/workspaces/old-platform",
      "links": [],
      "status": [
        {
          "severity": "error",
          "code": "workspace_root_missing",
          "message": "Workspace location does not exist.",
          "fix": "Remove or repair the local registry entry."
        }
      ]
    }
  ],
  "status": []
}
```

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

If the user passes a relative path, OpenSpec should resolve it against the command's current working directory before writing local state.

If the path has repo-local OpenSpec state, OpenSpec can report the repo specs path in doctor output. If it does not, OpenSpec should still allow workspace planning.

`workspace link` only records the link. It must not create, copy, move, initialize, or edit files in the linked repo or folder.

### `workspace relink <name> <path>`

Repair or change the local path for an existing link.

Relink should use the same path handling as link: require an existing folder, resolve relative inputs to absolute runtime-local paths, and store the verified path.

This slice should keep relink focused on path repair. It should not include owner or handoff metadata; that language was too process-heavy in the POC and can be revisited later if users need contact or notes fields.

### `workspace doctor`

Explain one selected workspace from the user's machine. If the command is run from a workspace folder or subdirectory and `--workspace <name>` is not provided, doctor should use that current workspace. Otherwise it should follow the normal workspace-selection rules.

Doctor should inspect:

- workspace location
- workspace planning path
- linked repos and folders
- whether each local path exists
- repo-local specs path when present
- missing local paths
- local names that are not in shared workspace state
- shared link names that are missing local paths
- suggested fixes for each issue

Doctor should not scan every known workspace in the local registry by default. Broad registry visibility belongs to `workspace list`. A future `workspace doctor --all` can be considered later if users need global workspace diagnostics.

Doctor should report issues and suggested fixes. It should not repair anything automatically.

Registry cleanup remains out of scope. If doctor cannot inspect the selected workspace because the registry points at a missing or invalid workspace location, it should report that selected-workspace issue through status entries and stop before inspecting links. Other stale registry entries should be surfaced by `workspace list`, not by selected-workspace doctor.

Human output should be readable by default: a short workspace summary, linked repo or folder rows, and a clear issues section when anything needs attention. It should not be raw JSON or a rigid YAML dump.

JSON output should follow the object/status pattern: primary data lives in typed objects, and diagnostics live in `status` arrays. A healthy object has `status: []`. Status entries should include `severity`, `code`, `message`, and optional `target` and `fix` fields.

```json
{
  "workspace": {
    "name": "platform",
    "root": "/.../openspec/workspaces/platform",
    "planning_path": "/.../openspec/workspaces/platform/changes",
    "links": [
      {
        "name": "api",
        "path": "/repos/api",
        "repo_specs_path": "/repos/api/openspec/specs",
        "status": []
      },
      {
        "name": "web",
        "path": "/old/path/web",
        "repo_specs_path": null,
        "status": [
          {
            "severity": "error",
            "code": "linked_path_missing",
            "message": "Linked path does not exist.",
            "target": "links.web.path",
            "fix": "openspec workspace relink web /path/to/web"
          }
        ]
      }
    ],
    "status": []
  },
  "status": []
}
```

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

The current workspace wins even if it is not in the local workspace registry. This supports manually created or shared workspace folders. In that case commands should continue and include a non-fatal warning status:

```json
{
  "severity": "warning",
  "code": "workspace_not_in_local_registry",
  "message": "This workspace is not recorded in the local workspace registry.",
  "target": "workspace.root",
  "fix": "Run a mutating workspace command from this workspace, such as workspace link or workspace relink, to record it locally."
}
```

For human output, this should be a short warning rather than a blocking error. Successful mutating commands that use an unregistered current workspace, such as `workspace link` or `workspace relink`, should record the workspace name and location in the local registry after the mutation succeeds. Non-mutating commands such as `workspace doctor` should not write registry state; they should only report the warning. This slice should not add a standalone `workspace register` or `workspace join` command.

In non-interactive mode, commands that need one workspace should fail when selection is ambiguous and suggest `--workspace <name>`.

`--json` should also suppress prompting for commands that need one workspace. If a command would otherwise show a picker, JSON mode should fail with a structured status error and suggest `--workspace <name>`.

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

Generated agent launch surfaces can be ignored by `workspace-open-agent-context` when that slice creates them.

## JSON Output

Interactive setup does not need JSON output as its primary contract. Non-interactive setup and direct commands should support JSON output for scripting:

- `workspace setup --no-interactive --json`
- `workspace list --json`
- `workspace link --json`
- `workspace relink --json`
- `workspace doctor --json`

`workspace setup --json` should require `--no-interactive`. If a user runs `workspace setup --json` without `--no-interactive`, setup should fail clearly because an interactive wizard cannot produce clean JSON. Direct commands such as `workspace list --json`, `workspace link --json`, `workspace relink --json`, and `workspace doctor --json` do not require `--no-interactive`, but JSON mode should disable prompts and fail on ambiguous workspace selection.

JSON output should use object/status structure across commands:

- primary entities such as `workspace`, `workspaces`, or `link` carry the durable data
- `status` arrays carry warnings, errors, and suggested fixes
- status entries use stable `code` values plus human-readable `message` text
- command-level `status` describes the whole response
- object-level `status` describes that specific workspace or link

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
- do not save a preferred agent during setup
- do not offer to open the workspace from setup
- require setup to link at least one existing repo or folder
- keep relink behavior focused on path repair rather than owner or handoff metadata
- do not use "working set", "code area", "entry", "alias", or "local overlay" in human-facing output
