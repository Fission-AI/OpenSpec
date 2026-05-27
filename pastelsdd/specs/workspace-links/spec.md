# workspace-links Specification

## Purpose
Define the direct workspace setup, discovery, linking, relinking, health check,
and JSON-output behavior for managing Pastelsdd workspaces across repos and
folders.
## Requirements
### Requirement: Guided Workspace Setup
Pastelsdd SHALL provide a guided setup flow for users starting workspace planning.

#### Scenario: Creating a workspace through setup
- **WHEN** a user runs `pastelsdd workspace setup`
- **THEN** Pastelsdd SHALL guide the user through creating an Pastelsdd workspace
- **AND** the workspace SHALL use the standard workspace location from the workspace foundation

#### Scenario: Asking for the workspace name first
- **WHEN** interactive setup starts
- **THEN** Pastelsdd SHALL ask for the workspace name before asking for repos or folders
- **AND** workspace names SHALL use kebab-case with lowercase letters, numbers, and hyphens

#### Scenario: Retrying an invalid workspace name during setup
- **WHEN** an interactive user enters an invalid workspace name
- **THEN** Pastelsdd SHALL explain that workspace names must be kebab-case
- **AND** it SHALL let the user enter another workspace name before continuing setup

#### Scenario: Linking a required first repo or folder
- **WHEN** setup asks for repos or folders
- **THEN** the user SHALL provide at least one existing repo or folder path
- **AND** setup SHALL not finish successfully until at least one path is linked

#### Scenario: Inferring link names during setup
- **WHEN** the user provides a repo or folder path during setup
- **THEN** Pastelsdd SHALL infer the link name from the folder basename
- **AND** it SHALL ask for a different name only when the inferred name conflicts

#### Scenario: Handling inferred link name conflicts during setup
- **GIVEN** setup infers a link name that already exists in the workspace
- **WHEN** setup is interactive
- **THEN** Pastelsdd SHALL show the conflicting link name and the existing path for that link
- **AND** it SHALL ask the user for a different link name before continuing

#### Scenario: Preserving folder-style link names
- **WHEN** Pastelsdd accepts a workspace link name
- **THEN** it SHALL allow folder-style names that are valid under the workspace foundation link-name rules
- **AND** it SHALL not require link names to use the stricter workspace-name kebab-case rule

#### Scenario: Adding multiple repos or folders during setup
- **WHEN** setup links a repo or folder
- **THEN** Pastelsdd SHALL let the user add another repo or folder with a simple repeated prompt
- **AND** each linked path SHALL be recorded without editing the target repo or folder

#### Scenario: Storing verified absolute paths during setup
- **WHEN** setup links a repo or folder path
- **THEN** Pastelsdd SHALL verify that the path resolves to an existing folder
- **AND** it SHALL store an absolute runtime-local path in machine-local state instead of the raw user input
- **AND** relative inputs SHALL be resolved against the command's current working directory

#### Scenario: Preserving equals signs in setup link paths
- **WHEN** non-interactive setup receives a `--link` value that resolves to an existing folder and contains `=`
- **THEN** Pastelsdd SHALL treat the full value as the path
- **AND** it SHALL infer the link name from the folder basename
- **AND** explicit `--link <name>=<path>` inputs SHALL preserve `=` characters inside `<path>`

#### Scenario: Running setup with non-interactive inputs
- **WHEN** `pastelsdd workspace setup --no-interactive` receives a workspace name and at least one valid link
- **THEN** Pastelsdd SHALL create the workspace without prompts
- **AND** it SHALL support repeated `--link` values

#### Scenario: Non-interactive setup duplicate link names
- **WHEN** `pastelsdd workspace setup --no-interactive` receives two links with the same inferred or explicit name
- **THEN** Pastelsdd SHALL fail with a clear duplicate link-name error
- **AND** the error SHALL show the conflicting link name and the first path using that name
- **AND** it SHALL suggest using explicit `--link <name>=<path>` values with different names

#### Scenario: Missing non-interactive setup inputs
- **WHEN** `pastelsdd workspace setup --no-interactive` is missing a workspace name or link
- **THEN** Pastelsdd SHALL fail with a clear message
- **AND** it SHALL explain which flags are required

