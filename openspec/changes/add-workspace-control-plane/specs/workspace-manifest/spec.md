## ADDED Requirements

### Requirement: Checked-in workspace manifest
The system SHALL represent multi-repo workspace topology in a checked-in manifest file at the workspace root.

#### Scenario: Workspace manifest path
- **WHEN** a workspace is initialized
- **THEN** the system SHALL create `openspec-workspace.yaml` at the workspace root
- **AND** that file SHALL be treated as the source of truth for workspace topology

### Requirement: Manifest schema
The workspace manifest SHALL describe the control-plane repo, member repos, and generated router settings.

#### Scenario: Manifest includes control-plane and repos
- **WHEN** a valid workspace manifest is loaded
- **THEN** it SHALL include a control-plane path
- **AND** it SHALL support a list of member repos with name and relative path
- **AND** it MAY include repo role, tags, and instruction-file path metadata

#### Scenario: Generated router settings
- **WHEN** router generation is configured
- **THEN** the manifest SHALL support generation settings including whether `.agents.md` is enabled and where it should be written

### Requirement: Relative path normalization
The manifest SHALL store paths relative to the workspace root.

#### Scenario: Persisting discovered repos
- **WHEN** `openspec workspace init` persists discovered sibling repos
- **THEN** the manifest SHALL normalize their paths as relative paths from the workspace root
- **AND** SHALL use cross-platform-safe path handling

### Requirement: Validation of collisions and missing data
The manifest loader SHALL reject invalid or ambiguous workspace definitions.

#### Scenario: Duplicate repo names
- **WHEN** two manifest entries declare the same repo name
- **THEN** validation SHALL fail with a clear error

#### Scenario: Duplicate repo paths
- **WHEN** two manifest entries resolve to the same relative path
- **THEN** validation SHALL fail with a clear error

#### Scenario: Missing required control-plane path
- **WHEN** the manifest omits the control-plane path
- **THEN** validation SHALL fail before workspace sync proceeds
