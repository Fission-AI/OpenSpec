# CLI Validate Command Spec

## ADDED Requirements

### Requirement: Top-level validate command

The CLI SHALL provide a top-level `validate` command for validating changes and specs with flexible selection options.

#### Scenario: Interactive validation selection

- **WHEN** executing `pastelsdd validate` without arguments
- **THEN** prompt user to select what to validate (all, changes, specs, or specific item)
- **AND** perform validation based on selection
- **AND** display results with appropriate formatting

#### Scenario: Non-interactive environments do not prompt

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `pastelsdd validate` without arguments
- **THEN** do not prompt interactively
- **AND** print a helpful hint listing available commands/flags and exit with code 1

#### Scenario: Direct item validation

- **WHEN** executing `pastelsdd validate <item-name>`
- **THEN** automatically detect if item is a change or spec
- **AND** validate the specified item
- **AND** display validation results

### Requirement: Bulk and filtered validation

The validate command SHALL support flags for bulk validation (--all) and filtered validation by type (--changes, --specs).

#### Scenario: Validate everything

- **WHEN** executing `pastelsdd validate --all`
- **THEN** validate all changes in pastelsdd/changes/ (excluding archive)
- **AND** validate all specs in pastelsdd/specs/
- **AND** display a summary showing passed/failed items
- **AND** exit with code 1 if any validation fails

#### Scenario: Scope of bulk validation

- **WHEN** validating with `--all` or `--changes`
- **THEN** include all change proposals under `pastelsdd/changes/`
- **AND** exclude the `pastelsdd/changes/archive/` directory

- **WHEN** validating with `--specs`
- **THEN** include all specs that have a `spec.md` under `pastelsdd/specs/<id>/spec.md`

#### Scenario: Validate all changes

- **WHEN** executing `pastelsdd validate --changes`
- **THEN** validate all changes in pastelsdd/changes/ (excluding archive)
- **AND** display results for each change
- **AND** show summary statistics

#### Scenario: Validate all specs

- **WHEN** executing `pastelsdd validate --specs`
- **THEN** validate all specs in pastelsdd/specs/
- **AND** display results for each spec
- **AND** show summary statistics

### Requirement: Validation options and progress indication

The validate command SHALL support standard validation options (--strict, --json) and display progress during bulk operations.

#### Scenario: Strict validation

- **WHEN** executing `pastelsdd validate --all --strict`
- **THEN** apply strict validation to all items
- **AND** treat warnings as errors
- **AND** fail if any item has warnings or errors

#### Scenario: JSON output

- **WHEN** executing `pastelsdd validate --all --json`
- **THEN** output validation results as JSON
- **AND** include detailed issues for each item
- **AND** include summary statistics

#### Scenario: JSON output schema for bulk validation

- **WHEN** executing `pastelsdd validate --all --json` (or `--changes` / `--specs`)
- **THEN** output a JSON object with the following shape:
  - `items`: Array of objects with fields `{ id: string, type: "change"|"spec", valid: boolean, issues: Issue[], durationMs: number }`
  - `summary`: Object `{ totals: { items: number, passed: number, failed: number }, byType: { change?: { items: number, passed: number, failed: number }, spec?: { items: number, passed: number, failed: number } } }`
  - `version`: String identifier for the schema (e.g., `"1.0"`)
- **AND** exit with code 1 if any `items[].valid === false`

Where `Issue` follows the existing per-item validation report shape `{ level: "ERROR"|"WARNING"|"INFO", path: string, message: string }`.

#### Scenario: Show validation progress

- **WHEN** validating multiple items (--all, --changes, or --specs)
- **THEN** show progress indicator or status updates
- **AND** indicate which item is currently being validated
- **AND** display running count of passed/failed items

#### Scenario: Concurrency limits for performance

- **WHEN** validating multiple items
- **THEN** run validations with a bounded concurrency (e.g., 4–8 in parallel)
- **AND** ensure progress indicators remain responsive

### Requirement: Item type detection and ambiguity handling

The validate command SHALL handle ambiguous names and explicit type overrides to ensure clear, deterministic behavior.

#### Scenario: Direct item validation with automatic type detection

- **WHEN** executing `pastelsdd validate <item-name>`
- **THEN** if `<item-name>` uniquely matches a change or a spec, validate that item

#### Scenario: Ambiguity between change and spec names

- **GIVEN** `<item-name>` exists both as a change and as a spec
- **WHEN** executing `pastelsdd validate <item-name>`
- **THEN** print an ambiguity error explaining both matches
- **AND** suggest passing `--type change` or `--type spec`, or using `pastelsdd change validate` / `pastelsdd spec validate`
- **AND** exit with code 1 without performing validation

#### Scenario: Unknown item name

- **WHEN** the `<item-name>` matches neither a change nor a spec
- **THEN** print a not-found error
- **AND** show nearest-match suggestions when available
- **AND** exit with code 1

#### Scenario: Explicit type override

- **WHEN** executing `pastelsdd validate --type change <item>`
- **THEN** treat `<item>` as a change ID and validate it (skipping auto-detection)

- **WHEN** executing `pastelsdd validate --type spec <item>`
- **THEN** treat `<item>` as a spec ID and validate it (skipping auto-detection)

### Requirement: Interactivity controls

- The CLI SHALL respect `--no-interactive` to disable prompts.
- The CLI SHALL respect `OPEN_SPEC_INTERACTIVE=0` to disable prompts globally.
- Interactive prompts SHALL only be shown when stdin is a TTY and interactivity is not disabled.

#### Scenario: Disabling prompts via flags or environment

- **WHEN** `pastelsdd validate` is executed with `--no-interactive` or with environment `OPEN_SPEC_INTERACTIVE=0`
- **THEN** the CLI SHALL not display interactive prompts
- **AND** SHALL print non-interactive hints or chosen outputs as appropriate