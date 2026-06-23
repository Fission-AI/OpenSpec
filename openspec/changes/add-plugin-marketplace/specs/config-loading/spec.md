## ADDED Requirements

### Requirement: Project plugin enablement in config.yaml
The project configuration loader SHALL recognize an optional `plugins` block in `openspec/config.yaml` recording the plugins a project uses.

#### Scenario: Plugins block parsed
- **WHEN** `openspec/config.yaml` contains a `plugins.enabled` list
- **THEN** the loader SHALL parse it and expose the enabled plugin ids

#### Scenario: Absent plugins block
- **WHEN** `openspec/config.yaml` contains no `plugins` block
- **THEN** the project SHALL behave as having no project-enabled plugins
- **AND** loading SHALL succeed unchanged

#### Scenario: Malformed plugins block
- **WHEN** the `plugins` block is malformed
- **THEN** the loader SHALL report a clear error for that field
- **AND** SHALL NOT discard other valid configuration fields

### Requirement: Non-destructive project config writes
Writing the project `plugins` block SHALL preserve all other configuration keys, including keys unknown to the running OpenSpec version.

#### Scenario: Preserve unrelated keys when enabling a plugin
- **WHEN** OpenSpec writes `plugins.enabled` to `openspec/config.yaml`
- **THEN** it SHALL preserve `schema`, `context`, and `rules`
- **AND** SHALL preserve unknown third-party keys such as an `openlore` metadata block

#### Scenario: Round-trip stability
- **WHEN** OpenSpec reads and rewrites `openspec/config.yaml` to change plugin enablement
- **THEN** keys it does not manage SHALL retain their values
- **AND** no managed-key write SHALL remove or corrupt an unmanaged key
