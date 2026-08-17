## ADDED Requirements

### Requirement: Layered user schema override resolution

The system SHALL compose a packaged schema with a user-level `schema.override.yaml` of the same name when no complete project or user schema has higher precedence.

#### Scenario: User overlay augments packaged schema

- **GIVEN** `spec-driven` exists as a packaged schema
- **AND** `${XDG_DATA_HOME}/openspec/schemas/spec-driven/schema.override.yaml` exists
- **AND** no complete project or user `spec-driven/schema.yaml` exists
- **WHEN** the system resolves `spec-driven`
- **THEN** it SHALL use the packaged schema as the base
- **AND** it SHALL apply the user overlay to produce the effective schema

#### Scenario: Project schema suppresses user overlay

- **GIVEN** project-local `spec-driven/schema.yaml`, user `spec-driven/schema.override.yaml`, and packaged `spec-driven/schema.yaml` all exist
- **WHEN** the system resolves `spec-driven` with that project root
- **THEN** it SHALL use the complete project schema unchanged
- **AND** it SHALL NOT apply the user overlay

#### Scenario: Complete user schema retains replacement behavior

- **GIVEN** no project-local `spec-driven` schema exists
- **AND** a complete user `spec-driven/schema.yaml` exists
- **WHEN** the system resolves `spec-driven`
- **THEN** it SHALL use the complete user schema unchanged
- **AND** it SHALL NOT compose it with the packaged schema

#### Scenario: Rootless resolution supports user overlay

- **GIVEN** a packaged schema and matching user overlay exist
- **WHEN** schema resolution is called without a project root
- **THEN** it SHALL compose the packaged schema with the user overlay
- **AND** it SHALL NOT inspect project-local schema directories

#### Scenario: Overlay without packaged base is rejected

- **GIVEN** `${XDG_DATA_HOME}/openspec/schemas/custom/schema.override.yaml` exists
- **AND** no packaged schema named `custom` exists
- **WHEN** the system resolves or lists schemas
- **THEN** it SHALL NOT treat the overlay as a standalone schema
- **AND** validation or direct resolution SHALL report that the packaged base is missing

### Requirement: User schema customization mode is unambiguous

The system SHALL prevent one user schema directory from acting as both a complete replacement and a layered override.

#### Scenario: Complete replacement conflicts with overlay

- **GIVEN** a user schema directory contains both `schema.yaml` and `schema.override.yaml`
- **AND** no project-local schema of the same name has higher priority
- **WHEN** the schema is resolved or validated
- **THEN** the operation SHALL fail with a diagnostic naming both files
- **AND** it SHALL instruct the user to choose complete replacement or layered customization

#### Scenario: Project schema remains authoritative over inactive user conflict

- **GIVEN** a project-local schema exists
- **AND** the same-named user directory contains both `schema.yaml` and `schema.override.yaml`
- **WHEN** the schema is resolved with that project root
- **THEN** the complete project schema SHALL remain active
- **AND** runtime schema loading SHALL NOT fail because of the inactive user-layer conflict

### Requirement: Composed schemas remain discoverable

Schema listing SHALL include a packaged schema when a valid user overlay is present and SHALL derive its effective description and artifacts from the composed schema.

#### Scenario: Listing includes composed package schema once

- **GIVEN** a packaged `spec-driven` schema and matching user overlay exist
- **WHEN** schemas are listed
- **THEN** `spec-driven` SHALL appear exactly once
- **AND** its effective description and artifact IDs SHALL reflect the composed schema

#### Scenario: Invalid overlay does not silently disappear

- **GIVEN** a user overlay for a packaged schema is invalid
- **WHEN** that schema is explicitly resolved or validated
- **THEN** the operation SHALL report the overlay error and its path
- **AND** it SHALL NOT silently fall back to the unmodified packaged schema
