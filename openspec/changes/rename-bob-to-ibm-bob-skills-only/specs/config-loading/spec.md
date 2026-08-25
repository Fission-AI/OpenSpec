## MODIFIED Requirements

### Requirement: IBM Bob tool registration

The `AI_TOOLS` entry for the `bob` tool ID SHALL use `"IBM Bob"` as both its display name and success label.

#### Scenario: Bob tool display name

- **WHEN** the tool list is rendered for user-facing output (prompts, success messages, `openspec list`)
- **THEN** the entry for `value: 'bob'` SHALL display as `"IBM Bob"`
- **AND** SHALL NOT display `"Bob Shell"` or any other legacy name

#### Scenario: Bob tool success label

- **WHEN** `openspec init` or `openspec update` completes successfully for the `bob` tool
- **THEN** the success message SHALL reference `"IBM Bob"`
- **AND** SHALL NOT reference `"Bob Shell"`
