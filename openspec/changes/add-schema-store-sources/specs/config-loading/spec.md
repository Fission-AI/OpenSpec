## ADDED Requirements

### Requirement: Parse schema Store declarations

The system SHALL parse `schemaStore` independently from other project configuration fields and normalize valid scalar and object forms.

#### Scenario: Scalar schema Store
- **WHEN** config contains `schemaStore: department-schemas`
- **THEN** the parsed configuration SHALL contain Store ID `department-schemas`
- **AND** SHALL normalize visibility to all schemas

#### Scenario: Object schema Store without visibility
- **WHEN** config contains an object with `id: department-schemas` and no `schemas`
- **THEN** the parsed configuration SHALL normalize visibility to all schemas

#### Scenario: Object schema Store with exact visibility
- **WHEN** config contains `id: department-schemas` and `schemas: ["qeda-sdd"]`
- **THEN** the parsed configuration SHALL contain an exact visibility allowlist with `qeda-sdd`

#### Scenario: Explicit wildcard visibility
- **WHEN** config contains `schemas: ["*"]`
- **THEN** the parsed configuration SHALL normalize visibility to all schemas

#### Scenario: Wildcard mixed with names
- **WHEN** config contains `schemas: ["*", "qeda-sdd"]`
- **THEN** the declaration SHALL be invalid
- **AND** the system SHALL identify that wildcard visibility cannot be combined with names

#### Scenario: Empty visibility list
- **WHEN** config contains `schemas: []`
- **THEN** the declaration SHALL be invalid
- **AND** the system SHALL identify that at least one schema or `*` is required

#### Scenario: Invalid schema Store field does not discard other fields
- **WHEN** `schemaStore` is invalid but `schema` and `context` are valid
- **THEN** generic project-config loading SHALL retain the valid fields
- **AND** SHALL warn about the invalid schema Store declaration

#### Scenario: Authority resolution rejects invalid declaration
- **WHEN** a command needs schema resolution and the config explicitly contains an invalid `schemaStore`
- **THEN** the command SHALL fail instead of silently using another schema source
