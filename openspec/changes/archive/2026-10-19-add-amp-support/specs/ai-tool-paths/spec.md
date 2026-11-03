## ADDED Requirements

### Requirement: Amp skills integration

OpenSpec SHALL expose Amp as a supported skills-only tool that uses Amp's project Agent Skills directory.

#### Scenario: Selecting Amp

- **WHEN** the user selects Amp in `openspec init` or passes `--tools amp`
- **THEN** OpenSpec SHALL generate the active profile's skills under `.agents/skills/`
- **AND** the generated skills SHALL use `/openspec-<skill>` references
- **AND** OpenSpec SHALL NOT generate command files for Amp

#### Scenario: Detecting an Amp project

- **WHEN** a project contains an `.amp/` directory
- **THEN** OpenSpec SHALL detect Amp as an available tool

#### Scenario: Updating an Amp-owned skill tree

- **GIVEN** `.agents/skills/.openspec-target` names `amp`
- **WHEN** `openspec update` runs
- **THEN** OpenSpec SHALL refresh the Amp skill tree through the shared skill generator

#### Scenario: Sharing the Agent Skills directory

- **WHEN** Amp is selected with another tool that writes `.agents/skills/`
- **THEN** OpenSpec SHALL write one compatible skill tree rather than letting the tools overwrite each other
