## ADDED Requirements

### Requirement: Guided Workspace Setup
OpenSpec SHALL provide a guided setup flow for users starting workspace planning.

#### Scenario: Creating a workspace through setup
- **WHEN** a user runs `openspec workspace setup`
- **THEN** OpenSpec SHALL guide the user through creating an OpenSpec workspace
- **AND** the workspace SHALL use the standard workspace location from the workspace foundation

#### Scenario: Asking for the workspace name first
- **WHEN** interactive setup starts
- **THEN** OpenSpec SHALL ask for the workspace name before asking for repos or folders
- **AND** workspace names SHALL use kebab-case with lowercase letters, numbers, and hyphens

#### Scenario: Retrying an invalid workspace name during setup
- **WHEN** an interactive user enters an invalid workspace name
- **THEN** OpenSpec SHALL explain that workspace names must be kebab-case
- **AND** it SHALL let the user enter another workspace name before continuing setup

#### Scenario: Linking a required first repo or folder
- **WHEN** setup asks for repos or folders
- **THEN** the user SHALL provide at least one existing repo or folder path
- **AND** setup SHALL not finish successfully until at least one path is linked

#### Scenario: Inferring link names during setup
- **WHEN** the user provides a repo or folder path during setup
- **THEN** OpenSpec SHALL infer the link name from the folder basename
- **AND** it SHALL ask for a different name only when the inferred name conflicts

#### Scenario: Handling inferred link name conflicts during setup
- **GIVEN** setup infers a link name that already exists in the workspace
- **WHEN** setup is interactive
- **THEN** OpenSpec SHALL show the conflicting link name and the existing path for that link
- **AND** it SHALL ask the user for a different link name before continuing

#### Scenario: Preserving folder-style link names
- **WHEN** OpenSpec accepts a workspace link name
- **THEN** it SHALL allow folder-style names that are valid under the workspace foundation link-name rules
- **AND** it SHALL not require link names to use the stricter workspace-name kebab-case rule

#### Scenario: Adding multiple repos or folders during setup
- **WHEN** setup links a repo or folder
- **THEN** OpenSpec SHALL let the user add another repo or folder with a simple repeated prompt
- **AND** each linked path SHALL be recorded without editing the target repo or folder

#### Scenario: Storing verified absolute paths during setup
- **WHEN** setup links a repo or folder path
- **THEN** OpenSpec SHALL verify that the path resolves to an existing folder
- **AND** it SHALL store an absolute runtime-local path in machine-local state instead of the raw user input
- **AND** relative inputs SHALL be resolved against the command's current working directory

#### Scenario: Preserving equals signs in setup link paths
- **WHEN** non-interactive setup receives a `--link` value that resolves to an existing folder and contains `=`
- **THEN** OpenSpec SHALL treat the full value as the path
- **AND** it SHALL infer the link name from the folder basename
- **AND** explicit `--link <name>=<path>` inputs SHALL preserve `=` characters inside `<path>`

#### Scenario: Running setup with non-interactive inputs
- **WHEN** `openspec workspace setup --no-interactive` receives a workspace name and at least one valid link
- **THEN** OpenSpec SHALL create the workspace without prompts
- **AND** it SHALL support repeated `--link` values

#### Scenario: Non-interactive setup duplicate link names
- **WHEN** `openspec workspace setup --no-interactive` receives two links with the same inferred or explicit name
- **THEN** OpenSpec SHALL fail with a clear duplicate link-name error
- **AND** the error SHALL show the conflicting link name and the first path using that name
- **AND** it SHALL suggest using explicit `--link <name>=<path>` values with different names

#### Scenario: Missing non-interactive setup inputs
- **WHEN** `openspec workspace setup --no-interactive` is missing a workspace name or link
- **THEN** OpenSpec SHALL fail with a clear message
- **AND** it SHALL explain which flags are required

#### Scenario: Finishing setup
- **WHEN** setup finishes
- **THEN** OpenSpec SHALL show the workspace location, planning path, and linked repos or folders
- **AND** it SHALL check what the current machine can resolve

#### Scenario: Recording created workspaces locally
- **WHEN** setup creates a workspace
- **THEN** OpenSpec SHALL record it in the local workspace registry
- **AND** the workspace folder SHALL remain the source of truth for workspace state

#### Scenario: Reusing an existing workspace name during setup
- **GIVEN** a managed workspace already exists with the requested name
- **WHEN** a user runs setup with that workspace name
- **THEN** OpenSpec SHALL explain that the workspace already exists
- **AND** it SHALL not overwrite the existing workspace

