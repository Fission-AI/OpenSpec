# schema-resolution Specification

## Purpose
Define project-local schema resolution behavior, including precedence order (project-local, then user override, then package built-in) and backward-compatible fallback when `projectRoot` is not provided.

## Requirements
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

### Requirement: Use config schema as default for new changes

The system SHALL use the schema field from `openspec/config.yaml` as the default when creating new changes without explicit `--schema` flag.

#### Scenario: Create change without --schema flag and config exists
- **WHEN** user runs `openspec new change foo` and config contains `schema: "tdd"`
- **THEN** system creates change with schema "tdd"

#### Scenario: Create change without --schema flag and no config
- **WHEN** user runs `openspec new change foo` and no config file exists
- **THEN** system creates change with default schema "spec-driven"

#### Scenario: Create change with explicit --schema flag
- **WHEN** user runs `openspec new change foo --schema custom` and config contains `schema: "tdd"`
- **THEN** system creates change with schema "custom" (CLI flag overrides config)

### Requirement: Resolve schema with updated precedence order

The system SHALL resolve the schema for a change using the following precedence order: CLI flag, change metadata, project config, hardcoded default.

#### Scenario: CLI flag is provided
- **WHEN** user runs command with `--schema custom`
- **THEN** system uses "custom" regardless of change metadata or config

#### Scenario: Change metadata specifies schema
- **WHEN** change has `.openspec.yaml` with `schema: bound` and config has `schema: tdd`
- **THEN** system uses "bound" from change metadata

#### Scenario: Only project config specifies schema
- **WHEN** no CLI flag or change metadata, but config has `schema: tdd`
- **THEN** system uses "tdd" from project config

#### Scenario: No schema specified anywhere
- **WHEN** no CLI flag, change metadata, or project config
- **THEN** system uses hardcoded default "spec-driven"

### Requirement: Support project-local schema names in config

The system SHALL allow the config schema field to reference project-local schemas defined in `openspec/schemas/`.

#### Scenario: Config references project-local schema
- **WHEN** config contains `schema: "my-workflow"` and `openspec/schemas/my-workflow/` exists
- **THEN** system resolves to the project-local schema

#### Scenario: Config references non-existent schema
- **WHEN** config contains `schema: "nonexistent"` and that schema does not exist
- **THEN** system shows error when attempting to load the schema with fuzzy match suggestions and list of all valid schemas

### Requirement: Provide helpful error message for invalid schema

The system SHALL display schema error with fuzzy match suggestions, list of available schemas, and fix instructions.

#### Scenario: Schema name with typo (close match)
- **WHEN** config contains `schema: "spce-driven"` (typo)
- **THEN** error message includes "Did you mean: spec-driven (built-in)" as suggestion

#### Scenario: Schema name with no close matches
- **WHEN** config contains `schema: "completely-wrong"`
- **THEN** error message shows list of all available built-in and project-local schemas

#### Scenario: Error message includes fix instructions
- **WHEN** config references invalid schema
- **THEN** error message includes "Fix: Edit openspec/config.yaml and change 'schema: X' to a valid schema name"

#### Scenario: Error distinguishes built-in vs project-local schemas
- **WHEN** error lists available schemas
- **THEN** output clearly labels each as "built-in" or "project-local"

### Requirement: Maintain backwards compatibility for existing changes

The system SHALL continue to work with existing changes that do not have project config.

#### Scenario: Existing change without config
- **WHEN** change was created before config feature and no config file exists
- **THEN** system resolves schema using existing logic (change metadata or hardcoded default)

#### Scenario: Existing change with config added later
- **WHEN** config file is added to project with existing changes
- **THEN** existing changes continue to use their bound schema from `.openspec.yaml`
