# CLI Change Command Spec

## ADDED Requirements

### Requirement: Interactive validation selection

The change validate command SHALL support interactive selection when no change name is provided.

#### Scenario: Interactive change selection for validation

- **WHEN** executing `pastelsdd change validate` without arguments
- **THEN** display an interactive list of available changes
- **AND** allow the user to select a change to validate
- **AND** validate the selected change

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `pastelsdd change validate` without a change name
- **THEN** do not prompt interactively
- **AND** print the existing hint including available change IDs
- **AND** set `process.exitCode = 1`