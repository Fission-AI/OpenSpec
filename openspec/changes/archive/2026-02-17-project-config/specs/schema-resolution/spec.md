# Spec: Schema Resolution with Config

## ADDED Requirements

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
