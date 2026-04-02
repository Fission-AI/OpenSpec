## ADDED Requirements

### Requirement: Plugin-provided schema resolution tier

The system SHALL include plugin-provided schemas as a new tier in the resolution chain, between project-local and user-global.

#### Scenario: Full resolution order with plugins
- **WHEN** `getSchemaDir("my-schema", projectRoot)` is called
- **AND** plugins are loaded
- **THEN** the system checks in this order:
  1. Project-local: `<projectRoot>/openspec/schemas/my-schema/schema.yaml`
  2. Plugin-provided: iterate loaded plugins (in whitelist order), check `<pluginDir>/schemas/my-schema/schema.yaml`
  3. User-global: `~/.local/share/openspec/schemas/my-schema/schema.yaml`
  4. Package built-in: `<package>/schemas/my-schema/schema.yaml`

#### Scenario: No plugins loaded falls back to existing behavior
- **WHEN** no plugins are loaded
- **THEN** resolution order is unchanged: project-local → user-global → package built-in

#### Scenario: Plugin schema source label
- **WHEN** `listSchemasWithInfo(projectRoot)` is called
- **AND** a schema is resolved from a plugin
- **THEN** the SchemaInfo has `source: 'plugin'`

### Requirement: Resolver accepts loaded plugins

The `resolveSchema()`, `getSchemaDir()`, `listSchemas()`, and `listSchemasWithInfo()` functions SHALL accept an optional `loadedPlugins` parameter to include plugin schemas in resolution.

#### Scenario: resolveSchema with plugins
- **WHEN** `resolveSchema("odoo-sdd", projectRoot, loadedPlugins)` is called
- **AND** "odoo-sdd" is provided by a loaded plugin
- **THEN** the system returns the plugin's schema

#### Scenario: Backward compatibility without plugins parameter
- **WHEN** `resolveSchema("spec-driven", projectRoot)` is called without `loadedPlugins`
- **THEN** the system behaves identically to current behavior (no plugin tier)
