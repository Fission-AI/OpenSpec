# cli-spec Specification

## Purpose
Define `openspec spec` command behavior for listing, showing, and validating source-of-truth specifications.

## Requirements
### Requirement: Interactive spec show

The spec show command SHALL support interactive selection when no spec-id is provided.

#### Scenario: Interactive spec selection for show

- **WHEN** executing `openspec spec show` without arguments
- **THEN** display an interactive list of available specs
- **AND** allow the user to select a spec to show
- **AND** display the selected spec content
- **AND** maintain all existing show options (--json, --requirements, --no-scenarios, -r)

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec spec show` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code

### Requirement: Spec Command

The system SHALL provide a `spec` command with subcommands for displaying, listing, and validating specifications.

#### Scenario: Show spec as JSON

- **WHEN** executing `openspec spec show init --json`
- **THEN** parse the markdown spec file
- **AND** extract headings and content hierarchically
- **AND** output valid JSON to stdout

#### Scenario: List all specs

- **WHEN** executing `openspec spec list`
- **THEN** scan the openspec/specs directory
- **AND** return list of all available capabilities
- **AND** support JSON output with `--json` flag

#### Scenario: Filter spec content

- **WHEN** executing `openspec spec show init --requirements`
- **THEN** display only requirement names and SHALL statements
- **AND** exclude scenario content

#### Scenario: Validate spec structure

- **WHEN** executing `openspec spec validate init`
- **THEN** parse the spec file
- **AND** validate against Zod schema
- **AND** report any structural issues

### Requirement: JSON Schema Definition

The system SHALL define Zod schemas that accurately represent the spec structure for runtime validation.

#### Scenario: Schema validation

- **WHEN** parsing a spec into JSON
- **THEN** validate the structure using Zod schemas
- **AND** ensure all required fields are present
- **AND** provide clear error messages for validation failures

### Requirement: Interactive spec validation

The spec validate command SHALL support interactive selection when no spec-id is provided.

#### Scenario: Interactive spec selection for validation

- **WHEN** executing `openspec spec validate` without arguments
- **THEN** display an interactive list of available specs
- **AND** allow the user to select a spec to validate
- **AND** validate the selected spec
- **AND** maintain all existing validation options (--strict, --json)

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec spec validate` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code

