## ADDED Requirements

### Requirement: Resolve schemas from a configured schema Store

The system SHALL treat visible schemas from the configured schema Store as the project schema layer without changing the planning root.

#### Scenario: Store schema resolves ahead of user schema
- **WHEN** a visible schema with the same name exists in the schema Store and user schema directory
- **THEN** the Store schema SHALL resolve

#### Scenario: Store schema resolves ahead of package schema
- **WHEN** a visible schema with the same name exists in the schema Store and package
- **THEN** the Store schema SHALL resolve

#### Scenario: Hidden Store schema does not participate
- **WHEN** a schema exists in the schema Store but is excluded by the visibility allowlist
- **THEN** it SHALL NOT participate in resolution, listing, suggestions, or shadow reporting

#### Scenario: User fallback remains available
- **WHEN** the requested schema is not visible in the schema Store but exists in the user schema directory
- **THEN** the user schema SHALL resolve

#### Scenario: Package fallback remains available
- **WHEN** the requested schema is not visible in the schema Store or user directory but exists in the package
- **THEN** the package schema SHALL resolve

#### Scenario: Consumer-local project schemas are replaced
- **WHEN** `schemaStore` is configured
- **AND** the consumer repository also contains a project-local schema
- **THEN** the schema Store SHALL be the only project-layer schema source
- **AND** the consumer-local schema SHALL NOT participate

### Requirement: List schemas includes visible schema Store entries

The system SHALL list each visible valid schema from the configured schema Store once and report its Store provenance.

#### Scenario: Store schema appears in listing
- **WHEN** `qeda-sdd` is visible in the configured schema Store
- **THEN** schema listing SHALL include `qeda-sdd` with source `store`
- **AND** SHALL include the schema Store ID

#### Scenario: Store schema shadows lower precedence
- **WHEN** a visible Store schema has the same name as user and package schemas
- **THEN** listing SHALL include the name once as the active Store schema
- **AND** SHALL report the lower-precedence sources as shadows

#### Scenario: Existing project behavior is unchanged without schema Store
- **WHEN** `schemaStore` is absent
- **THEN** project, user, and package precedence and source labels SHALL remain unchanged

### Requirement: Workflow commands share one schema context

The system SHALL use the same resolved schema Store, visibility, and provenance across schema inspection and the complete change lifecycle.

#### Scenario: Change lifecycle uses schema Store with local planning
- **WHEN** a local project selects a visible Store schema
- **THEN** change creation, status, instructions, validation, and archive SHALL resolve that same Store schema
- **AND** SHALL keep planning artifacts in the local project

#### Scenario: Change lifecycle uses separate planning and schema Stores
- **WHEN** a consumer selects different planning and schema Stores
- **THEN** change creation, status, instructions, validation, and archive SHALL use the schema Store schema
- **AND** SHALL keep planning artifacts in the planning Store

#### Scenario: Schema commands use the same context
- **WHEN** the user runs schema listing, which, validation, or template reporting from the consumer project
- **THEN** each command SHALL apply the same Store and visibility resolution

### Requirement: Schema Store replacement prevents invisible local writes

The system SHALL reject commands that would create a consumer-local project
schema while a schema Store replaces the project schema layer.

#### Scenario: Fork is rejected while schema Store is configured
- **WHEN** the user runs `openspec schema fork` from a consumer with `schemaStore`
- **THEN** the command SHALL fail before creating a consumer-local schema
- **AND** the diagnostic SHALL identify the schema Store and explain how to edit the Store or restore local schema ownership

#### Scenario: Init is rejected while schema Store is configured
- **WHEN** the user runs `openspec schema init` from a consumer with `schemaStore`
- **THEN** the command SHALL fail before creating a consumer-local schema
- **AND** the diagnostic SHALL identify the schema Store and explain how to edit the Store or restore local schema ownership
