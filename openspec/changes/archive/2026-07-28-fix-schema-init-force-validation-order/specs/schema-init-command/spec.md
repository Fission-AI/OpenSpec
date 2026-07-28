## ADDED Requirements

### Requirement: Schema init validates artifacts before forced replacement
The CLI SHALL validate all requested artifact IDs before replacing an existing project-local schema. If artifact validation fails, the CLI SHALL leave the existing schema directory and all of its contents unchanged on every supported platform.

#### Scenario: Unknown artifact preserves existing schema
- **GIVEN** `openspec/schemas/tdd-driven/` already exists with user-authored files
- **WHEN** the user runs `schema init tdd-driven` with `--force` and an artifact list containing the unknown ID `task`
- **THEN** the command exits with a non-zero status and reports the unknown artifact
- **AND** the existing `tdd-driven` schema directory and its contents remain unchanged

#### Scenario: Unknown artifact preserves a schema at a Windows project path
- **GIVEN** an existing project-local schema is resolved from a Windows filesystem path
- **WHEN** forced schema initialization fails artifact validation
- **THEN** the resolved schema directory and its contents remain unchanged

#### Scenario: Valid artifacts allow forced replacement
- **GIVEN** a project-local schema already exists
- **WHEN** the user runs `schema init` with `--force` and only valid artifact IDs
- **THEN** the command replaces the existing schema with the newly generated schema
- **AND** reports successful creation
