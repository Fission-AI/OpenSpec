## ADDED Requirements

### Requirement: Update install scope selection
The update command SHALL support install scope selection for sync operations.

#### Scenario: Scope defaults to global config value
- **WHEN** user runs `openspec update` without explicit scope override
- **THEN** update SHALL use configured install scope
- **AND** if unset, SHALL resolve migration-aware default (`global` for newly created configs, `project` for legacy schema-evolved configs)

#### Scenario: Scope override via flag
- **WHEN** user runs `openspec update --scope project`
- **THEN** update SHALL use `project` as preferred scope for that run

### Requirement: Scope-aware sync and drift detection
The update command SHALL evaluate configured state and drift using effective scoped paths.

#### Scenario: Scoped drift detection
- **WHEN** update evaluates whether tools are up-to-date
- **THEN** it SHALL inspect files at effective scoped targets for each tool/surface
- **AND** SHALL compare current resolved scope against last successful effective scope for each tool/surface
- **AND** SHALL treat a difference as sync-required drift

#### Scenario: Scope fallback during update
- **WHEN** preferred scope is unsupported for a configured tool/surface
- **AND** alternate scope is supported
- **THEN** update SHALL apply fallback scope resolution
- **AND** SHALL report fallback in output

#### Scenario: Unsupported scope during update
- **WHEN** configured tool/surface supports neither preferred nor alternate scope
- **THEN** scope support SHALL be validated for all configured tools/surfaces before any write
- **AND** update SHALL fail without performing file writes when incompatibilities are detected
- **AND** SHALL report incompatible tools with remediation steps
