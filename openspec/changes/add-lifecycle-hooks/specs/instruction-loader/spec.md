# instruction-loader Delta Spec

## ADDED Requirements

### Requirement: Hook Resolution

The system SHALL resolve lifecycle hooks for a given lifecycle point by reading from both schema and project config, returning them in execution order.

#### Scenario: Resolve hooks with change context

- **WHEN** `resolveHooks(projectRoot, changeName, lifecyclePoint)` is called with a non-null `changeName`
- **THEN** the system reads the schema associated with the change
- **AND** reads the project config
- **AND** returns hooks from both sources, schema hooks first, config hooks second

#### Scenario: Resolve hooks without change context

- **WHEN** `resolveHooks(projectRoot, null, lifecyclePoint)` is called with null `changeName`
- **THEN** the system resolves the schema from `config.yaml`'s default `schema` field
- **AND** reads hooks from both the resolved schema and project config (schema first, config second)
- **AND** if no schema is configured in `config.yaml`, returns only config hooks

#### Scenario: No hooks defined

- **WHEN** neither schema nor config define hooks for the given lifecycle point
- **THEN** the system returns an empty array

#### Scenario: Hook result structure

- **WHEN** hooks are resolved
- **THEN** each hook object includes `source` (string: "schema" or "config") and `instruction` (string)
