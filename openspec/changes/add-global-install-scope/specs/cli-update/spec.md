## ADDED Requirements

### Requirement: Update install scope selection
The update command SHALL support install scope selection for sync operations.

#### Scenario: Scope defaults to global config value
- **WHEN** user runs `openspec update` without explicit scope override
- **THEN** update SHALL use configured install scope
- **AND** if unset, SHALL default to `global`

#### Scenario: Scope override via flag
- **WHEN** user runs `openspec update --scope project`
- **THEN** update SHALL use `project` as preferred scope for that run

### Requirement: Scope-aware sync and drift detection
The update command SHALL evaluate configured state and drift using effective scoped paths.

#### Scenario: Scoped drift detection
- **WHEN** update evaluates whether tools are up to date
- **THEN** it SHALL inspect files at effective scoped targets for each tool/surface
- **AND** SHALL treat scope mismatch as sync-required drift

#### Scenario: Scope fallback during update
- **WHEN** preferred scope is unsupported for a configured tool/surface
- **AND** alternate scope is supported
- **THEN** update SHALL apply fallback scope resolution
- **AND** SHALL report fallback in output

#### Scenario: Unsupported scope during update
- **WHEN** configured tool/surface supports neither preferred nor alternate scope
- **THEN** update SHALL fail before partial writes
- **AND** SHALL report incompatible tools with remediation steps