#### Scenario: Finishing setup
- **WHEN** setup finishes
- **THEN** Pastelsdd SHALL show the workspace location, planning path, and linked repos or folders
- **AND** it SHALL check what the current machine can resolve

#### Scenario: Recording created workspaces locally
- **WHEN** setup creates a workspace
- **THEN** Pastelsdd SHALL record it in the local workspace registry
- **AND** the workspace folder SHALL remain the source of truth for workspace state

#### Scenario: Reusing an existing workspace name during setup
- **GIVEN** a managed workspace already exists with the requested name
- **WHEN** a user runs setup with that workspace name
- **THEN** Pastelsdd SHALL explain that the workspace already exists
- **AND** it SHALL not overwrite the existing workspace

### Requirement: Workspace Discovery
Pastelsdd SHALL let users see the Pastelsdd-managed workspaces available on the current machine.

#### Scenario: Listing workspaces
- **WHEN** a user runs `pastelsdd workspace list`
- **THEN** Pastelsdd SHALL list known managed workspaces
- **AND** each workspace SHALL include the workspace name, workspace location, and linked repos or folders

#### Scenario: Using the short list command
- **WHEN** a user runs `pastelsdd workspace ls`
- **THEN** Pastelsdd SHALL behave the same as `pastelsdd workspace list`

#### Scenario: Listing when no workspaces exist
- **WHEN** a user runs `pastelsdd workspace list`
- **AND** no managed workspaces exist
- **THEN** Pastelsdd SHALL say that no workspaces were found
- **AND** it SHALL show the user how to create one

#### Scenario: Listing stale registry entries
- **WHEN** the local registry contains a workspace location that no longer exists
- **THEN** `workspace list` SHALL report the stale workspace entry
- **AND** it SHALL avoid silently deleting registry state
- **AND** it SHALL avoid rewriting or repairing registry state automatically

#### Scenario: Avoiding registry cleanup commands
- **WHEN** users inspect stale workspace registry entries in this slice
- **THEN** Pastelsdd SHALL treat stale entries as report-only diagnostics
- **AND** it SHALL not expose a registry cleanup command such as `workspace forget`

### Requirement: Global Workspace Commands
Pastelsdd SHALL let workspace commands run from outside workspace directories.

#### Scenario: Selecting a workspace by flag
- **WHEN** a command that needs one workspace receives `--workspace <name>`
- **THEN** Pastelsdd SHALL use that workspace from the local registry
- **AND** it SHALL fail clearly if the workspace name is unknown

#### Scenario: Using the current workspace
- **GIVEN** the command runs from a workspace folder or subdirectory
- **WHEN** the command needs one workspace and no `--workspace` flag is provided
- **THEN** Pastelsdd SHALL use the current workspace

#### Scenario: Using an unregistered current workspace
- **GIVEN** the command runs from a valid workspace folder or subdirectory
- **AND** that workspace is not recorded in the local workspace registry
- **WHEN** the command needs one workspace and no `--workspace <name>` flag is provided
- **THEN** Pastelsdd SHALL use the current workspace
- **AND** it SHALL include a non-fatal warning status with code `workspace_not_in_local_registry`
- **AND** the warning SHALL explain how the user can get the workspace recorded locally

#### Scenario: Recording an unregistered current workspace after mutation
- **GIVEN** a mutating workspace command uses a valid current workspace that is not recorded in the local workspace registry
- **WHEN** `workspace link` or `workspace relink` succeeds
- **THEN** Pastelsdd SHALL record the workspace name and location in the local workspace registry

#### Scenario: Doctor does not register current workspaces
- **GIVEN** `workspace doctor` uses a valid current workspace that is not recorded in the local workspace registry
- **WHEN** doctor finishes
- **THEN** Pastelsdd SHALL report the non-fatal registry warning
- **AND** it SHALL not write registry state

#### Scenario: Picking from multiple workspaces
- **GIVEN** multiple known workspaces exist
- **WHEN** an interactive command needs one workspace and none is specified
- **THEN** Pastelsdd SHALL show a workspace picker
- **AND** the picker SHALL include workspace names and paths

#### Scenario: Ambiguous non-interactive workspace selection
- **GIVEN** multiple known workspaces exist
- **WHEN** a non-interactive command needs one workspace and none is specified
- **THEN** Pastelsdd SHALL fail with a clear message
- **AND** it SHALL suggest passing `--workspace <name>`

