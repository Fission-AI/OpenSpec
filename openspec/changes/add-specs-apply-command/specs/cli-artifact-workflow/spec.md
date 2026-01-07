## ADDED Requirements

### Requirement: Specs Apply Command
The system SHALL provide a `specs apply` subcommand for applying delta specs to main specs.

#### Scenario: Apply specs for a change
- **WHEN** user runs `openspec specs apply --change <name>`
- **THEN** the system applies delta specs from the change to main specs
- **AND** displays a summary of changes made

#### Scenario: JSON output
- **WHEN** user runs `openspec specs apply --change <name> --json`
- **THEN** the system outputs JSON with:
  - `changeName`: the change being applied
  - `capabilities`: array of affected capabilities with counts
  - `totals`: aggregate counts of added/modified/removed/renamed

#### Scenario: Missing change parameter
- **WHEN** user runs `openspec specs apply` without `--change`
- **THEN** the system displays an error with list of available changes

#### Scenario: Change has no delta specs
- **WHEN** user runs `openspec specs apply --change <name>`
- **AND** the change has no `specs/` directory or no delta spec files
- **THEN** the system displays "No delta specs found for change <name>"

#### Scenario: Dry run mode
- **WHEN** user runs `openspec specs apply --change <name> --dry-run`
- **THEN** the system shows what would be changed without writing files