### Requirement: Workspace Discovery
OpenSpec SHALL let users see the OpenSpec-managed workspaces available on the current machine.

#### Scenario: Listing workspaces
- **WHEN** a user runs `openspec workspace list`
- **THEN** OpenSpec SHALL list known managed workspaces
- **AND** each workspace SHALL include the workspace name, workspace location, and linked repos or folders

#### Scenario: Using the short list command
- **WHEN** a user runs `openspec workspace ls`
- **THEN** OpenSpec SHALL behave the same as `openspec workspace list`

#### Scenario: Listing when no workspaces exist
- **WHEN** a user runs `openspec workspace list`
- **AND** no managed workspaces exist
- **THEN** OpenSpec SHALL say that no workspaces were found
- **AND** it SHALL show the user how to create one

#### Scenario: Listing stale registry entries
- **WHEN** the local registry contains a workspace location that no longer exists
- **THEN** `workspace list` SHALL report the stale workspace entry
- **AND** it SHALL avoid silently deleting registry state
- **AND** it SHALL avoid rewriting or repairing registry state automatically

#### Scenario: Avoiding registry cleanup commands
- **WHEN** users inspect stale workspace registry entries in this slice
- **THEN** OpenSpec SHALL treat stale entries as report-only diagnostics
- **AND** it SHALL not expose a registry cleanup command such as `workspace forget`

### Requirement: Global Workspace Commands
OpenSpec SHALL let workspace commands run from outside workspace directories.

#### Scenario: Selecting a workspace by flag
- **WHEN** a command that needs one workspace receives `--workspace <name>`
- **THEN** OpenSpec SHALL use that workspace from the local registry
- **AND** it SHALL fail clearly if the workspace name is unknown

#### Scenario: Using the current workspace
- **GIVEN** the command runs from a workspace folder or subdirectory
- **WHEN** the command needs one workspace and no `--workspace` flag is provided
- **THEN** OpenSpec SHALL use the current workspace

#### Scenario: Using an unregistered current workspace
- **GIVEN** the command runs from a valid workspace folder or subdirectory
- **AND** that workspace is not recorded in the local workspace registry
- **WHEN** the command needs one workspace and no `--workspace <name>` flag is provided
- **THEN** OpenSpec SHALL use the current workspace
- **AND** it SHALL include a non-fatal warning status with code `workspace_not_in_local_registry`
- **AND** the warning SHALL explain how the user can get the workspace recorded locally

#### Scenario: Recording an unregistered current workspace after mutation
- **GIVEN** a mutating workspace command uses a valid current workspace that is not recorded in the local workspace registry
- **WHEN** `workspace link` or `workspace relink` succeeds
- **THEN** OpenSpec SHALL record the workspace name and location in the local workspace registry

#### Scenario: Doctor does not register current workspaces
- **GIVEN** `workspace doctor` uses a valid current workspace that is not recorded in the local workspace registry
- **WHEN** doctor finishes
- **THEN** OpenSpec SHALL report the non-fatal registry warning
- **AND** it SHALL not write registry state

#### Scenario: Picking from multiple workspaces
- **GIVEN** multiple known workspaces exist
- **WHEN** an interactive command needs one workspace and none is specified
- **THEN** OpenSpec SHALL show a workspace picker
- **AND** the picker SHALL include workspace names and paths

#### Scenario: Ambiguous non-interactive workspace selection
- **GIVEN** multiple known workspaces exist
- **WHEN** a non-interactive command needs one workspace and none is specified
- **THEN** OpenSpec SHALL fail with a clear message
- **AND** it SHALL suggest passing `--workspace <name>`

#### Scenario: Ambiguous JSON workspace selection
- **GIVEN** multiple known workspaces exist
- **WHEN** a command running with `--json` needs one workspace and none is specified
- **THEN** OpenSpec SHALL fail without showing a picker
- **AND** it SHALL emit a structured status error
- **AND** it SHALL suggest passing `--workspace <name>`

#### Scenario: No known workspaces for a command that needs one
- **GIVEN** no known workspaces exist in the local registry
- **AND** the command is not running from a workspace folder or subdirectory
- **WHEN** `workspace link`, `workspace relink`, `workspace doctor`, or another command that needs one workspace runs without `--workspace <name>`
- **THEN** OpenSpec SHALL fail without showing a picker regardless of interactive mode
- **AND** it SHALL print `No known OpenSpec workspaces. Run 'openspec workspace setup' first.`
- **AND** it SHALL explain that `--workspace <name>` can be used after at least one workspace is known locally

