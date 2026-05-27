# CLI Spec Command Spec

## ADDED Requirements

### Requirement: Interactive spec validation

The spec validate command SHALL support interactive selection when no spec-id is provided.

#### Scenario: Interactive spec selection for validation

- **WHEN** executing `pastelsdd spec validate` without arguments
- **THEN** display an interactive list of available specs
- **AND** allow the user to select a spec to validate
- **AND** validate the selected spec
- **AND** maintain all existing validation options (--strict, --json)

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `pastelsdd spec validate` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code