## MODIFIED Requirements

### Requirement: Dashboard Display

The system SHALL provide a `view` command that displays a dashboard overview of specs and changes.

#### Scenario: Basic dashboard display

- **WHEN** user runs `openspec view`
- **THEN** system displays a formatted dashboard with sections for summary, active changes, completed changes, and specifications

#### Scenario: No OpenSpec directory

- **WHEN** user runs `openspec view` in a directory without a local or descendant OpenSpec library
- **THEN** system displays error message "✗ No openspec directory found"
- **AND** exits with a nonzero status

#### Scenario: Combined dashboard
- **WHEN** view runs with multiple discovered local libraries
- **THEN** display aggregate metrics and per-library draft, active, completed, and spec sections
- **AND** label libraries by relative path in stable order, root first
- **AND** keep empty libraries visible and duplicate item names distinct

#### Scenario: Partially unreadable dashboard
- **WHEN** one discovered library cannot be read at library scope, such as an unreadable `openspec`, `changes`, or `specs` directory
- **THEN** retain readable libraries and report one actionable diagnostic naming the failing library's relative path
- **AND** exit nonzero

#### Scenario: Item-level read failures
- **WHEN** a spec cannot be parsed or a change's workflow status cannot be loaded inside an otherwise readable library
- **THEN** keep the existing item-level handling, a zero-count spec entry or a workflow warning, under that library's section
- **AND** do not treat the library as failed or change the exit status

