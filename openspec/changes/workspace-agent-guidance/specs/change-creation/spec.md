## ADDED Requirements

### Requirement: Workspace planning metadata flags
OpenSpec SHALL treat workspace planning metadata flags as inputs for workspace-scoped change creation.

#### Scenario: Storing a workspace product goal
- **GIVEN** the command runs from an OpenSpec workspace planning home
- **WHEN** the user creates a change with `--goal <text>`
- **THEN** OpenSpec SHALL store the text as workspace change planning metadata
- **AND** it SHALL not treat the metadata value as a replacement for `proposal.md`

#### Scenario: Rejecting metadata flags with unclear scope
- **WHEN** a metadata flag is intended only for workspace planning
- **THEN** OpenSpec SHALL either reject that flag outside workspace-scoped change creation or document its repo-local behavior explicitly
- **AND** generated workflow skills SHALL follow the documented scope