#### Scenario: Ambiguous JSON workspace selection
- **GIVEN** multiple known workspaces exist
- **WHEN** a command running with `--json` needs one workspace and none is specified
- **THEN** Pastelsdd SHALL fail without showing a picker
- **AND** it SHALL emit a structured status error
- **AND** it SHALL suggest passing `--workspace <name>`

#### Scenario: No known workspaces for a command that needs one
- **GIVEN** no known workspaces exist in the local registry
- **AND** the command is not running from a workspace folder or subdirectory
- **WHEN** `workspace link`, `workspace relink`, `workspace doctor`, or another command that needs one workspace runs without `--workspace <name>`
- **THEN** Pastelsdd SHALL fail without showing a picker regardless of interactive mode
- **AND** it SHALL print `No known Pastelsdd workspaces. Run 'pastelsdd workspace setup' first.`
- **AND** it SHALL explain that `--workspace <name>` can be used after at least one workspace is known locally

### Requirement: Workspace Links
Pastelsdd SHALL let users link existing repos or folders to a workspace before creating a change.

#### Scenario: Linking with an inferred name
- **WHEN** a user runs `pastelsdd workspace link <path>`
- **THEN** Pastelsdd SHALL infer the link name from the folder basename
- **AND** it SHALL store the verified absolute local path as machine-local state

#### Scenario: Linking with an explicit name
- **WHEN** a user runs `pastelsdd workspace link <name> <path>`
- **THEN** Pastelsdd SHALL use the explicit link name for planning
- **AND** it SHALL store the verified absolute local path as machine-local state

#### Scenario: Requiring an existing path
- **WHEN** a user links a repo or folder path
- **THEN** the path SHALL exist on the current machine
- **AND** Pastelsdd SHALL reject missing paths with a clear message

#### Scenario: Resolving linked paths before storage
- **WHEN** a user links a repo or folder path
- **THEN** Pastelsdd SHALL store the verified absolute path for the current runtime
- **AND** relative inputs SHALL be resolved against the command's current working directory
- **AND** Pastelsdd SHALL not translate paths between native Windows, WSL2, and Unix runtimes

#### Scenario: Linking a monorepo folder
- **WHEN** a user links a package, service, app, or directory inside a monorepo
- **THEN** Pastelsdd SHALL store it as a workspace link
- **AND** it SHALL not require that folder to have its own repo-local `pastelsdd/` directory

#### Scenario: Linking without repo-local Pastelsdd
- **WHEN** a user links a path that does not contain repo-local Pastelsdd state
- **THEN** Pastelsdd SHALL keep that repo or folder available for workspace planning
- **AND** it SHALL not treat missing repo-local Pastelsdd state as a link failure

#### Scenario: Link records only
- **WHEN** a user links a repo or folder
- **THEN** Pastelsdd SHALL record workspace state and local path state
- **AND** it SHALL not create, copy, move, initialize, or edit files in the linked repo or folder

#### Scenario: Blocking link when local state is invalid
- **GIVEN** the workspace machine-local state file exists but cannot be parsed or validated
- **WHEN** a user runs `pastelsdd workspace link`
- **THEN** Pastelsdd SHALL fail with status code `workspace_local_state_invalid`
- **AND** it SHALL not rewrite shared workspace state or machine-local path state

#### Scenario: Reusing a link name
- **GIVEN** a workspace already has a link with a given name
- **WHEN** a user tries to link another path with the same name
- **THEN** Pastelsdd SHALL explain that the link name is already in use by another link
- **AND** it SHALL show the existing link name and existing path
- **AND** it SHALL suggest choosing a different link name
- **AND** it SHALL suggest `workspace relink <name> <path>` when the user intended to change the existing link path
- **AND** it SHALL preserve the existing link unless the user explicitly relinks it

### Requirement: Workspace Relinks
Pastelsdd SHALL let users update existing link paths without recreating the workspace.

#### Scenario: Updating a local path
- **GIVEN** a workspace has a link
- **WHEN** a user runs `pastelsdd workspace relink <name> <path>`
- **THEN** Pastelsdd SHALL keep the stable link name
- **AND** it SHALL update the machine-local path for the current machine to the verified absolute path

