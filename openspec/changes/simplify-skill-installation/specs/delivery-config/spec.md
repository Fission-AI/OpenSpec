## Purpose

Delivery configuration SHALL allow power users to control how workflows are installed (skills, commands, or both) without affecting the default experience for new users.

## ADDED Requirements

### Requirement: Delivery options
The system SHALL support three delivery methods: `both`, `skills`, and `commands`.

#### Scenario: Both delivery
- **WHEN** delivery is set to `both`
- **THEN** the system SHALL install both skill files and command files for each workflow

#### Scenario: Skills-only delivery
- **WHEN** delivery is set to `skills`
- **THEN** the system SHALL install only skill files (SKILL.md) for each workflow
- **THEN** the system SHALL NOT install command files

#### Scenario: Commands-only delivery
- **WHEN** delivery is set to `commands`
- **THEN** the system SHALL install only command files for each workflow
- **THEN** the system SHALL NOT install skill files

### Requirement: Delivery CLI commands
The system SHALL provide CLI commands for managing delivery preference.

#### Scenario: Set delivery preference
- **WHEN** user runs `openspec config set delivery <value>`
- **THEN** the system SHALL update the global config delivery setting
- **THEN** the system SHALL output confirmation of the change

#### Scenario: Get delivery preference
- **WHEN** user runs `openspec config get delivery`
- **THEN** the system SHALL display the current delivery setting
- **THEN** if delivery is not explicitly set, the system SHALL display "both (default)"

#### Scenario: Invalid delivery value
- **WHEN** user runs `openspec config set delivery <invalid>`
- **THEN** the system SHALL display an error with valid options

### Requirement: Delivery defaults
The system SHALL use `both` as the default delivery method.

#### Scenario: No delivery config exists
- **WHEN** global config does not specify delivery
- **THEN** the system SHALL behave as if delivery is `both`
