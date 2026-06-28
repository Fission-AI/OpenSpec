## MODIFIED Requirements

### Requirement: Top-level show command

The CLI SHALL provide a top-level `show` command for displaying changes and specs with intelligent selection.

#### Scenario: Interactive show selection

- **WHEN** executing `openspec show` without arguments
- **THEN** prompt user to select type (change or spec)
- **AND** display list of available items for selected type, including hierarchical spec IDs
- **AND** show the selected item's content

#### Scenario: Non-interactive environments do not prompt

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec show` without arguments
- **THEN** do not prompt
- **AND** print a helpful hint with examples for `openspec show <item>` or `openspec change/spec show`
- **AND** exit with code 1

#### Scenario: Direct item display

- **WHEN** executing `openspec show <item-name>`
- **THEN** automatically detect if item is a change or spec
- **AND** display the item's content
- **AND** use appropriate formatting based on item type

#### Scenario: Direct hierarchical spec display

- **WHEN** executing `openspec show cli/show`
- **THEN** detect that `cli/show` is a hierarchical spec ID
- **AND** resolve it at `openspec/specs/cli/show/spec.md`
- **AND** display the spec content

#### Scenario: Type detection and ambiguity handling

- **WHEN** executing `openspec show <item-name>`
- **THEN** if `<item-name>` uniquely matches a change or a spec, show that item
- **AND** if it matches both, print an ambiguity error and suggest `--type change|spec` or using `openspec change show`/`openspec spec show`
- **AND** if it matches neither, print not-found with nearest-match suggestions including hierarchical specs

#### Scenario: Explicit type override

- **WHEN** executing `openspec show --type change <item>`
- **THEN** treat `<item>` as a change ID and show it (skipping auto-detection)

- **WHEN** executing `openspec show --type spec <item>`
- **THEN** treat `<item>` as a spec ID and show it (skipping auto-detection)
- **AND** support hierarchical spec IDs (e.g., `openspec show --type spec cli/show`)
