## ADDED Requirements

### Requirement: Schema which reports layered resolution

`openspec schema which` SHALL distinguish a composed package schema from both a package-only schema and a complete user replacement.

#### Scenario: Human output shows package and user overlay

- **GIVEN** a packaged schema has an active user overlay
- **WHEN** the user runs `openspec schema which <name>`
- **THEN** output SHALL identify the effective mode as package plus user overlay
- **AND** it SHALL display both the packaged schema path and user overlay path

#### Scenario: JSON output adds overlay metadata compatibly

- **GIVEN** a packaged schema has an active user overlay
- **WHEN** the user runs `openspec schema which <name> --json`
- **THEN** `source` SHALL remain `package`
- **AND** `path` SHALL remain the packaged schema directory
- **AND** output SHALL add an `overlay` object with `source: user` and the overlay path

#### Scenario: Overlay is not reported as a shadow

- **GIVEN** a packaged schema has an active user overlay
- **WHEN** resolution details are produced
- **THEN** the overlay SHALL be reported as composition metadata
- **AND** it SHALL NOT be placed in the existing `shadows` array

#### Scenario: Project source reports inactive overlay

- **GIVEN** a project schema has highest priority and a user overlay of the same name exists
- **WHEN** the user runs `openspec schema which <name>`
- **THEN** output SHALL identify the project schema as active
- **AND** it SHALL identify the user overlay and package schema as inactive lower-priority sources

#### Scenario: List mode includes composed resolution

- **WHEN** the user runs `openspec schema which --all` or `--all --json`
- **THEN** each composed schema SHALL expose the same base and overlay information as single-schema mode
