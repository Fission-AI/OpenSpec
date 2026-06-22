## ADDED Requirements

### Requirement: Refresh plugin-contributed artifacts on update
`openspec update` SHALL refresh enabled plugins' contributed skills and commands alongside core artifacts.

#### Scenario: Contributed artifacts refreshed
- **WHEN** a user runs `openspec update` with one or more enabled plugins
- **THEN** OpenSpec SHALL re-sync those plugins' contributed skills and commands for configured tools

#### Scenario: New contributed artifacts added
- **WHEN** an enabled plugin version contributes a new skill since the last sync
- **THEN** `openspec update` SHALL install the new artifact

### Requirement: Drift detection and cleanup for plugins
`openspec update` SHALL detect plugin artifact drift and clean up artifacts for plugins no longer enabled.

#### Scenario: Missing artifact re-synced
- **WHEN** an enabled plugin's contributed artifact is missing or modified
- **THEN** `openspec update` SHALL restore it to the managed state

#### Scenario: Disabled plugin artifacts removed
- **WHEN** a plugin has been disabled or removed since the last sync
- **THEN** `openspec update` SHALL remove that plugin's managed artifacts
- **AND** SHALL leave core and user-authored files untouched

#### Scenario: Update summary reports plugin changes
- **WHEN** `openspec update` changes any plugin-contributed artifacts
- **THEN** the update summary SHALL report those changes
