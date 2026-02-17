## ADDED Requirements

### Requirement: Schema validate checks schema structure
The CLI SHALL provide an `openspec schema validate [name]` command that validates schema configuration and reports errors.

#### Scenario: Validate specific schema
- **WHEN** user runs `openspec schema validate my-workflow`
- **THEN** system locates schema using resolution order
- **AND** validates `schema.yaml` against the schema Zod type
- **AND** displays validation result (valid or list of errors)

#### Scenario: Validate all project schemas
- **WHEN** user runs `openspec schema validate` without a name
- **THEN** system validates all schemas in `openspec/schemas/`
- **AND** displays results for each schema
- **AND** exits with non-zero code if any schema is invalid

#### Scenario: Schema not found
- **WHEN** user runs `openspec schema validate nonexistent`
- **THEN** system displays error that schema was not found
- **AND** exits with non-zero code

### Requirement: Schema validate checks YAML syntax
The CLI SHALL report YAML parsing errors with line numbers when possible.

#### Scenario: Invalid YAML syntax
- **WHEN** user runs `openspec schema validate my-workflow` and `schema.yaml` has syntax errors
- **THEN** system displays YAML parse error with line number
- **AND** exits with non-zero code

#### Scenario: Valid YAML but missing required fields
- **WHEN** `schema.yaml` is valid YAML but missing `name` field
- **THEN** system displays Zod validation error for missing required field
- **AND** identifies the specific missing field

### Requirement: Schema validate checks template existence
The CLI SHALL verify that all template files referenced by artifacts exist.

#### Scenario: Missing template file
- **WHEN** artifact references `template: proposal.md` but file doesn't exist in schema directory
- **THEN** system reports error: "Template file 'proposal.md' not found for artifact 'proposal'"
- **AND** exits with non-zero code

#### Scenario: All templates exist
- **WHEN** all artifact templates exist
- **THEN** system reports that templates are valid
- **AND** template existence is included in validation summary

### Requirement: Schema validate checks dependency graph
The CLI SHALL verify that artifact dependencies form a valid directed acyclic graph.

#### Scenario: Valid dependency graph
- **WHEN** artifact dependencies form a valid DAG (e.g., tasks → specs → proposal)
- **THEN** system reports dependency graph is valid

#### Scenario: Circular dependency detected
- **WHEN** artifact A requires B and artifact B requires A
- **THEN** system reports circular dependency error
- **AND** identifies the artifacts involved in the cycle
- **AND** exits with non-zero code

#### Scenario: Unknown dependency reference
- **WHEN** artifact requires `nonexistent-artifact`
- **THEN** system reports error: "Artifact 'x' requires unknown artifact 'nonexistent-artifact'"
- **AND** exits with non-zero code

### Requirement: Schema validate outputs JSON format
The CLI SHALL support `--json` flag for machine-readable validation results.

#### Scenario: JSON output for valid schema
- **WHEN** user runs `openspec schema validate my-workflow --json` and schema is valid
- **THEN** system outputs JSON with `valid: true`, `name`, and `path` fields

#### Scenario: JSON output for invalid schema
- **WHEN** user runs `openspec schema validate my-workflow --json` and schema has errors
- **THEN** system outputs JSON with `valid: false` and `issues` array
- **AND** each issue includes `level`, `path`, and `message` fields
- **AND** format matches existing `openspec validate` output structure

### Requirement: Schema validate supports verbose mode
The CLI SHALL support `--verbose` flag for detailed validation information.

#### Scenario: Verbose output shows all checks
- **WHEN** user runs `openspec schema validate my-workflow --verbose`
- **THEN** system displays each validation check as it runs
- **AND** shows pass/fail status for: YAML parsing, Zod validation, template existence, dependency graph
