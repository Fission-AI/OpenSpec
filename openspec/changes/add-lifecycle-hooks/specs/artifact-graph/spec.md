# artifact-graph Delta Spec

## MODIFIED Requirements

### Requirement: Schema Loading

The system SHALL load artifact graph definitions from YAML schema files within schema directories, including an optional `hooks` section.

#### Scenario: Valid schema loaded

- **WHEN** a schema directory contains a valid `schema.yaml` file
- **THEN** the system returns an ArtifactGraph with all artifacts and dependencies

#### Scenario: Schema with hooks section

- **WHEN** a schema `schema.yaml` contains a `hooks` section
- **THEN** the system parses the hooks alongside artifacts
- **AND** the parsed schema includes the hooks data

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
