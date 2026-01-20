## ADDED Requirements

### Requirement: Schema init command creates project-local schema
The CLI SHALL provide an `openspec schema init <name>` command that creates a new schema directory under `openspec/schemas/<name>/` with a valid `schema.yaml` file and default template files.

#### Scenario: Create schema with valid name
- **WHEN** user runs `openspec schema init my-workflow`
- **THEN** system creates directory `openspec/schemas/my-workflow/`
- **AND** creates `schema.yaml` with name, version, description, and artifacts array
- **AND** creates template files referenced by artifacts
- **AND** displays success message with created path

#### Scenario: Reject invalid schema name
- **WHEN** user runs `openspec schema init "My Workflow"` (contains space)
- **THEN** system displays error about invalid schema name
- **AND** suggests using kebab-case format
- **AND** exits with non-zero code

#### Scenario: Schema name already exists
- **WHEN** user runs `openspec schema init existing-schema` and `openspec/schemas/existing-schema/` already exists
- **THEN** system displays error that schema already exists
- **AND** suggests using `--force` to overwrite or `schema fork` to copy
- **AND** exits with non-zero code

### Requirement: Schema init supports interactive mode
The CLI SHALL prompt for schema configuration when run in an interactive terminal without explicit flags.

#### Scenario: Interactive prompts for description
- **WHEN** user runs `openspec schema init my-workflow` in an interactive terminal
- **THEN** system prompts for schema description
- **AND** uses provided description in generated `schema.yaml`

#### Scenario: Interactive prompts for artifact selection
- **WHEN** user runs `openspec schema init my-workflow` in an interactive terminal
- **THEN** system displays multi-select prompt with common artifacts (proposal, specs, design, tasks)
- **AND** each option includes a brief description
- **AND** uses selected artifacts in generated `schema.yaml`

#### Scenario: Non-interactive mode with flags
- **WHEN** user runs `openspec schema init my-workflow --description "My workflow" --artifacts proposal,tasks`
- **THEN** system creates schema without prompting
- **AND** uses flag values for configuration

### Requirement: Schema init supports setting project default
The CLI SHALL offer to set the newly created schema as the project default.

#### Scenario: Set as default interactively
- **WHEN** user runs `openspec schema init my-workflow` in interactive mode
- **AND** user confirms setting as default
- **THEN** system updates `openspec/config.yaml` with `defaultSchema: my-workflow`

#### Scenario: Set as default via flag
- **WHEN** user runs `openspec schema init my-workflow --default`
- **THEN** system creates schema and updates `openspec/config.yaml` with `defaultSchema: my-workflow`

#### Scenario: Skip setting default
- **WHEN** user runs `openspec schema init my-workflow --no-default`
- **THEN** system creates schema without modifying `openspec/config.yaml`

### Requirement: Schema init outputs JSON format
The CLI SHALL support `--json` flag for machine-readable output.

#### Scenario: JSON output on success
- **WHEN** user runs `openspec schema init my-workflow --json --description "Test" --artifacts proposal`
- **THEN** system outputs JSON with `created: true`, `path`, and `schema` fields
- **AND** does not display interactive prompts or spinners

#### Scenario: JSON output on error
- **WHEN** user runs `openspec schema init "invalid name" --json`
- **THEN** system outputs JSON with `error` field describing the issue
- **AND** exits with non-zero code
