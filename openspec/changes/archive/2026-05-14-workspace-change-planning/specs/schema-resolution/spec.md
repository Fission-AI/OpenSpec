## ADDED Requirements

### Requirement: Workspace planning schema resolution
Schema resolution SHALL support the built-in workspace planning schema.

#### Scenario: Listing workspace planning schema
- **WHEN** a user runs `openspec schemas`
- **THEN** the output SHALL include `workspace-planning`
- **AND** it SHALL identify it as a package-provided schema unless overridden by a higher-precedence schema

#### Scenario: Resolving workspace planning schema by name
- **WHEN** a workflow command requests schema `workspace-planning`
- **THEN** schema resolution SHALL resolve it using the normal project, user, then package precedence order

#### Scenario: Workspace default schema for new changes
- **GIVEN** the command creates a change in a workspace planning home
- **AND** the user did not pass an explicit `--schema`
- **WHEN** OpenSpec resolves the schema for the new change
- **THEN** it SHALL use `workspace-planning` as the default schema

#### Scenario: Explicit schema override for workspace change
- **GIVEN** the command creates a change in a workspace planning home
- **WHEN** the user passes an explicit `--schema <name>`
- **THEN** OpenSpec SHALL use the explicitly requested schema
- **AND** it SHALL validate that schema using normal schema resolution