### Requirement: Workspace Links
OpenSpec SHALL let users link existing repos or folders to a workspace before creating a change.

#### Scenario: Linking with an inferred name
- **WHEN** a user runs `openspec workspace link <path>`
- **THEN** OpenSpec SHALL infer the link name from the folder basename
- **AND** it SHALL store the verified absolute local path as machine-local state

#### Scenario: Linking with an explicit name
- **WHEN** a user runs `openspec workspace link <name> <path>`
- **THEN** OpenSpec SHALL use the explicit link name for planning
- **AND** it SHALL store the verified absolute local path as machine-local state

#### Scenario: Requiring an existing path
- **WHEN** a user links a repo or folder path
- **THEN** the path SHALL exist on the current machine
- **AND** OpenSpec SHALL reject missing paths with a clear message

#### Scenario: Resolving linked paths before storage
- **WHEN** a user links a repo or folder path
- **THEN** OpenSpec SHALL store the verified absolute path for the current runtime
- **AND** relative inputs SHALL be resolved against the command's current working directory
- **AND** OpenSpec SHALL not translate paths between native Windows, WSL2, and Unix runtimes

#### Scenario: Linking a monorepo folder
- **WHEN** a user links a package, service, app, or directory inside a monorepo
- **THEN** OpenSpec SHALL store it as a workspace link
- **AND** it SHALL not require that folder to have its own repo-local `openspec/` directory

#### Scenario: Linking without repo-local OpenSpec
- **WHEN** a user links a path that does not contain repo-local OpenSpec state
- **THEN** OpenSpec SHALL keep that repo or folder available for workspace planning
- **AND** it SHALL not treat missing repo-local OpenSpec state as a link failure

#### Scenario: Link records only
- **WHEN** a user links a repo or folder
- **THEN** OpenSpec SHALL record workspace state and local path state
- **AND** it SHALL not create, copy, move, initialize, or edit files in the linked repo or folder

#### Scenario: Blocking link when local state is invalid
- **GIVEN** the workspace machine-local state file exists but cannot be parsed or validated
- **WHEN** a user runs `openspec workspace link`
- **THEN** OpenSpec SHALL fail with status code `workspace_local_state_invalid`
- **AND** it SHALL not rewrite shared workspace state or machine-local path state

#### Scenario: Reusing a link name
- **GIVEN** a workspace already has a link with a given name
- **WHEN** a user tries to link another path with the same name
- **THEN** OpenSpec SHALL explain that the link name is already in use by another link
- **AND** it SHALL show the existing link name and existing path
- **AND** it SHALL suggest choosing a different link name
- **AND** it SHALL suggest `workspace relink <name> <path>` when the user intended to change the existing link path
- **AND** it SHALL preserve the existing link unless the user explicitly relinks it

### Requirement: Workspace Relinks
OpenSpec SHALL let users update existing link paths without recreating the workspace.

#### Scenario: Updating a local path
- **GIVEN** a workspace has a link
- **WHEN** a user runs `openspec workspace relink <name> <path>`
- **THEN** OpenSpec SHALL keep the stable link name
- **AND** it SHALL update the machine-local path for the current machine to the verified absolute path

#### Scenario: Requiring an existing relink path
- **WHEN** a user relinks to a new path
- **THEN** the new path SHALL exist on the current machine
- **AND** OpenSpec SHALL reject missing paths with a clear message

#### Scenario: Resolving relink paths before storage
- **WHEN** a user relinks to a new path
- **THEN** OpenSpec SHALL store the verified absolute path for the current runtime
- **AND** relative inputs SHALL be resolved against the command's current working directory

#### Scenario: Blocking relink when local state is invalid
- **GIVEN** the workspace machine-local state file exists but cannot be parsed or validated
- **WHEN** a user runs `openspec workspace relink`
- **THEN** OpenSpec SHALL fail with status code `workspace_local_state_invalid`
- **AND** it SHALL not rewrite machine-local path state

#### Scenario: Updating an unknown link
- **WHEN** a user tries to relink a link that does not exist
- **THEN** OpenSpec SHALL explain that the link name is unknown
- **AND** it SHALL preserve existing workspace state

#### Scenario: Avoiding owner and handoff fields
- **WHEN** users link or relink repos or folders in this slice
- **THEN** OpenSpec SHALL not ask for owner or handoff metadata
- **AND** link maintenance SHALL focus on names and local paths

### Requirement: Workspace Health Check
OpenSpec SHALL explain what the current machine can resolve for a workspace.

