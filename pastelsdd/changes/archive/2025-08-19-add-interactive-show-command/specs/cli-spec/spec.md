# CLI Spec Command Spec

## ADDED Requirements

### Requirement: Interactive spec show

The spec show command SHALL support interactive selection when no spec-id is provided.

#### Scenario: Interactive spec selection for show

- **WHEN** executing `pastelsdd spec show` without arguments
- **THEN** display an interactive list of available specs
- **AND** allow the user to select a spec to show
- **AND** display the selected spec content
- **AND** maintain all existing show options (--json, --requirements, --no-scenarios, -r)

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `pastelsdd spec show` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code