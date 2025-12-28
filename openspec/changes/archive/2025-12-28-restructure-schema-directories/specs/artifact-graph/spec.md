## MODIFIED Requirements

### Requirement: Schema Loading
The system SHALL load artifact graph definitions from YAML schema files within schema directories.

#### Scenario: Valid schema loaded
- **WHEN** a schema directory contains a valid `schema.yaml` file
- **THEN** the system returns an ArtifactGraph with all artifacts and dependencies

#### Scenario: Invalid schema rejected
- **WHEN** a schema YAML file is missing required fields
- **THEN** the system throws an error with a descriptive message

#### Scenario: Cyclic dependencies detected
- **WHEN** a schema contains cyclic artifact dependencies
- **THEN** the system throws an error listing the artifact IDs in the cycle

#### Scenario: Invalid dependency reference
- **WHEN** an artifact's `requires` array references a non-existent artifact ID
- **THEN** the system throws an error identifying the invalid reference

#### Scenario: Duplicate artifact IDs rejected
- **WHEN** a schema contains multiple artifacts with the same ID
- **THEN** the system throws an error identifying the duplicate

#### Scenario: Schema directory not found
- **WHEN** resolving a schema name that has no corresponding directory
- **THEN** the system throws an error listing available schemas

## ADDED Requirements

### Requirement: Schema Directory Structure
The system SHALL support self-contained schema directories with co-located templates.

#### Scenario: Schema with templates
- **WHEN** a schema directory contains `schema.yaml` and `templates/` subdirectory
- **THEN** artifacts can reference templates relative to the schema's templates directory

#### Scenario: User schema override
- **WHEN** a schema directory exists at `${XDG_DATA_HOME}/openspec/schemas/<name>/`
- **THEN** the system uses that directory instead of the built-in

#### Scenario: Built-in schema fallback
- **WHEN** no user override exists for a schema
- **THEN** the system uses the package built-in schema directory

#### Scenario: List available schemas
- **WHEN** listing schemas
- **THEN** the system returns schema names from both user and package directories
