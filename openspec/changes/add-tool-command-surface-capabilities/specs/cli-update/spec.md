## ADDED Requirements

### Requirement: Delivery sync by command surface capability
The update command SHALL synchronize artifacts using each configured tool's command surface capability.

#### Scenario: Commands delivery for adapter-backed configured tool
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a configured tool has an adapter-backed command surface
- **THEN** the system SHALL generate or refresh command files for active workflows
- **AND** the system SHALL remove managed skill directories for that tool

#### Scenario: Commands delivery for skills-invocable configured tool
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a configured tool has `skills-invocable` command surface capability
- **THEN** the system SHALL generate or refresh managed skill directories for active workflows
- **AND** the system SHALL NOT remove those managed skill directories as part of commands-only cleanup
- **AND** the system SHALL NOT attempt to require adapter-generated command files for that tool

#### Scenario: Commands delivery with unsupported command surface
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a configured tool has no command surface capability
- **THEN** the system SHALL fail with exit code 1 before applying partial updates
- **AND** the output SHALL identify incompatible tools and recommended remediation

### Requirement: Configured-tool detection for skills-invocable command surfaces
The update command SHALL treat tools with skills-invocable command surfaces as configured when managed skill artifacts are present, including under commands delivery.

#### Scenario: Skills-invocable tool under commands delivery
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a tool has no adapter-generated command files
- **AND** that tool is marked `skills-invocable` and has managed skills installed
- **THEN** the system SHALL include the tool in configured-tool detection
- **AND** the system SHALL apply normal version/profile/delivery sync to that tool

### Requirement: Update summary reflects effective per-tool delivery
The update command SHALL report effective artifact behavior when delivery intent and artifact type differ due to tool capability.

#### Scenario: Summary for skills-invocable tools in commands delivery
- **WHEN** update completes successfully
- **AND** delivery is `commands`
- **AND** at least one updated tool is `skills-invocable`
- **THEN** output SHALL include a clear note that those tools use skills as their command surface
- **AND** output SHALL avoid implying that command generation was skipped due to an error

