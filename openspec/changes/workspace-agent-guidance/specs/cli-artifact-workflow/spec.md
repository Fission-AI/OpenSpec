## ADDED Requirements

### Requirement: Workspace-aware change-starting skills
Generated change-starting workflow skills SHALL create workspace changes with workspace planning context when they are operating from a workspace planning home.

#### Scenario: Capturing the product goal when starting a workspace change
- **GIVEN** an agent is using a generated change-starting skill from a workspace planning home
- **WHEN** the agent creates a workspace change from the user's product goal
- **THEN** the skill guidance SHALL instruct the agent to pass the concise product goal with `--goal`
- **AND** it SHALL still create or update `proposal.md` as the human-readable planning artifact

#### Scenario: Passing known affected areas
- **GIVEN** an agent is using a generated change-starting skill from a workspace planning home
- **AND** the agent can identify affected areas that match registered workspace link names
- **WHEN** the agent creates the workspace change
- **THEN** the skill guidance SHALL instruct the agent to pass those link names with `--areas`
- **AND** it SHALL not pass exploratory or uncertain area names as `--areas`

#### Scenario: Deferring unresolved affected areas
- **GIVEN** an agent is using a generated change-starting skill from a workspace planning home
- **AND** affected areas are unclear
- **WHEN** the agent creates the workspace change
- **THEN** the skill guidance SHALL allow the agent to omit `--areas`
- **AND** it SHALL tell the agent to keep unresolved affected-area questions visible in workspace planning artifacts

#### Scenario: Preserving repo-local change creation
- **GIVEN** an agent is using a generated change-starting skill from a repo-local planning home
- **WHEN** the agent creates a new change
- **THEN** the skill guidance SHALL preserve normal repo-local change creation behavior
- **AND** it SHALL not instruct the agent to use workspace-only metadata flags for repo-local changes
