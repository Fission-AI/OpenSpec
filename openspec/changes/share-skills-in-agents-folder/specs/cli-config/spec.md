## ADDED Requirements

### Requirement: Delivery setting is retired

The `delivery` key SHALL stay valid in the global config so older configs and scripts keep working, but SHALL NOT change what `init` or `update` install. Its default SHALL be `skills`.

#### Scenario: Setting delivery

- **WHEN** the user runs `openspec config set delivery commands`
- **THEN** the value SHALL be saved and the command SHALL exit 0
- **AND** it SHALL print that delivery no longer changes anything and OpenSpec 2.0 installs skills only

#### Scenario: Profile picker

- **WHEN** the user runs `openspec config profile` interactively
- **THEN** the picker SHALL offer only workflows (or keeping the current settings), with no delivery question
