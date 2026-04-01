## ADDED Requirements

### Requirement: Plugin-bundled schemas

Plugins SHALL be able to bundle workflow schemas in a `schemas/` subdirectory.

#### Scenario: Plugin provides a schema
- **WHEN** plugin "odoo-lifecycle" has `schemas: ["odoo-sdd"]` in plugin.yaml
- **AND** `openspec/plugins/odoo-lifecycle/schemas/odoo-sdd/schema.yaml` exists
- **THEN** the schema "odoo-sdd" is available for use in `config.yaml`'s `schema` field

#### Scenario: Plugin schema listed but directory missing
- **WHEN** plugin "odoo-lifecycle" has `schemas: ["missing-schema"]` in plugin.yaml
- **AND** `openspec/plugins/odoo-lifecycle/schemas/missing-schema/schema.yaml` does NOT exist
- **THEN** the system reports a warning about the missing schema directory

### Requirement: Plugin schemas in resolution order

Plugin-provided schemas SHALL be resolved after project-local schemas but before user-global schemas.

#### Scenario: Resolution order with plugin schemas
- **WHEN** resolving schema "odoo-sdd"
- **THEN** the system checks in this order:
  1. Project-local: `openspec/schemas/odoo-sdd/schema.yaml`
  2. Plugin-provided: `openspec/plugins/*/schemas/odoo-sdd/schema.yaml` (from loaded plugins)
  3. User-global: `~/.local/share/openspec/schemas/odoo-sdd/schema.yaml`
  4. Package built-in: `<package>/schemas/odoo-sdd/schema.yaml`

#### Scenario: Project-local overrides plugin schema
- **WHEN** "odoo-sdd" exists at both project-local and in a plugin
- **THEN** the project-local version takes precedence

#### Scenario: Plugin schema overrides user-global
- **WHEN** "odoo-sdd" exists in a loaded plugin and at user-global
- **AND** NOT at project-local
- **THEN** the plugin version takes precedence

### Requirement: Plugin schemas in listing

Plugin-provided schemas SHALL appear in `listSchemas()` and `listSchemasWithInfo()` results.

#### Scenario: Plugin schema in list
- **WHEN** plugin "odoo-lifecycle" provides schema "odoo-sdd"
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** "odoo-sdd" appears with `source: 'plugin'`

#### Scenario: Plugin schema shadowed by project-local
- **WHEN** "odoo-sdd" exists at both project-local and in a plugin
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** "odoo-sdd" appears once with `source: 'project'`
