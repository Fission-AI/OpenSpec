## ADDED Requirements

### Requirement: Init install scope selection
The init command SHALL support install scope selection for generated artifacts.

#### Scenario: Scope defaults to global
- **WHEN** user runs `openspec init` without explicit scope override
- **THEN** init SHALL use global config install scope
- **AND** if unset, SHALL resolve migration-aware default (`global` for newly created configs, `project` for legacy schema-evolved configs)

#### Scenario: Scope override via flag
- **WHEN** user runs `openspec init --scope project`
- **THEN** init SHALL use `project` as preferred scope for that run
- **AND** SHALL NOT mutate persisted global config unless user explicitly changes config

### Requirement: Init uses effective scope resolution
The init command SHALL resolve effective scope per tool surface before generating files.

#### Scenario: Effective scope with fallback
- **WHEN** selected tool/surface does not support preferred scope
- **AND** supports alternate scope
- **THEN** init SHALL generate files at alternate effective scope
- **AND** SHALL display fallback note in summary

#### Scenario: Unsupported scope selection
- **WHEN** selected tool/surface supports neither preferred nor alternate scope
- **THEN** init SHALL fail before writing files
- **AND** SHALL provide clear error guidance
