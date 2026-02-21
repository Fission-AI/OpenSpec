## Purpose

Define the install scope model for OpenSpec-generated skills and commands, including scope preference, effective scope resolution, and fallback/error semantics.

## ADDED Requirements

### Requirement: Install scope preference model
The system SHALL support a user-level install scope preference with values `global` and `project`.

#### Scenario: Default install scope
- **WHEN** install scope is not explicitly configured
- **THEN** the system SHALL use `global` as the default scope

#### Scenario: Explicit install scope
- **WHEN** user configures install scope to `project`
- **THEN** generation and update flows SHALL use `project` as the preferred scope

### Requirement: Effective scope resolution by tool surface
The system SHALL compute effective scope per tool surface (skills, commands) based on preferred scope and tool capability support.

#### Scenario: Preferred scope is supported
- **WHEN** preferred scope is supported for a tool surface
- **THEN** the system SHALL use that scope as the effective scope

#### Scenario: Preferred scope is unsupported but alternate is supported
- **WHEN** preferred scope is not supported for a tool surface
- **AND** the alternate scope is supported
- **THEN** the system SHALL use the alternate scope as effective scope
- **AND** SHALL record a fallback note for user-facing output

#### Scenario: No supported scope
- **WHEN** neither `global` nor `project` is supported for a tool surface
- **THEN** the command SHALL fail before writing files
- **AND** SHALL display actionable remediation

### Requirement: Effective scope reporting
The system SHALL report effective scope decisions in command output when they differ from the preferred scope.

#### Scenario: Fallback reporting
- **WHEN** fallback resolution occurs for any selected/configured tool surface
- **THEN** init/update summaries SHALL include effective scope notes per affected tool
