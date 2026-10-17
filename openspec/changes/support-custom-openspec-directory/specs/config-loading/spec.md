## ADDED Requirements

### Requirement: Load project config from the authoritative OpenSpec directory

Project configuration SHALL be loaded from `config.yaml` or `config.yml` inside the authoritative OpenSpec directory returned by root selection.

#### Scenario: Environment-selected config

- **GIVEN** `OPENSPEC_DIR` selects `ai/openspec`
- **AND** `ai/openspec/config.yaml` contains project context, rules, and a schema
- **WHEN** a root-scoped command loads project configuration
- **THEN** it SHALL use `ai/openspec/config.yaml`
- **AND** it SHALL NOT read a config from the default root-level directory

#### Scenario: Store config remains conventional

- **GIVEN** a registered store is selected
- **WHEN** a command loads project configuration
- **THEN** it SHALL continue reading config from the store's authoritative `openspec` directory