#### Scenario: Doctor checks one selected workspace
- **WHEN** a user runs `openspec workspace doctor`
- **THEN** OpenSpec SHALL inspect one selected workspace
- **AND** it SHALL not scan every known workspace in the local registry by default

#### Scenario: Doctor infers the current workspace
- **GIVEN** the command runs from a workspace folder or subdirectory
- **WHEN** the user runs `openspec workspace doctor` without `--workspace <name>`
- **THEN** OpenSpec SHALL inspect the current workspace

#### Scenario: Checking a healthy workspace
- **WHEN** a user runs `openspec workspace doctor`
- **THEN** OpenSpec SHALL show the workspace location and workspace planning path
- **AND** it SHALL show linked repos or folders and which paths resolve on the current machine

#### Scenario: Selected workspace location is missing
- **GIVEN** the selected workspace comes from the local registry
- **AND** the registered workspace location is missing or invalid
- **WHEN** a user runs `openspec workspace doctor`
- **THEN** OpenSpec SHALL report a selected-workspace status error
- **AND** it SHALL not attempt to inspect links for that workspace

#### Scenario: Reporting repo-local specs paths
- **WHEN** a linked repo or folder resolves
- **THEN** doctor SHALL report `repo_specs_path` when repo-local `openspec/specs` exists
- **AND** it SHALL report `repo_specs_path: null` when repo-local specs are not present

#### Scenario: Checking missing paths
- **WHEN** a link points to a path that is missing on the current machine
- **THEN** doctor SHALL identify the affected link name
- **AND** it SHALL include a suggested `workspace relink` fix

#### Scenario: Checking shared and local state drift
- **WHEN** shared workspace state and machine-local path state do not agree
- **THEN** doctor SHALL explain which link names are affected
- **AND** it SHALL distinguish shared workspace links from local-only paths

#### Scenario: Reporting invalid local state
- **WHEN** list or doctor reads a workspace whose machine-local state file cannot be parsed or validated
- **THEN** OpenSpec SHALL report status code `workspace_local_state_invalid`
- **AND** it SHALL avoid treating the invalid local state as an empty path map for mutation or repair suggestions
- **AND** it SHALL not rewrite workspace registry state or machine-local path state

#### Scenario: Reporting without auto-repair
- **WHEN** doctor finds issues
- **THEN** it SHALL report all issues it can find
- **AND** it SHALL not automatically repair workspace state

#### Scenario: Using readable human output
- **WHEN** doctor prints human output
- **THEN** it SHALL show a readable workspace summary, linked repos or folders, and issues when present
- **AND** it SHALL avoid printing raw JSON or relying on a rigid YAML dump as the default human experience

### Requirement: Scriptable Workspace Setup Commands
OpenSpec SHALL provide JSON output for direct workspace setup commands.

#### Scenario: Requesting JSON output
- **WHEN** a user passes `--json` to direct workspace setup commands
- **THEN** OpenSpec SHALL print machine-readable output
- **AND** the output SHALL avoid extra human-readable text
- **AND** the output SHALL separate primary objects from structured `status` entries

#### Scenario: Setup JSON requires non-interactive setup
- **WHEN** a user runs `openspec workspace setup --json` without `--no-interactive`
- **THEN** OpenSpec SHALL fail clearly
- **AND** it SHALL explain that `workspace setup --json` requires `--no-interactive`

#### Scenario: JSON output disables prompts
- **WHEN** a direct workspace setup command runs with `--json`
- **THEN** OpenSpec SHALL avoid interactive prompts
- **AND** it SHALL fail with structured status output when required choices are ambiguous

#### Scenario: JSON status entry shape
- **WHEN** a direct workspace setup command reports warnings, errors, or suggested fixes in JSON output
- **THEN** each status entry SHALL include a stable `code`, a `severity`, and a human-readable `message`
- **AND** status entries MAY include `target` and `fix` fields when a specific object field or suggested command is useful

#### Scenario: JSON object status shape
- **WHEN** a direct workspace setup command emits JSON for workspace, link, or list objects
- **THEN** each object MAY include a `status` array for object-specific warnings or errors
- **AND** the top-level response SHALL include a `status` array for command-level warnings or errors
- **AND** healthy objects and healthy responses SHALL use an empty `status` array

#### Scenario: Commands with JSON output
- **WHEN** users run `workspace setup --no-interactive`, `workspace list`, `workspace link`, `workspace relink`, or `workspace doctor`
- **THEN** each command SHALL support JSON output
