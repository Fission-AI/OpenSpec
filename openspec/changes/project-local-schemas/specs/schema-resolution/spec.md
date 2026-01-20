## ADDED Requirements

### Requirement: Project-local schema resolution

The system SHALL resolve schemas from the project-local directory (`./openspec/schemas/<name>/`) with highest priority when a `projectRoot` is provided.

#### Scenario: Project-local schema takes precedence over user override
- **WHEN** a schema named "my-workflow" exists at `./openspec/schemas/my-workflow/schema.yaml`
- **AND** a schema named "my-workflow" exists at `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** the system SHALL return the project-local path

#### Scenario: Project-local schema takes precedence over package built-in
- **WHEN** a schema named "spec-driven" exists at `./openspec/schemas/spec-driven/schema.yaml`
- **AND** "spec-driven" is a package built-in schema
- **AND** `getSchemaDir("spec-driven", projectRoot)` is called
- **THEN** the system SHALL return the project-local path

#### Scenario: Falls back to user override when no project-local schema
- **WHEN** no schema named "my-workflow" exists at `./openspec/schemas/my-workflow/`
- **AND** a schema named "my-workflow" exists at `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** the system SHALL return the user override path

#### Scenario: Falls back to package built-in when no project-local or user schema
- **WHEN** no schema named "spec-driven" exists at `./openspec/schemas/spec-driven/`
- **AND** no schema named "spec-driven" exists at `~/.local/share/openspec/schemas/spec-driven/`
- **AND** "spec-driven" is a package built-in schema
- **AND** `getSchemaDir("spec-driven", projectRoot)` is called
- **THEN** the system SHALL return the package built-in path

#### Scenario: Backward compatibility when projectRoot not provided
- **WHEN** `getSchemaDir("my-workflow")` is called without a `projectRoot` parameter
- **THEN** the system SHALL only check user override and package built-in locations
- **AND** the system SHALL NOT check project-local location

### Requirement: Project schemas directory helper

The system SHALL provide a `getProjectSchemasDir(projectRoot)` function that returns the project-local schemas directory path.

#### Scenario: Returns correct path
- **WHEN** `getProjectSchemasDir("/path/to/project")` is called
- **THEN** the system SHALL return `/path/to/project/openspec/schemas`

### Requirement: List schemas includes project-local

The system SHALL include project-local schemas when listing available schemas if `projectRoot` is provided.

#### Scenario: Project-local schemas appear in list
- **WHEN** a schema named "team-flow" exists at `./openspec/schemas/team-flow/schema.yaml`
- **AND** `listSchemas(projectRoot)` is called
- **THEN** the returned list SHALL include "team-flow"

#### Scenario: Project-local schema shadows same-named user schema in list
- **WHEN** a schema named "custom" exists at both project-local and user override locations
- **AND** `listSchemas(projectRoot)` is called
- **THEN** the returned list SHALL include "custom" exactly once

#### Scenario: Backward compatibility for listSchemas
- **WHEN** `listSchemas()` is called without a `projectRoot` parameter
- **THEN** the system SHALL only include user override and package built-in schemas

### Requirement: Schema info includes project source

The system SHALL indicate `source: 'project'` for project-local schemas in `listSchemasWithInfo()` results.

#### Scenario: Project-local schema shows project source
- **WHEN** a schema named "team-flow" exists at `./openspec/schemas/team-flow/schema.yaml`
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** the schema info for "team-flow" SHALL have `source: 'project'`

#### Scenario: User override schema shows user source
- **WHEN** a schema named "my-custom" exists only at `~/.local/share/openspec/schemas/my-custom/`
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** the schema info for "my-custom" SHALL have `source: 'user'`

#### Scenario: Package built-in schema shows package source
- **WHEN** "spec-driven" exists only as a package built-in
- **AND** `listSchemasWithInfo(projectRoot)` is called
- **THEN** the schema info for "spec-driven" SHALL have `source: 'package'`

### Requirement: Schemas command shows source

The `openspec schemas` command SHALL display the source of each schema.

#### Scenario: Display format includes source
- **WHEN** user runs `openspec schemas`
- **THEN** the output SHALL show each schema with its source label (project, user, or package)
