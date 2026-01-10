## MODIFIED Requirements

### Requirement: Global configuration storage
The system SHALL store global configuration in `~/.config/openspec/config.json`, including telemetry state with `anonymousId` and `noticeSeen` fields.

#### Scenario: Initial config creation
- **WHEN** no global config file exists
- **AND** the first telemetry event is about to be sent
- **THEN** the system creates `~/.config/openspec/config.json` with telemetry configuration

#### Scenario: Telemetry config structure
- **WHEN** reading or writing telemetry configuration
- **THEN** the config contains a `telemetry` object with `anonymousId` (string UUID) and `noticeSeen` (boolean) fields

#### Scenario: Config file format
- **WHEN** storing configuration
- **THEN** the system writes valid JSON that can be read and modified by users

#### Scenario: Existing config preservation
- **WHEN** adding telemetry fields to an existing config file
- **THEN** the system preserves all existing configuration fields