#### Scenario: Requiring an existing relink path
- **WHEN** a user relinks to a new path
- **THEN** the new path SHALL exist on the current machine
- **AND** Pastelsdd SHALL reject missing paths with a clear message

#### Scenario: Resolving relink paths before storage
- **WHEN** a user relinks to a new path
- **THEN** Pastelsdd SHALL store the verified absolute path for the current runtime
- **AND** relative inputs SHALL be resolved against the command's current working directory

#### Scenario: Blocking relink when local state is invalid
- **GIVEN** the workspace machine-local state file exists but cannot be parsed or validated
- **WHEN** a user runs `pastelsdd workspace relink`
- **THEN** Pastelsdd SHALL fail with status code `workspace_local_state_invalid`
- **AND** it SHALL not rewrite machine-local path state

#### Scenario: Updating an unknown link
- **WHEN** a user tries to relink a link that does not exist
- **THEN** Pastelsdd SHALL explain that the link name is unknown
- **AND** it SHALL preserve existing workspace state

#### Scenario: Avoiding owner and handoff fields
- **WHEN** users link or relink repos or folders in this slice
- **THEN** Pastelsdd SHALL not ask for owner or handoff metadata
- **AND** link maintenance SHALL focus on names and local paths

### Requirement: Workspace Health Check
Pastelsdd SHALL explain what the current machine can resolve for a workspace.

#### Scenario: Doctor checks one selected workspace
- **WHEN** a user runs `pastelsdd workspace doctor`
- **THEN** Pastelsdd SHALL inspect one selected workspace
- **AND** it SHALL not scan every known workspace in the local registry by default

#### Scenario: Doctor infers the current workspace
- **GIVEN** the command runs from a workspace folder or subdirectory
- **WHEN** the user runs `pastelsdd workspace doctor` without `--workspace <name>`
- **THEN** Pastelsdd SHALL inspect the current workspace

#### Scenario: Checking a healthy workspace
- **WHEN** a user runs `pastelsdd workspace doctor`
- **THEN** Pastelsdd SHALL show the workspace location and workspace planning path
- **AND** it SHALL show linked repos or folders and which paths resolve on the current machine

#### Scenario: Selected workspace location is missing
- **GIVEN** the selected workspace comes from the local registry
- **AND** the registered workspace location is missing or invalid
- **WHEN** a user runs `pastelsdd workspace doctor`
- **THEN** Pastelsdd SHALL report a selected-workspace status error
- **AND** it SHALL not attempt to inspect links for that workspace

#### Scenario: Reporting repo-local specs paths
- **WHEN** a linked repo or folder resolves
- **THEN** doctor SHALL report `repo_specs_path` when repo-local `pastelsdd/specs` exists
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
- **THEN** Pastelsdd SHALL report status code `workspace_local_state_invalid`
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
Pastelsdd SHALL provide JSON output for direct workspace setup commands.

#### Scenario: Requesting JSON output
- **WHEN** a user passes `--json` to direct workspace setup commands
- **THEN** Pastelsdd SHALL print machine-readable output
- **AND** the output SHALL avoid extra human-readable text
- **AND** the output SHALL separate primary objects from structured `status` entries

#### Scenario: Setup JSON requires non-interactive setup
- **WHEN** a user runs `pastelsdd workspace setup --json` without `--no-interactive`
- **THEN** Pastelsdd SHALL fail clearly
- **AND** it SHALL explain that `workspace setup --json` requires `--no-interactive`

#### Scenario: JSON output disables prompts
- **WHEN** a direct workspace setup command runs with `--json`
- **THEN** Pastelsdd SHALL avoid interactive prompts
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

### Requirement: Workspace setup installs agent skills
Pastelsdd SHALL let users install Pastelsdd agent skills into a workspace during workspace setup.

#### Scenario: Prompting for workspace agent skills
- **WHEN** interactive workspace setup reaches agent skill installation
- **THEN** Pastelsdd SHALL ask which agents should get Pastelsdd skills in this workspace
- **AND** the prompt SHALL use agent-skill language rather than "AI tools" language

#### Scenario: Preselecting the preferred opener
- **GIVEN** the user selected a preferred opener that supports Pastelsdd skill generation
- **WHEN** interactive workspace setup asks which agents should get skills
- **THEN** Pastelsdd SHALL preselect the matching agent
- **AND** the user SHALL be able to select additional agents or deselect the preselected agent

