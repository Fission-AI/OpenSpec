## ADDED Requirements

### Requirement: Install scope field and provenance
The global config SHALL support `installScope` values `global` and `project` and SHALL retain enough read provenance to distinguish an explicit value, a new-config default, and a legacy default.

#### Scenario: Explicit install scope
- **WHEN** a valid global config contains `installScope: global` or `installScope: project`
- **THEN** the configured value SHALL be returned
- **AND** its source SHALL be `explicit`

#### Scenario: No config file exists
- **WHEN** the global config file does not exist
- **THEN** effective install scope SHALL be `project`
- **AND** its source SHALL be `new-default`
- **AND** reading config SHALL NOT create a file

#### Scenario: Existing config predates install scope
- **WHEN** a valid global config file exists without `installScope`
- **THEN** all existing fields SHALL be preserved
- **AND** effective install scope SHALL be `project`
- **AND** its source SHALL be `legacy-default`
- **AND** reading config SHALL NOT mutate the file

#### Scenario: Existing config is malformed or unreadable
- **WHEN** a global config file exists but cannot be parsed or read
- **THEN** an invalid-config warning SHALL be emitted
- **AND** effective install scope SHALL conservatively resolve to `project`
- **AND** its source SHALL be `legacy-default`
- **AND** storage state SHALL remain `invalid` rather than becoming authoritative project configuration
- **AND** reading config SHALL NOT mutate the file

#### Scenario: Existing install scope is schema-invalid
- **WHEN** a parseable global config contains an `installScope` value other than `global` or `project`
- **THEN** a validation warning SHALL identify the invalid field
- **AND** effective install scope SHALL conservatively resolve to `project`
- **AND** its source SHALL be `legacy-default`
- **AND** storage state SHALL remain `invalid` rather than becoming authoritative project configuration
- **AND** reading config SHALL NOT mutate the file

### Requirement: New config creation records install-scope provenance
Whenever a config patch creates the user-level global config for the first time, it SHALL persist the current default install scope without materializing unrelated effective defaults, so the file cannot later be mistaken for a legacy config and existing field-absence migrations remain observable.

#### Scenario: Config mutation creates the file
- **WHEN** config set, profile, or another targeted config mutation creates a previously absent global config
- **THEN** the file SHALL include `installScope: project`
- **AND** SHALL include the fields explicitly changed by that mutation
- **AND** SHALL NOT materialize unrelated default fields

#### Scenario: Telemetry creates the file first
- **WHEN** no global config file exists
- **AND** telemetry state causes OpenSpec to create it
- **THEN** the created file SHALL include `installScope: project`
- **AND** SHALL preserve the telemetry state being written
- **AND** SHALL NOT materialize unrelated defaults such as `profile`, `delivery`, or `workflows`
- **AND** install scope observed by the current CLI invocation SHALL remain `project` from `new-default`
- **AND** a later CLI invocation SHALL observe the persisted value as `explicit`

#### Scenario: Legacy telemetry migration creates the file first
- **WHEN** no current global config file exists
- **AND** telemetry identity or notice state is migrated from the legacy config location
- **THEN** the new global config SHALL contain the migrated telemetry state
- **AND** SHALL contain `installScope: project`
- **AND** SHALL NOT materialize unrelated default fields

#### Scenario: Config reset writes defaults
- **WHEN** the user resets global config to current defaults
- **THEN** the resulting config SHALL explicitly contain `installScope: project`

### Requirement: Provenance-preserving global config updates
Every OpenSpec feature that updates global config SHALL preserve the raw existing document and install-scope provenance unless that operation explicitly changes or resets `installScope`.

#### Scenario: Non-scope update to a legacy config
- **WHEN** a valid existing global config lacks `installScope`
- **AND** OpenSpec updates profile, delivery, workflows, migration state, or telemetry state
- **THEN** only the requested fields SHALL change
- **AND** unknown fields SHALL be preserved
- **AND** `installScope` SHALL remain absent
- **AND** subsequent install-scope resolution SHALL remain `project` from `legacy-default`

#### Scenario: Foreground config update follows telemetry writes
- **WHEN** telemetry writes notice or anonymous identity state during command startup
- **AND** the same command subsequently saves a user-requested config change
- **THEN** the resulting file SHALL preserve both the telemetry state and the user-requested change
- **AND** SHALL preserve every unrelated existing field

#### Scenario: Legacy telemetry fills an existing legacy config
- **WHEN** a valid current global config lacks `installScope`
- **AND** missing telemetry state is imported from the legacy config location
- **THEN** only the missing telemetry fields SHALL be added
- **AND** `installScope` SHALL remain absent with effective source `legacy-default`

#### Scenario: Background telemetry encounters invalid config
- **WHEN** an existing global config is malformed, unreadable, or schema-invalid
- **AND** telemetry attempts to persist notice or anonymous identity state
- **THEN** the telemetry write SHALL be skipped without blocking the requested CLI command
- **AND** the existing config contents SHALL remain unchanged

#### Scenario: Foreground mutation encounters invalid config
- **WHEN** an existing global config is malformed, unreadable, or schema-invalid
- **AND** a config command or automatic profile migration attempts to update it
- **THEN** the update SHALL fail with repair guidance
- **AND** the existing config contents SHALL remain unchanged

#### Scenario: Confirmed reset recovers invalid config
- **WHEN** the user confirms `config reset --all` for an invalid global config
- **THEN** reset SHALL be allowed to replace the invalid document
- **AND** the replacement SHALL contain the complete current defaults including `installScope: project`

#### Scenario: Invalid storage cannot authorize durable cleanup
- **WHEN** an existing global config is malformed, unreadable, or schema-invalid
- **AND** init or update runs without a scope override
- **THEN** the conservative reported project scope SHALL NOT authorize durable migration or cleanup in any scope
- **AND** the command SHALL require the config to be repaired before durable reconciliation
- **WHEN** the same command receives an explicit run-only scope
- **THEN** it MAY generate at that run-only target while preserving managed artifacts in every other scope

### Requirement: Install scope validation
Global config validation SHALL accept only supported install scope values and SHALL preserve the existing valid file when a write is rejected.

#### Scenario: Valid install scope value
- **WHEN** config validation receives `installScope` equal to `global` or `project`
- **THEN** validation SHALL succeed for that field

#### Scenario: Invalid install scope value
- **WHEN** config validation receives any other install scope value
- **THEN** validation SHALL fail with a descriptive error
- **AND** the existing valid configuration SHALL remain unchanged
