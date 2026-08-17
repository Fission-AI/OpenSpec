## ADDED Requirements

### Requirement: Template command reports layered source paths

The templates command SHALL report the concrete source selected for each template in a composed schema.

#### Scenario: Mixed user and package templates

- **GIVEN** a composed schema whose user directory overrides `tasks.md` but not `proposal.md`
- **WHEN** the user runs `openspec templates --schema <name>`
- **THEN** the tasks template SHALL be labeled as user-sourced with its user path
- **AND** the proposal template SHALL be labeled as package-sourced with its package path

#### Scenario: Templates JSON reports concrete paths

- **GIVEN** a composed schema uses templates from both user and package roots
- **WHEN** the user runs `openspec templates --schema <name> --json`
- **THEN** each artifact entry SHALL contain the concrete resolved path and its actual `user` or `package` source

#### Scenario: Instruction output uses reported template

- **WHEN** a template path is reported for an artifact in a composed schema
- **THEN** `openspec instructions` for that artifact SHALL load the same concrete file
