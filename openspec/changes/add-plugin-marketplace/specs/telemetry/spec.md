## ADDED Requirements

### Requirement: Delegated plugin command telemetry
Telemetry SHALL record delegated plugin command invocations by namespace path only, without capturing plugin arguments.

#### Scenario: Plugin command tracked by namespace
- **WHEN** a user invokes a delegated plugin command such as `openspec lore generate`
- **THEN** telemetry SHALL record the namespace command path (for example `lore` and `lore:generate`)
- **AND** SHALL NOT capture the plugin's argument values

#### Scenario: Telemetry respects existing opt-out
- **WHEN** telemetry is disabled by the user
- **THEN** no plugin command invocation SHALL be recorded
