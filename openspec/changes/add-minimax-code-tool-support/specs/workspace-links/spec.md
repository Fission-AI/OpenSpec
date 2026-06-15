## MODIFIED Requirements

### Requirement: Workspace setup installs agent skills

OpenSpec SHALL let users install OpenSpec agent skills into a workspace during workspace setup.

#### Scenario: Installing MiniMax Code workspace skills uses global skill target

- **WHEN** workspace setup installs agent skills
- **AND** MiniMax Code is selected as an agent
- **THEN** OpenSpec SHALL resolve the MiniMax Code skill target through the shared skill directory helper
- **AND** it SHALL write MiniMax Code OpenSpec skills to `<home>/.minimax/skills`
- **AND** it SHALL NOT create a workspace-local `.minimax`, `.mavis`, or MiniMax fallback skills directory

#### Scenario: Workspace setup commands delivery preserves global MiniMax skills

- **GIVEN** global config delivery is `commands`
- **WHEN** workspace setup includes MiniMax Code in the selected agents
- **THEN** OpenSpec SHALL still write or refresh MiniMax Code OpenSpec skills in `<home>/.minimax/skills`
- **AND** it SHALL NOT generate MiniMax Code command files
- **AND** it SHALL NOT remove existing MiniMax Code skills solely because repo-local delivery is `commands`

### Requirement: Workspace update manages agent skills

OpenSpec SHALL provide a workspace update flow for refreshing agent skills after setup.

#### Scenario: Updating MiniMax Code workspace skills uses global skill target

- **WHEN** workspace update refreshes selected agent skills
- **AND** MiniMax Code is selected or stored in workspace-local selected agents
- **THEN** OpenSpec SHALL resolve the MiniMax Code skill target through the shared skill directory helper
- **AND** it SHALL refresh MiniMax Code OpenSpec skills in `<home>/.minimax/skills`
- **AND** it SHALL NOT create a workspace-local `.minimax`, `.mavis`, or MiniMax fallback skills directory

#### Scenario: Workspace update removes MiniMax Code workflow skills by name

- **WHEN** workspace update removes deselected MiniMax Code workflow skills or syncs profile-selected workflows
- **THEN** OpenSpec SHALL remove known `openspec-*` workflow skill directories by directory name
- **AND** it SHALL NOT require `SKILL.md` to contain OpenSpec generated metadata before removal
- **AND** it SHALL preserve non-OpenSpec MiniMax files outside the `openspec-*` workflow skill targets

#### Scenario: Workspace update commands delivery preserves global MiniMax skills

- **GIVEN** global config delivery is `commands`
- **WHEN** workspace update includes MiniMax Code in the selected or stored agents
- **THEN** OpenSpec SHALL still write or refresh MiniMax Code OpenSpec skills in `<home>/.minimax/skills`
- **AND** it SHALL NOT generate MiniMax Code command files
- **AND** it SHALL NOT remove existing MiniMax Code skills solely because repo-local delivery is `commands`
