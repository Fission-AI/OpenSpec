## ADDED Requirements

### Requirement: Recognizable Workspace Home
Pastelsdd SHALL give users and agents a recognizable workspace home for cross-repo planning.

#### Scenario: Planning across linked repos or folders
- **WHEN** a user creates an Pastelsdd workspace for repos or folders they plan across
- **THEN** the workspace SHALL provide a durable planning home
- **AND** the workspace SHALL be able to hold multiple changes over time

#### Scenario: Working from inside a workspace
- **GIVEN** a user runs Pastelsdd from a workspace root or one of its subdirectories
- **WHEN** Pastelsdd resolves the current workspace
- **THEN** it SHALL identify the workspace root
- **AND** it SHALL use the workspace root's `changes/` directory as the workspace planning area

#### Scenario: Avoiding accidental workspace mode
- **GIVEN** a directory has `changes/` but is not an Pastelsdd workspace
- **WHEN** Pastelsdd resolves the current workspace
- **THEN** it SHALL avoid treating that directory as a workspace
- **AND** it SHALL enter workspace mode only when the workspace identity file is present

### Requirement: Stable Workspace Name
Pastelsdd SHALL use one folder-style workspace name across workspace identity, managed storage, and the local registry.

#### Scenario: Using one workspace name
- **WHEN** Pastelsdd creates or registers a managed workspace
- **THEN** the workspace name SHALL be stored in `.pastelsdd-workspace/workspace.yaml`
- **AND** the same name SHALL be used as the default managed workspace folder name
- **AND** the same name SHALL be used as the local registry name

#### Scenario: Rejecting invalid folder-style names
- **WHEN** Pastelsdd accepts a workspace name
- **THEN** it SHALL reject empty names, `.` or `..`, and names containing path separators
- **AND** setup or create flows SHALL report OS-level folder creation failures clearly

### Requirement: Dedicated Workspace Identity
Pastelsdd SHALL distinguish a coordination workspace from a repo-local Pastelsdd project.

#### Scenario: Reading workspace identity
- **WHEN** Pastelsdd reads or writes workspace identity and workspace state
- **THEN** it SHALL use `.pastelsdd-workspace/`

#### Scenario: Preserving repo-local Pastelsdd projects
- **GIVEN** a repo-local Pastelsdd project uses `pastelsdd/`
- **WHEN** that repo is linked to a workspace
- **THEN** Pastelsdd SHALL continue treating `pastelsdd/` as that repo's local Pastelsdd directory
- **AND** workspace planning SHALL remain anchored in the workspace root

#### Scenario: Avoiding repo-local initialization in the workspace root
- **WHEN** a user is working from an Pastelsdd workspace root
- **THEN** Pastelsdd SHALL treat that root as a workspace coordination surface
- **AND** users SHALL not need to initialize a repo-local `pastelsdd/` project inside the workspace root

### Requirement: Safe Workspace Sharing
Pastelsdd SHALL keep shared workspace information separate from local machine paths.

#### Scenario: Sharing workspace planning
- **WHEN** a workspace is shared with another user or machine
- **THEN** shared workspace information SHALL include portable workspace identity and stable link names
- **AND** it SHALL not require another user to reuse the original user's absolute checkout paths

#### Scenario: Keeping checkout paths local
- **WHEN** Pastelsdd stores local paths for a workspace
- **THEN** those paths SHALL be treated as local to the current machine and runtime
- **AND** another machine MAY map the same link names to different local paths

#### Scenario: Preserving runtime-local paths
- **WHEN** Pastelsdd reads or writes local workspace paths
- **THEN** it SHALL preserve path strings valid for the current runtime
- **AND** it SHALL support native Windows paths and WSL2/Linux paths as local state values

#### Scenario: Excluding local state from portable collaboration
- **WHEN** Pastelsdd creates a workspace
- **THEN** it SHALL exclude `.pastelsdd-workspace/local.yaml` from portable collaboration state by default
- **AND** `.pastelsdd-workspace/workspace.yaml` SHALL remain the portable workspace identity and link-name state

### Requirement: Standard Workspace Location
Pastelsdd SHALL use a standard location for Pastelsdd-managed workspaces without asking most users to choose one.

#### Scenario: Using the standard workspace location
- **WHEN** Pastelsdd needs the location for Pastelsdd-managed workspaces
- **THEN** it SHALL use `<global-data-dir>/workspaces`
- **AND** `<global-data-dir>` SHALL follow existing Pastelsdd XDG and platform data directory behavior

#### Scenario: Avoiding workspace-specific storage overrides
- **WHEN** Pastelsdd resolves the location for Pastelsdd-managed workspaces
- **THEN** it SHALL not use a workspace-specific environment variable, command, or configuration setting in this slice
- **AND** managed workspace storage SHALL remain under `<global-data-dir>/workspaces`

#### Scenario: Running from native Windows
- **WHEN** Pastelsdd runs from native Windows shells such as PowerShell
- **AND** `XDG_DATA_HOME` is not set
- **THEN** Pastelsdd SHALL store managed workspaces under the Windows global data location
- **AND** paths SHALL follow native Windows path behavior