#### Scenario: Installing selected workspace skills
- **WHEN** workspace setup completes with one or more selected agents
- **THEN** Pastelsdd SHALL generate or refresh Pastelsdd skill files under the workspace root for each selected agent
- **AND** it SHALL report which agents received skills
- **AND** it SHALL store the selected agents in workspace-local machine state

#### Scenario: Installing profile-selected workflows
- **GIVEN** global config resolves to a workflow profile
- **WHEN** workspace setup installs agent skills
- **THEN** Pastelsdd SHALL install workspace-local skills for the workflows selected by that profile
- **AND** it SHALL treat `--tools` as agent selection, not workflow selection
- **AND** it SHALL record the last applied workflow IDs for drift detection

#### Scenario: Installing skills only during setup
- **WHEN** workspace setup installs agent skills
- **THEN** Pastelsdd SHALL generate skill files only
- **AND** it SHALL not generate slash command files or global command files as part of workspace setup

#### Scenario: Ignoring command delivery for workspace setup
- **GIVEN** global config delivery is `commands` or `both`
- **WHEN** workspace setup installs agent skills
- **THEN** Pastelsdd SHALL still generate workspace-local skills only
- **AND** it SHALL report that workspace command generation is not part of this slice

#### Scenario: Preserving linked repos during skill installation
- **WHEN** workspace setup installs agent skills
- **THEN** Pastelsdd SHALL leave linked repos and folders unchanged
- **AND** generated skills SHALL be scoped to the workspace planning home

#### Scenario: Non-interactive setup tool selection
- **WHEN** non-interactive workspace setup receives `--tools all`, `--tools none`, or `--tools <ids>`
- **THEN** Pastelsdd SHALL use the selected tool set for workspace agent skill installation
- **AND** it SHALL validate tool IDs using the same supported tool IDs as skill generation for repo initialization

#### Scenario: Non-interactive setup without tool selection
- **WHEN** non-interactive workspace setup omits `--tools`
- **THEN** Pastelsdd SHALL create the workspace without installing agent skills
- **AND** it SHALL report that no workspace skills were installed
- **AND** it SHALL tell the user to run `pastelsdd workspace update --tools <ids>` to install skills later

#### Scenario: Reporting setup skills in JSON output
- **WHEN** non-interactive workspace setup installs agent skills with JSON output enabled
- **THEN** Pastelsdd SHALL include generated, refreshed, skipped, or failed skill installation results in machine-readable output

### Requirement: Workspace update manages agent skills
Pastelsdd SHALL provide a workspace update flow for refreshing agent skills after setup.

#### Scenario: Updating the current workspace
- **GIVEN** the command runs from inside an Pastelsdd workspace
- **WHEN** the user runs `pastelsdd workspace update`
- **THEN** Pastelsdd SHALL update that current workspace

#### Scenario: Updating a named workspace
- **GIVEN** a workspace named `platform` is known locally
- **WHEN** the user runs `pastelsdd workspace update platform`
- **THEN** Pastelsdd SHALL update the `platform` workspace

#### Scenario: Updating a workspace selected by flag
- **GIVEN** a workspace named `platform` is known locally
- **WHEN** the user runs `pastelsdd workspace update --workspace platform`
- **THEN** Pastelsdd SHALL update the `platform` workspace

#### Scenario: Updating selected workspace skills
- **WHEN** workspace update completes with selected agents
- **THEN** Pastelsdd SHALL refresh Pastelsdd skills for selected agents
- **AND** it SHALL add skills for newly selected agents
- **AND** it SHALL remove Pastelsdd-managed workflow skill directories for agents that are no longer selected
- **AND** it SHALL update the stored workspace-local selected agent list

#### Scenario: Identifying managed workflow skill directories
- **WHEN** workspace update evaluates a workflow skill directory for removal
- **THEN** Pastelsdd SHALL treat it as Pastelsdd-managed only when the directory name matches a known generated workflow skill directory and its `SKILL.md` contains Pastelsdd generated metadata
- **AND** generated metadata SHALL include the `generatedBy` marker written by Pastelsdd skill generation
- **AND** Pastelsdd SHALL not remove directories that are missing the generated metadata, even when their names match known workflow skill directory names

