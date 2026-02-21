## ADDED Requirements

### Requirement: Install scope field in global config
The global config schema SHALL include install scope preference.

#### Scenario: Config shape supports install scope
- **WHEN** reading or writing global config
- **THEN** config SHALL support `installScope` with allowed values `global` and `project`

#### Scenario: Schema evolution default
- **WHEN** loading legacy config without `installScope`
- **THEN** the system SHALL apply default `installScope: global`
- **AND** preserve all other existing fields

#### Scenario: Invalid install scope value
- **WHEN** config validation receives an invalid install scope value
- **THEN** the value SHALL be rejected
- **AND** the system SHALL preserve the existing valid configuration
