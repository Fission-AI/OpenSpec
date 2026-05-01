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
- **AND** workspace names SHALL use lowercase letters, numbers, and hyphens

#### Scenario: Linking a required first repo or folder
- **WHEN** setup asks for repos or folders
- **THEN** the user SHALL provide at least one existing repo or folder path
- **AND** setup SHALL not finish successfully until at least one path is linked

#### Scenario: Inferring link names during setup
- **WHEN** the user provides a repo or folder path during setup
- **THEN** OpenSpec SHALL infer the link name from the folder basename
- **AND** it SHALL ask for a different name only when the inferred name conflicts

#### Scenario: Adding multiple repos or folders during setup
- **WHEN** setup links a repo or folder
- **THEN** OpenSpec SHALL let the user add another repo or folder with a simple repeated prompt
- **AND** each linked path SHALL be recorded without editing the target repo or folder

#### Scenario: Running setup with non-interactive inputs
- **WHEN** `openspec workspace setup --no-interactive` receives a workspace name and at least one valid link
- **THEN** OpenSpec SHALL create the workspace without prompts
- **AND** it SHALL support repeated `--link` values

#### Scenario: Missing non-interactive setup inputs
- **WHEN** `openspec workspace setup --no-interactive` is missing a workspace name or link
- **THEN** OpenSpec SHALL fail with a clear message
- **AND** it SHALL explain which flags are required

#### Scenario: Finishing setup
- **WHEN** setup finishes
- **THEN** OpenSpec SHALL show the workspace root, planning path, and linked repos or folders
- **AND** it SHALL check what the current machine can resolve

#### Scenario: Registering created workspaces locally
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
- **AND** each workspace SHALL include the workspace name, workspace path, and linked repos or folders

#### Scenario: Using the short list command
- **WHEN** a user runs `openspec workspace ls`
- **THEN** OpenSpec SHALL behave the same as `openspec workspace list`

#### Scenario: Listing when no workspaces exist
- **WHEN** a user runs `openspec workspace list`
- **AND** no managed workspaces exist
- **THEN** OpenSpec SHALL say that no workspaces were found
- **AND** it SHALL show the user how to create one

#### Scenario: Listing stale registry entries
- **WHEN** the local registry contains a workspace path that no longer exists
- **THEN** `workspace list` SHALL report the stale workspace entry
- **AND** it SHALL avoid silently deleting registry state

### Requirement: Global Workspace Commands
OpenSpec SHALL let workspace commands run from outside workspace directories.

#### Scenario: Selecting a workspace by flag
- **WHEN** a command that needs one workspace receives `--workspace <name>`
- **THEN** OpenSpec SHALL use that workspace from the local registry
- **AND** it SHALL fail clearly if the workspace name is unknown

#### Scenario: Using the current workspace
- **GIVEN** the command runs from a workspace root or subdirectory
- **WHEN** the command needs one workspace and no `--workspace` flag is provided
- **THEN** OpenSpec SHALL use the current workspace

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

#### Scenario: No known workspaces for a command that needs one
- **GIVEN** no known workspaces exist in the local registry
- **AND** the command is not running from a workspace root or subdirectory
- **WHEN** `workspace link`, `workspace relink`, `workspace doctor`, or another command that needs one workspace runs without `--workspace <name>`
- **THEN** OpenSpec SHALL fail without showing a picker regardless of interactive mode
- **AND** it SHALL print `No known OpenSpec workspaces. Run 'openspec workspace setup' first.`
- **AND** it SHALL explain that `--workspace <name>` can be used after at least one workspace is registered

### Requirement: Workspace Links
OpenSpec SHALL let users link existing repos or folders to a workspace before creating a change.

#### Scenario: Linking with an inferred name
- **WHEN** a user runs `openspec workspace link <path>`
- **THEN** OpenSpec SHALL infer the link name from the folder basename
- **AND** it SHALL store the local path as machine-local state

#### Scenario: Linking with an explicit name
- **WHEN** a user runs `openspec workspace link <name> <path>`
- **THEN** OpenSpec SHALL use the explicit link name for planning
- **AND** it SHALL store the local path as machine-local state

#### Scenario: Requiring an existing path
- **WHEN** a user links a repo or folder path
- **THEN** the path SHALL exist on the current machine
- **AND** OpenSpec SHALL reject missing paths with a clear message

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

#### Scenario: Reusing a link name
- **GIVEN** a workspace already has a link with a given name
- **WHEN** a user tries to link another path with the same name
- **THEN** OpenSpec SHALL explain that the link name is already in use
- **AND** it SHALL preserve the existing link unless the user explicitly relinks it

### Requirement: Workspace Relinks
OpenSpec SHALL let users update existing link paths without recreating the workspace.

#### Scenario: Updating a local path
- **GIVEN** a workspace has a link
- **WHEN** a user runs `openspec workspace relink <name> <path>`
- **THEN** OpenSpec SHALL keep the stable link name
- **AND** it SHALL update the machine-local path for the current machine

#### Scenario: Requiring an existing relink path
- **WHEN** a user relinks to a new path
- **THEN** the new path SHALL exist on the current machine
- **AND** OpenSpec SHALL reject missing paths with a clear message

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

#### Scenario: Checking a healthy workspace
- **WHEN** a user runs `openspec workspace doctor`
- **THEN** OpenSpec SHALL show the workspace root and workspace planning path
- **AND** it SHALL show linked repos or folders and which paths resolve on the current machine

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

#### Scenario: Reporting without auto-repair
- **WHEN** doctor finds issues
- **THEN** it SHALL report all issues it can find
- **AND** it SHALL not automatically repair workspace state

#### Scenario: Using YAML-like human output
- **WHEN** doctor prints human output
- **THEN** it SHALL use YAML-like structure with snake_case keys
- **AND** it SHALL include a summary status and issue count

### Requirement: Scriptable Workspace Setup Commands
OpenSpec SHALL provide JSON output for direct workspace setup commands.

#### Scenario: Requesting JSON output
- **WHEN** a user passes `--json` to direct workspace setup commands
- **THEN** OpenSpec SHALL print machine-readable output
- **AND** the output SHALL avoid extra human-readable text

#### Scenario: Commands with JSON output
- **WHEN** users run `workspace setup --no-interactive`, `workspace list`, `workspace link`, `workspace relink`, or `workspace doctor`
- **THEN** each command SHALL support JSON output
