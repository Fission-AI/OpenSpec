## ADDED Requirements

### Requirement: Command surface capability resolution
The init command SHALL resolve each selected tool's command surface using explicit metadata first, then deterministic inference.

#### Scenario: Explicit command surface override
- **WHEN** a tool declares an explicit command-surface capability
- **THEN** init SHALL use that explicit capability
- **AND** SHALL NOT override it based on adapter presence

#### Scenario: Inferred command surface from adapter presence
- **WHEN** a tool does not declare an explicit command-surface capability
- **AND** a command adapter is registered for the tool
- **THEN** init SHALL infer `adapter` as the command surface

#### Scenario: Inferred command surface for skills-only tool
- **WHEN** a tool does not declare an explicit command-surface capability
- **AND** no command adapter is registered for the tool
- **AND** the tool has a configured `skillsDir`
- **THEN** init SHALL infer `skills-invocable` as the command surface

#### Scenario: Inferred command surface without adapter or skills
- **WHEN** a tool does not declare an explicit command-surface capability
- **AND** no command adapter is registered for the tool
- **AND** the tool has no `skillsDir`
- **THEN** init SHALL infer `none` as the command surface

### Requirement: Delivery compatibility by tool command surface
The init command SHALL apply delivery settings using each tool's command surface capability, not adapter presence alone.

#### Scenario: Both delivery for adapter-backed tool
- **WHEN** user runs `openspec init` with a selected tool that has a command adapter
- **AND** delivery is set to `both`
- **THEN** the system SHALL generate command files for active workflows using that adapter
- **AND** SHALL generate or refresh managed skills when the tool has `skillsDir`

#### Scenario: Both delivery for skills-invocable tool
- **WHEN** user runs `openspec init` with a selected tool whose command surface is `skills-invocable`
- **AND** delivery is set to `both`
- **THEN** the system SHALL generate or refresh managed skill directories when the tool has `skillsDir`
- **AND** SHALL NOT require adapter-generated command files for that tool

#### Scenario: Both delivery for none command surface
- **WHEN** user runs `openspec init` with a selected tool whose command surface is `none`
- **AND** delivery is set to `both`
- **THEN** the system SHALL perform no command-surface artifact action for that tool
- **AND** MAY emit a compatibility note indicating no command surface is available

#### Scenario: Skills delivery for adapter-backed tool
- **WHEN** user runs `openspec init` with a selected tool that has a command adapter
- **AND** delivery is set to `skills`
- **THEN** the system SHALL generate or refresh managed skill directories when the tool has `skillsDir`
- **AND** SHALL remove managed adapter-generated command files for that tool

#### Scenario: Skills delivery for skills-invocable tool
- **WHEN** user runs `openspec init` with a selected tool whose command surface is `skills-invocable`
- **AND** delivery is set to `skills`
- **THEN** the system SHALL generate or refresh managed skill directories when the tool has `skillsDir`
- **AND** SHALL NOT require adapter-generated command files for that tool

#### Scenario: Skills delivery for none command surface
- **WHEN** user runs `openspec init` with a selected tool whose command surface is `none`
- **AND** delivery is set to `skills`
- **THEN** the system SHALL perform no command-surface artifact action for that tool
- **AND** MAY emit a compatibility note indicating no command surface is available

#### Scenario: Commands delivery for adapter-backed tool
- **WHEN** user runs `openspec init` with a selected tool that has a command adapter
- **AND** delivery is set to `commands`
- **THEN** the system SHALL generate command files for active workflows using that adapter
- **AND** the system SHALL remove managed skill directories for that tool

#### Scenario: Commands delivery for skills-invocable tool
- **WHEN** user runs `openspec init` with a selected tool whose command surface is `skills-invocable`
- **AND** delivery is set to `commands`
- **THEN** the system SHALL generate or refresh managed skill directories for active workflows
- **AND** the system SHALL NOT remove those managed skill directories as part of commands-only cleanup
- **AND** the system SHALL NOT require a command adapter for that tool

#### Scenario: Commands delivery for mixed tool selection
- **WHEN** user runs `openspec init` with multiple tools
- **AND** selected tools include both adapter-backed and skills-invocable command surfaces
- **AND** delivery is set to `commands`
- **THEN** the system SHALL apply commands-only behavior per tool capability
- **AND** the resulting install SHALL include command files for adapter-backed tools and skills for skills-invocable tools

#### Scenario: Commands delivery for unsupported command surface
- **WHEN** user runs `openspec init` with a selected tool that has no command surface capability
- **AND** delivery is set to `commands`
- **THEN** the system SHALL fail before generating or deleting artifacts
- **AND** the error SHALL list incompatible tool IDs and explain supported alternatives (`both` or `skills`)

#### Scenario: Interactive handling for unsupported command surface
- **WHEN** user runs `openspec init` interactively
- **AND** delivery is set to `commands`
- **AND** selected tools include one or more tools with command surface `none`
- **THEN** the CLI SHALL show a compatibility error and return to the interactive selection flow for correction
- **AND** SHALL not perform artifact writes until a valid selection is confirmed

### Requirement: Init compatibility signaling
The init command SHALL clearly signal command-surface compatibility outcomes in both interactive and non-interactive flows.

#### Scenario: Interactive compatibility note
- **WHEN** init runs interactively
- **AND** delivery is `commands`
- **AND** selected tools include skills-invocable command surfaces
- **THEN** the system SHALL display a compatibility note before the confirmation prompt indicating those tools will use skills as their command surface

#### Scenario: Non-interactive compatibility summary for skills-invocable tools
- **WHEN** init runs non-interactively (including `--tools` usage)
- **AND** delivery is `commands`
- **AND** selected tools include one or more `skills-invocable` command surfaces
- **THEN** the command SHALL proceed with exit code 0
- **AND** the command SHALL write deterministic compatibility summary lines to stdout indicating those tools will use managed skills as their command surface

#### Scenario: Non-interactive compatibility failure
- **WHEN** init runs non-interactively (including `--tools` usage)
- **AND** delivery is `commands`
- **AND** selected tools include any tool with no command surface capability
- **THEN** the command SHALL exit with code 1
- **AND** the command SHALL write deterministic, actionable guidance for resolving the selection to stderr