#### Scenario: Running from WSL2
- **WHEN** Pastelsdd runs from WSL2
- **THEN** Pastelsdd SHALL store managed workspaces under the Linux/XDG data location inside WSL
- **AND** paths SHALL follow Linux path behavior inside WSL

#### Scenario: Using the workspace location automatically
- **WHEN** Pastelsdd creates or resolves Pastelsdd-managed workspaces in later workflows
- **THEN** it SHALL use the resolved workspace location by default
- **AND** users SHALL be able to follow the normal workspace flow without choosing a storage location

#### Scenario: Showing the workspace path
- **WHEN** Pastelsdd creates a workspace in the standard workspace location
- **THEN** it SHALL report the workspace path to the user
- **AND** it SHALL not hide where planning files were created

#### Scenario: Staying in the current runtime
- **WHEN** Pastelsdd resolves workspace paths or local repo paths
- **THEN** it SHALL interpret paths for the runtime running Pastelsdd
- **AND** Windows, UNC WSL, and WSL mount paths SHALL remain explicit user-provided paths

### Requirement: Local Workspace Registry
Pastelsdd SHALL keep a lightweight local registry of known workspaces on the current machine.

#### Scenario: Recording known workspaces
- **WHEN** Pastelsdd creates or learns about a managed workspace
- **THEN** it SHALL be able to record the workspace name and path in a local registry
- **AND** the registry SHALL be machine-local state

#### Scenario: Keeping workspace folders authoritative
- **WHEN** Pastelsdd reads workspace details
- **THEN** each workspace folder's `.pastelsdd-workspace/workspace.yaml` SHALL remain the source of truth for that workspace
- **AND** the local registry SHALL act only as an index of known workspace paths

#### Scenario: Finding workspaces from anywhere
- **WHEN** a later workspace command runs outside a workspace directory
- **THEN** Pastelsdd MAY use the local registry to find known workspaces
- **AND** commands that need one workspace MAY use the registry to support an interactive picker

### Requirement: Stable Link Names
Pastelsdd SHALL use stable link names to refer to repos and folders in workspace planning.

#### Scenario: Referring to a repo or folder in workspace planning
- **WHEN** workspace state or later workspace planning artifacts refer to a linked repo or folder
- **THEN** they SHALL use the stable link name
- **AND** the same link name SHALL remain valid even when local checkout paths differ

#### Scenario: Reusing link names across machines
- **WHEN** a workspace is used on another machine
- **THEN** link names SHALL remain stable
- **AND** local checkout paths MAY differ on that machine

#### Scenario: Rejecting invalid link names
- **WHEN** Pastelsdd accepts a workspace link name
- **THEN** it SHALL reject empty names, `.` or `..`, and names containing path separators
- **AND** link names SHALL be unique within the workspace

### Requirement: Linked Repos And Folders
Pastelsdd SHALL allow workspace planning to include linked repos and folders before they have repo-local Pastelsdd state.

#### Scenario: Planning with a repo that has not adopted Pastelsdd
- **WHEN** a workspace links a repo path that does not yet contain repo-local `pastelsdd/`
- **THEN** the repo SHALL still be available for workspace-level planning
- **AND** implementation readiness MAY be handled by a later workflow

#### Scenario: Planning across monorepo folders
- **WHEN** planning spans multiple packages, services, apps, or directories inside one monorepo
- **THEN** the workspace SHALL be able to link those folders separately
- **AND** each folder SHALL not need its own repo-local `pastelsdd/` directory to participate in workspace planning

#### Scenario: Treating repos and folders consistently
- **WHEN** a workspace plan includes both separate repos and folders inside a monorepo
- **THEN** Pastelsdd SHALL use the same planning model for both
- **AND** users SHALL not need to create different kinds of workspace plans for multi-repo and monorepo changes

#### Scenario: Recording links without changing targets
- **WHEN** Pastelsdd records a link between a workspace and a local repo or folder
- **THEN** it SHALL store the link in workspace state
- **AND** it SHALL not create, copy, move, initialize, or edit files inside the linked repo or folder

### Requirement: Planning Before Implementation
Pastelsdd SHALL treat workspace creation and detection as planning setup, not implementation.

#### Scenario: Creating or detecting a workspace
- **WHEN** a workspace exists
- **THEN** Pastelsdd SHALL treat it as a place for workspace-level planning
- **AND** repo implementation files SHALL remain unchanged until an explicit implementation workflow runs

#### Scenario: Deferring repo implementation
- **WHEN** repo-local implementation, apply, verify, or archive behavior is needed
- **THEN** that behavior SHALL require an explicit later workspace workflow

### Requirement: Repo Ownership Boundaries
Pastelsdd SHALL keep repo ownership legible when planning happens in a workspace.

#### Scenario: Planning across owned repos
- **WHEN** a workspace plan refers to behavior owned by a repo or source area
- **THEN** that owner SHALL remain the home for canonical specs and implementation work
- **AND** the workspace SHALL make the cross-boundary plan visible without taking ownership away from that owner

#### Scenario: Drafting before ownership is clear
- **WHEN** cross-repo behavior is still being explored and ownership is not clear
- **THEN** the workspace MAY hold planning notes or draft behavior
- **AND** those drafts SHALL remain distinguishable from canonical repo-owned specs
