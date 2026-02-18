## MODIFIED Requirements

### Requirement: Global configuration storage (EXTENDS existing)
The system SHALL store profile, delivery, and workflows settings in the existing global config file alongside telemetry and feature flags.

#### Scenario: Profile config structure
- **WHEN** reading or writing profile configuration
- **THEN** the config contains `profile` (string: core|custom), `delivery` (string: both|skills|commands), and optionally `workflows` (array of strings)

#### Scenario: Schema evolution for new fields
- **WHEN** loading config without profile/delivery fields
- **THEN** the system SHALL use defaults: profile=core, delivery=both
- **AND** existing telemetry/featureFlags fields SHALL be preserved

#### Scenario: Custom profile with workflows
- **WHEN** config contains `profile: "custom"`
- **THEN** the system SHALL read the `workflows` array for the list of enabled workflows
- **AND** if `workflows` is missing, SHALL treat as empty array

## ADDED Requirements

### Requirement: Profile config defaults
The system SHALL use sensible defaults when profile settings are missing.

#### Scenario: Missing profile field
- **WHEN** config file exists but has no `profile` field
- **THEN** the system SHALL behave as if `profile: "core"`

#### Scenario: Missing delivery field
- **WHEN** config file exists but has no `delivery` field
- **THEN** the system SHALL behave as if `delivery: "both"`

### Requirement: Config list shows profile settings
The `openspec config list` command SHALL display profile and delivery settings.

#### Scenario: List all config with profile
- **WHEN** user runs `openspec config list`
- **THEN** the system SHALL display profile, delivery, and workflows settings
- **AND** SHALL indicate which values are defaults vs explicitly set
