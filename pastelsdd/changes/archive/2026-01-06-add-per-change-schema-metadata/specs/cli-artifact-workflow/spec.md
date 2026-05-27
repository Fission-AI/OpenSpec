## ADDED Requirements

### Requirement: Change Metadata

The system SHALL store and validate per-change metadata in `.pastelsdd.yaml` files using a Zod schema.

#### Scenario: Metadata file created with new change

- **WHEN** user runs `pastelsdd new change add-feature --schema tdd`
- **THEN** the system creates `.pastelsdd.yaml` in the change directory
- **AND** the file contains `schema: tdd` and `created: <YYYY-MM-DD>`

#### Scenario: Metadata validated on read

- **WHEN** the system reads `.pastelsdd.yaml`
- **AND** the `schema` field references an unknown schema
- **THEN** the system displays a validation error listing available schemas

#### Scenario: Metadata schema validation

- **WHEN** `.pastelsdd.yaml` contains invalid YAML or missing required fields
- **THEN** the system displays a Zod validation error with details

#### Scenario: Missing metadata file

- **WHEN** a change directory has no `.pastelsdd.yaml` file
- **THEN** the system falls back to the default schema (`spec-driven`)

## MODIFIED Requirements

### Requirement: New Change Command

The system SHALL create new change directories with validation and optional schema metadata.

#### Scenario: Create valid change

- **WHEN** user runs `pastelsdd new change add-feature`
- **THEN** the system creates `pastelsdd/changes/add-feature/` directory
- **AND** creates `.pastelsdd.yaml` with `schema: spec-driven` (default)

#### Scenario: Create change with schema

- **WHEN** user runs `pastelsdd new change add-feature --schema tdd`
- **THEN** the system creates `pastelsdd/changes/add-feature/` directory
- **AND** creates `.pastelsdd.yaml` with `schema: tdd`

#### Scenario: Invalid schema on create

- **WHEN** user runs `pastelsdd new change add-feature --schema unknown`
- **THEN** the system displays an error listing available schemas
- **AND** does not create the change directory

#### Scenario: Invalid change name

- **WHEN** user runs `pastelsdd new change "Add Feature"` with invalid name
- **THEN** the system displays validation error with guidance

#### Scenario: Duplicate change name

- **WHEN** user runs `pastelsdd new change existing-change` for an existing change
- **THEN** the system displays an error indicating the change already exists

#### Scenario: Create with description

- **WHEN** user runs `pastelsdd new change add-feature --description "Add new feature"`
- **THEN** the system creates the change directory with description in README.md

### Requirement: Schema Selection

The system SHALL support custom schema selection for workflow commands, with automatic detection from change metadata.

#### Scenario: Schema auto-detected from metadata

- **WHEN** user runs `pastelsdd status --change <id>` without `--schema`
- **AND** the change has `.pastelsdd.yaml` with `schema: tdd`
- **THEN** the system uses the `tdd` schema

#### Scenario: Explicit schema overrides metadata

- **WHEN** user runs `pastelsdd status --change <id> --schema spec-driven`
- **AND** the change has `.pastelsdd.yaml` with `schema: tdd`
- **THEN** the system uses `spec-driven` (explicit flag wins)

#### Scenario: Default schema fallback

- **WHEN** user runs workflow commands without `--schema`
- **AND** the change has no `.pastelsdd.yaml` file
- **THEN** the system uses the "spec-driven" schema

#### Scenario: Custom schema via flag

- **WHEN** user runs `pastelsdd status --change <id> --schema tdd`
- **THEN** the system uses the specified schema for artifact graph

#### Scenario: Unknown schema

- **WHEN** user specifies an unknown schema
- **THEN** the system displays an error listing available schemas
