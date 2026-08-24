## Purpose

Provide a safe CLI entry point for creating layered user schema overrides that retain packaged schema and template updates across projects.

## ADDED Requirements

### Requirement: Schema override command scaffolds a global overlay

The CLI SHALL provide `openspec schema override <name>` to create a user-level `schema.override.yaml` for an existing packaged schema without copying the complete schema or templates.

#### Scenario: Create overlay for packaged schema

- **GIVEN** a packaged schema named `spec-driven` exists
- **AND** no user replacement or overlay exists for that name
- **WHEN** the user runs `openspec schema override spec-driven`
- **THEN** the system SHALL create `${XDG_DATA_HOME}/openspec/schemas/spec-driven/schema.override.yaml`
- **AND** the file SHALL contain a valid no-op `patchVersion: 1` overlay
- **AND** it SHALL NOT copy the packaged `schema.yaml` or templates

#### Scenario: Command is independent of project schema

- **GIVEN** the current project contains a project-local schema with the same name
- **WHEN** the user runs `openspec schema override <name>`
- **THEN** the command SHALL target the packaged schema and user data directory
- **AND** it SHALL explain that the project schema remains higher priority in that project

#### Scenario: Packaged schema does not exist

- **WHEN** the user runs `openspec schema override custom` and no packaged schema named `custom` exists
- **THEN** the command SHALL fail with an actionable error
- **AND** it SHALL NOT create a user directory or file

### Requirement: Schema override command protects existing customization

The command SHALL not overwrite or ambiguously combine user customization without explicit authorization.

#### Scenario: Overlay already exists without force

- **WHEN** the destination `schema.override.yaml` already exists and `--force` is absent
- **THEN** the command SHALL fail and suggest `--force`
- **AND** the existing file SHALL remain unchanged

#### Scenario: Force replaces overlay atomically

- **WHEN** the destination overlay exists and the user supplies `--force`
- **THEN** the command SHALL stage and validate the replacement before swapping it into place
- **AND** a failure SHALL leave the previous overlay unchanged

#### Scenario: Complete user replacement conflicts

- **WHEN** the user schema directory contains `schema.yaml`
- **THEN** the command SHALL refuse to create `schema.override.yaml`
- **AND** it SHALL explain how complete replacement differs from layered customization

### Requirement: Schema override command supports JSON output

The command SHALL provide machine-readable success and error output.

#### Scenario: JSON success

- **WHEN** the user runs `openspec schema override spec-driven --json`
- **THEN** output SHALL contain `created: true`, `schema`, `path`, and `basePath`

#### Scenario: JSON failure

- **WHEN** overlay creation fails with `--json`
- **THEN** output SHALL contain `created: false` and an actionable `error`
- **AND** the command SHALL exit non-zero
