## ADDED Requirements

### Requirement: Schema fork copies existing schema
The CLI SHALL provide an `openspec schema fork <source> [name]` command that copies an existing schema to the project's `openspec/schemas/` directory.

#### Scenario: Fork with explicit name
- **WHEN** user runs `openspec schema fork spec-driven my-custom`
- **THEN** system locates `spec-driven` schema using resolution order (project → user → package)
- **AND** copies all files to `openspec/schemas/my-custom/`
- **AND** updates `name` field in `schema.yaml` to `my-custom`
- **AND** displays success message with source and destination paths

#### Scenario: Fork with default name
- **WHEN** user runs `openspec schema fork spec-driven` without specifying a name
- **THEN** system copies to `openspec/schemas/spec-driven-custom/`
- **AND** updates `name` field in `schema.yaml` to `spec-driven-custom`

#### Scenario: Source schema not found
- **WHEN** user runs `openspec schema fork nonexistent`
- **THEN** system displays error that schema was not found
- **AND** lists available schemas
- **AND** exits with non-zero code

### Requirement: Schema fork prevents accidental overwrites
The CLI SHALL require confirmation or `--force` flag when the destination schema already exists.

#### Scenario: Destination exists without force
- **WHEN** user runs `openspec schema fork spec-driven my-custom` and `openspec/schemas/my-custom/` exists
- **THEN** system displays error that destination already exists
- **AND** suggests using `--force` to overwrite
- **AND** exits with non-zero code

#### Scenario: Destination exists with force flag
- **WHEN** user runs `openspec schema fork spec-driven my-custom --force` and destination exists
- **THEN** system removes existing destination directory
- **AND** copies source schema to destination
- **AND** displays success message

#### Scenario: Interactive confirmation for overwrite
- **WHEN** user runs `openspec schema fork spec-driven my-custom` in interactive mode and destination exists
- **THEN** system prompts for confirmation to overwrite
- **AND** proceeds based on user response

### Requirement: Schema fork preserves all schema files
The CLI SHALL copy the complete schema directory including templates, configuration, and any additional files.

#### Scenario: Copy includes template files
- **WHEN** user forks a schema with template files (e.g., `proposal.md`, `design.md`)
- **THEN** all template files are copied to the destination
- **AND** template file contents are unchanged

#### Scenario: Copy includes nested directories
- **WHEN** user forks a schema with nested directories (e.g., `templates/specs/`)
- **THEN** nested directory structure is preserved
- **AND** all nested files are copied

### Requirement: Schema fork outputs JSON format
The CLI SHALL support `--json` flag for machine-readable output.

#### Scenario: JSON output on success
- **WHEN** user runs `openspec schema fork spec-driven my-custom --json`
- **THEN** system outputs JSON with `forked: true`, `source`, `destination`, and `sourcePath` fields

#### Scenario: JSON output shows source location
- **WHEN** user runs `openspec schema fork spec-driven --json`
- **THEN** JSON output includes `sourceLocation` field indicating "project", "user", or "package"
