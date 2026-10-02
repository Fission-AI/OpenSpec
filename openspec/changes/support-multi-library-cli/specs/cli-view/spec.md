## MODIFIED Requirements

### Requirement: Dashboard Display

The system SHALL provide a `view` command that displays a dashboard overview of specs and changes.

#### Scenario: Basic dashboard display

- **WHEN** user runs `openspec view`
- **THEN** system displays a formatted dashboard with sections for summary, active changes, completed changes, and specifications

#### Scenario: No OpenSpec directory

- **WHEN** user runs `openspec view` in a directory without a local or descendant OpenSpec library
- **THEN** system displays error message "✗ No openspec directory found"

#### Scenario: Combined dashboard
- **WHEN** view runs with multiple discovered local libraries
- **THEN** display aggregate metrics and per-library draft, active, completed, archived, and spec sections
- **AND** label libraries by relative path in stable order, root first
- **AND** keep empty libraries visible and duplicate item names distinct

#### Scenario: Partially unreadable dashboard
- **WHEN** one discovered library is unreadable or malformed
- **THEN** retain readable libraries and report one actionable diagnostic for the failing library
- **AND** exit nonzero

