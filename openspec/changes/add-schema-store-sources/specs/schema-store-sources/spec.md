## ADDED Requirements

### Requirement: Consumer selects one registered schema Store

The system SHALL allow a consumer project to select one registered Store as its schema source independently from the Store or local root that owns specs and changes.

#### Scenario: Local planning with schema Store
- **WHEN** a consumer project declares `schemaStore: department-schemas`
- **AND** `department-schemas` is registered on the machine
- **THEN** normal commands SHALL keep specs, changes, and archives in the consumer project
- **AND** SHALL resolve project-layer schemas from the registered Store

#### Scenario: Different planning and schema Stores
- **WHEN** a consumer project declares `store: department-planning`
- **AND** declares `schemaStore: department-schemas`
- **THEN** normal commands SHALL read and write specs, changes, and archives in `department-planning`
- **AND** SHALL resolve project-layer schemas from `department-schemas`

#### Scenario: Same Store fills both roles explicitly
- **WHEN** a consumer project declares the same registered Store ID in `store` and `schemaStore`
- **THEN** that Store SHALL own both planning data and project-layer schemas

#### Scenario: No schema Store declaration
- **WHEN** a project does not declare `schemaStore`
- **THEN** schema and planning resolution SHALL retain their existing behavior

#### Scenario: Redirected planning retains Planning Store configuration
- **WHEN** a consumer redirects planning to a Store
- **AND** does not declare `schemaStore`
- **THEN** workflow commands SHALL continue to use the Planning Store's project configuration

#### Scenario: Schema consumer configuration overlays planning configuration
- **WHEN** a consumer redirects planning to one Store
- **AND** declares a separate `schemaStore`
- **THEN** consumer configuration fields SHALL override corresponding Planning Store fields
- **AND** fields omitted by the consumer SHALL remain inherited from the Planning Store

### Requirement: Schema Store visibility is consumer-controlled

The system SHALL let the consumer select which schemas from its schema Store participate in discovery and resolution.

#### Scenario: Scalar declaration exposes every Store schema
- **WHEN** config contains `schemaStore: department-schemas`
- **THEN** every valid schema in that Store SHALL be visible

#### Scenario: Object declaration defaults to every Store schema
- **WHEN** config contains `schemaStore: { id: department-schemas }`
- **THEN** every valid schema in that Store SHALL be visible

#### Scenario: Explicit wildcard exposes every Store schema
- **WHEN** the declaration contains `schemas: ["*"]`
- **THEN** every valid schema in that Store SHALL be visible

#### Scenario: Exact allowlist restricts Store schemas
- **WHEN** the declaration contains `schemas: ["qeda-sdd", "frontend-sdd"]`
- **THEN** only those named schemas from the Store SHALL participate in discovery and resolution

#### Scenario: Visibility does not hide other source classes
- **WHEN** a schema is excluded from the schema Store allowlist
- **THEN** a same-named user or package schema SHALL remain eligible under existing precedence

### Requirement: Schema Store synchronization remains user-managed

The system SHALL use the registered Store's current local checkout and SHALL NOT contact its Git remote while resolving schemas.

#### Scenario: Normal command uses local checkout
- **WHEN** a user runs a schema or workflow command with a configured schema Store
- **THEN** OpenSpec SHALL read schemas from the registered local Store path
- **AND** SHALL perform no Git fetch, pull, push, or clone

#### Scenario: Store checkout changes
- **WHEN** a user updates the registered schema Store with normal Git commands
- **THEN** subsequent OpenSpec commands SHALL observe the updated local schema content

### Requirement: Unavailable schema Store produces actionable diagnostics

The system SHALL fail schema-context resolution when an explicitly configured schema Store cannot be used.

#### Scenario: Store is not registered
- **WHEN** `schemaStore` names an unregistered Store
- **THEN** the command SHALL fail with the Store ID
- **AND** SHALL direct the user to register the Store

#### Scenario: Store identity is invalid
- **WHEN** the registered checkout does not have valid matching Store identity
- **THEN** the command SHALL fail with a diagnostic naming the Store
- **AND** SHALL direct the user to inspect or repair it with Store tooling

#### Scenario: Schema directory is initially absent
- **WHEN** the registered schema Store has no `openspec/schemas` directory
- **THEN** the Store SHALL contribute no schemas
- **AND** schema listing SHALL continue with user and package schemas

#### Scenario: Configured schema is not visible
- **WHEN** the selected schema exists in the Store but is excluded by the consumer allowlist
- **THEN** the Store copy SHALL NOT be selected
- **AND** the resulting resolution or error SHALL identify the actual winning or available sources

### Requirement: Paths are resolved portably

The system SHALL use the canonical registered Store checkout and platform-native path handling for schema directories.

#### Scenario: Store path contains platform-specific separators
- **WHEN** a schema Store is registered on macOS, Linux, or Windows
- **THEN** schema paths SHALL be constructed with platform-native path semantics
- **AND** reported paths SHALL identify the canonical local Store checkout
