## MODIFIED Requirements

### Requirement: Top-level validate command

The CLI SHALL provide a top-level `validate` command for validating changes and specs with flexible selection options.

#### Scenario: Interactive validation selection

- **WHEN** executing `openspec validate` without arguments
- **THEN** prompt user to select what to validate (all, changes, specs, or specific item)
- **AND** perform validation based on selection
- **AND** display results with appropriate formatting

#### Scenario: Non-interactive environments do not prompt

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec validate` without arguments
- **THEN** do not prompt interactively
- **AND** print a helpful hint listing available commands/flags and exit with code 1

#### Scenario: Direct item validation

- **WHEN** executing `openspec validate <item-name>`
- **THEN** automatically detect if item is a change or spec
- **AND** validate the specified item
- **AND** display validation results

#### Scenario: Direct hierarchical spec validation

- **WHEN** executing `openspec validate cli/show`
- **THEN** detect that `cli/show` is a hierarchical spec ID
- **AND** resolve and validate the spec at `openspec/specs/cli/show/spec.md`

### Requirement: Bulk and filtered validation

The validate command SHALL support flags for bulk validation (--all) and filtered validation by type (--changes, --specs).

#### Scenario: Validate everything

- **WHEN** executing `openspec validate --all`
- **THEN** validate all changes in openspec/changes/ (excluding archive)
- **AND** recursively validate all specs in openspec/specs/ (including hierarchical)
- **AND** display a summary showing passed/failed items
- **AND** exit with code 1 if any validation fails

#### Scenario: Scope of bulk validation

- **WHEN** validating with `--all` or `--changes`
- **THEN** include all change proposals under `openspec/changes/`
- **AND** exclude the `openspec/changes/archive/` directory

- **WHEN** validating with `--specs`
- **THEN** recursively discover and include all specs that have a `spec.md` at any depth under `openspec/specs/`

### Requirement: Item type detection and ambiguity handling

The validate command SHALL handle ambiguous names and explicit type overrides to ensure clear, deterministic behavior.

#### Scenario: Direct item validation with automatic type detection

- **WHEN** executing `openspec validate <item-name>`
- **THEN** if `<item-name>` uniquely matches a change or a spec (including hierarchical IDs), validate that item

#### Scenario: Ambiguity between change and spec names

- **GIVEN** `<item-name>` exists both as a change and as a spec
- **WHEN** executing `openspec validate <item-name>`
- **THEN** print an ambiguity error explaining both matches
- **AND** suggest passing `--type change` or `--type spec`, or using `openspec change validate` / `openspec spec validate`
- **AND** exit with code 1 without performing validation

#### Scenario: Unknown item name

- **WHEN** the `<item-name>` matches neither a change nor a spec
- **THEN** print a not-found error
- **AND** show nearest-match suggestions including hierarchical spec IDs
- **AND** exit with code 1

#### Scenario: Explicit type override

- **WHEN** executing `openspec validate --type change <item>`
- **THEN** treat `<item>` as a change ID and validate it (skipping auto-detection)

- **WHEN** executing `openspec validate --type spec <item>`
- **THEN** treat `<item>` as a spec ID and validate it (skipping auto-detection)
- **AND** support hierarchical spec IDs (e.g., `openspec validate --type spec cli/show`)