#### Scenario: Updating profile-selected workflows
- **GIVEN** global config resolves to a workflow profile
- **WHEN** workspace update refreshes workspace-local skills
- **THEN** Pastelsdd SHALL sync the workspace-local skill workflow set to the workflows selected by that profile
- **AND** deselected workflow skill directories SHALL be removed only when they are known Pastelsdd-managed workflow skill directories
- **AND** it SHALL update the last applied workflow IDs used for drift detection

#### Scenario: Ignoring command delivery for workspace update
- **GIVEN** global config delivery is `commands` or `both`
- **WHEN** workspace update refreshes workspace-local skills
- **THEN** Pastelsdd SHALL still update workspace-local skills only
- **AND** it SHALL not generate slash command files or global command files

#### Scenario: Removing only managed skill directories
- **WHEN** workspace update removes skills for an unselected agent
- **THEN** Pastelsdd SHALL remove only known Pastelsdd-managed workflow skill directories
- **AND** it SHALL preserve unrelated files in the agent directory

#### Scenario: Updating stored agent selection by flag
- **WHEN** workspace update receives `--tools <ids>` or `--tools none`
- **THEN** Pastelsdd SHALL replace the stored workspace-local selected agent list with that selection
- **AND** future workspace updates without `--tools` SHALL use the stored selection

#### Scenario: Non-interactive update tool selection
- **WHEN** workspace update receives `--tools all`, `--tools none`, or `--tools <ids>`
- **THEN** Pastelsdd SHALL update workspace agent skills using that selected tool set
- **AND** it SHALL avoid prompting for agent selection

#### Scenario: Non-interactive update without tool selection
- **GIVEN** workspace-local selected agents are stored
- **WHEN** non-interactive workspace update omits `--tools`
- **THEN** Pastelsdd SHALL refresh the stored selected agents using the active global profile
- **AND** it SHALL avoid prompting for agent selection

#### Scenario: Non-interactive update without stored selection
- **GIVEN** no workspace-local selected agents are stored
- **WHEN** non-interactive workspace update omits `--tools`
- **THEN** Pastelsdd SHALL complete without installing agent skills
- **AND** it SHALL report a no-op with guidance to pass `--tools`

#### Scenario: Reporting workspace skill drift
- **GIVEN** workspace-local skill state records last applied workflow IDs
- **AND** the active global profile resolves to a different workflow set
- **WHEN** Pastelsdd reports workspace skill state
- **THEN** it SHALL report that workspace-local skills are out of sync with the global profile
- **AND** it SHALL suggest `pastelsdd workspace update`

#### Scenario: Reporting clean workspace skill sync
- **GIVEN** workspace-local skill state matches the active global profile and selected agents
- **WHEN** Pastelsdd reports workspace skill state
- **THEN** it SHALL not report profile drift

#### Scenario: Reporting workspace skill update results
- **WHEN** workspace update changes agent skill state
- **THEN** Pastelsdd SHALL report which agents were refreshed, added, removed, skipped, or failed

#### Scenario: Reporting workspace update results in JSON output
- **WHEN** workspace update runs with JSON output enabled
- **THEN** Pastelsdd SHALL include refreshed, added, removed, skipped, or failed skill results in machine-readable output

### Requirement: Workspace skill update surface is documented
Pastelsdd SHALL expose workspace skill setup/update behavior in user-facing command surfaces.

#### Scenario: Workspace update appears in help
- **WHEN** a user runs `pastelsdd workspace --help`
- **THEN** Pastelsdd SHALL list `workspace update`
- **AND** it SHALL describe it as refreshing workspace-local agent skills

#### Scenario: Workspace update options appear in help
- **WHEN** a user runs `pastelsdd workspace update --help`
- **THEN** Pastelsdd SHALL document workspace selection options
- **AND** it SHALL document `--tools all|none|<ids>`
- **AND** it SHALL state that global profile selects workflows and `--tools` selects agents

#### Scenario: Workspace update appears in completions
- **WHEN** shell completions are generated
- **THEN** the workspace command registry SHALL include `workspace update`
- **AND** it SHALL include relevant options such as `--workspace`, `--tools`, `--json`, and `--no-interactive`
