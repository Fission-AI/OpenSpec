## MODIFIED Requirements

### Requirement: Workspace setup installs agent skills
OpenSpec SHALL let users install OpenSpec agent skills into a workspace during workspace setup.

#### Scenario: Installing Codex workspace skills
- **WHEN** workspace setup installs Codex agent skills
- **THEN** OpenSpec SHALL generate workspace-local Codex OpenSpec skills under `.agents/skills`
- **AND** it SHALL NOT generate Codex OpenSpec skills under `.codex/skills`
- **AND** it SHALL treat `.codex/skills` only as a legacy detection and migration path

#### Scenario: Cleaning managed legacy Codex skills during workspace setup
- **WHEN** workspace setup installs Codex agent skills
- **AND** the workspace root contains OpenSpec-managed legacy `.codex/skills/openspec-*` directories
- **THEN** OpenSpec SHALL remove those managed legacy directories only after the `.agents/skills` replacement succeeds
- **AND** it SHALL leave unmanaged `.codex/skills` content untouched

### Requirement: Workspace update manages agent skills
OpenSpec SHALL provide a workspace update flow for refreshing agent skills after setup.

#### Scenario: Updating current Codex workspace skills
- **WHEN** workspace update refreshes Codex agent skills
- **AND** the workspace has Codex OpenSpec skills under `.agents/skills`
- **THEN** OpenSpec SHALL refresh Codex OpenSpec skills under `.agents/skills`

#### Scenario: Migrating legacy Codex workspace skills
- **WHEN** workspace update refreshes Codex agent skills
- **AND** the workspace root contains OpenSpec-managed legacy `.codex/skills/openspec-*` directories
- **THEN** OpenSpec SHALL generate refreshed Codex OpenSpec skills under `.agents/skills`
- **AND** remove OpenSpec-managed legacy `.codex/skills/openspec-*` directories after the replacement succeeds
- **AND** report that legacy workspace Codex skills were migrated

#### Scenario: Preserving unmanaged legacy Codex workspace skills
- **WHEN** workspace update refreshes Codex agent skills
- **AND** the workspace root contains non-OpenSpec or unmanaged content under `.codex/skills`
- **THEN** OpenSpec SHALL leave that unmanaged content untouched

#### Scenario: Failed workspace Codex migration
- **WHEN** workspace update fails to write Codex OpenSpec skills to `.agents/skills`
- **THEN** OpenSpec SHALL leave legacy `.codex/skills` content untouched
- **AND** surface the write failure with the affected path
