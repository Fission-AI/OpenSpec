## MODIFIED Requirements

### Requirement: Stable Workspace Name
OpenSpec SHALL use one kebab-case workspace name across workspace identity, managed storage, and the local registry.

#### Scenario: Using one workspace name
- **WHEN** OpenSpec creates or records a managed workspace
- **THEN** the workspace name SHALL be stored in `.openspec-workspace/workspace.yaml`
- **AND** the same name SHALL be used as the default managed workspace folder name
- **AND** the same name SHALL be used as the local registry name

#### Scenario: Rejecting invalid workspace names
- **WHEN** OpenSpec accepts a workspace name
- **THEN** it SHALL require kebab-case names using lowercase letters, numbers, and single hyphen separators
- **AND** it SHALL reject empty names, dot names, names with leading or trailing hyphens, names with repeated hyphens, uppercase letters, spaces, underscores, dots, and path separators
- **AND** setup flows SHALL report OS-level folder creation failures clearly

### Requirement: Stable Link Names
OpenSpec SHALL use stable folder-style link names to refer to repos and folders in workspace planning.

#### Scenario: Referring to a repo or folder in workspace planning
- **WHEN** workspace state or later workspace planning artifacts refer to a linked repo or folder
- **THEN** they SHALL use the stable link name
- **AND** the same link name SHALL remain valid even when local checkout paths differ

#### Scenario: Reusing link names across machines
- **WHEN** a workspace is used on another machine
- **THEN** link names SHALL remain stable
- **AND** local checkout paths MAY differ on that machine

#### Scenario: Rejecting invalid link names
- **WHEN** OpenSpec accepts a workspace link name
- **THEN** it SHALL reject empty names, `.` or `..`, and names containing path separators
- **AND** link names SHALL be unique within the workspace
- **AND** link names SHALL not be required to use workspace-name kebab-case
