## ADDED Requirements

### Requirement: Workspace-local skill guidance
Workspace-local OpenSpec skills SHALL include guidance that helps agents operate from the workspace planning home.

#### Scenario: Installing workspace guidance with skills
- **WHEN** workspace setup or workspace update installs OpenSpec skills into a workspace root
- **THEN** the installed skills SHALL tell agents they are operating from a workspace planning home
- **AND** they SHALL describe linked repos and folders as exploration context during planning
- **AND** they SHALL preserve the rule that implementation edits require an explicit implementation workflow and allowed edit root

#### Scenario: Keeping profile workflow selection
- **GIVEN** global config resolves to a workflow profile
- **WHEN** workspace setup or workspace update installs workspace-local skills
- **THEN** OpenSpec SHALL continue installing the workflows selected by the profile
- **AND** it SHALL layer workspace guidance onto those workflow skills without requiring a separate workspace workflow family

#### Scenario: Refreshing workspace guidance
- **WHEN** workspace update refreshes existing workspace-local skills
- **THEN** OpenSpec SHALL refresh the workspace guidance along with the selected workflow skill content
- **AND** it SHALL continue removing only known OpenSpec-managed workflow skill directories
