## ADDED Requirements

### Requirement: Project-local schemas follow the authoritative OpenSpec directory

Schema discovery and loading SHALL resolve project-local schemas beneath the authoritative OpenSpec directory rather than reconstructing an `openspec/schemas` path from the process working directory or workspace root.

#### Scenario: Environment-selected project schema

- **GIVEN** `OPENSPEC_DIR` selects `ai/openspec`
- **AND** a project-local schema exists under `ai/openspec/schemas/<name>`
- **WHEN** the user lists schemas or creates a change using that schema
- **THEN** schema discovery and schema loading SHALL both use the selected project-local schema

#### Scenario: Default and store schemas retain precedence

- **WHEN** `OPENSPEC_DIR` is unset or empty
- **THEN** project-local, user override, and package schema precedence SHALL remain unchanged for default projects and stores
