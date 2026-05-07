## MODIFIED Requirements

### Requirement: Shared command body content

The body content of commands SHALL be shared across all tools.

#### Scenario: Same instructions across tools

- **WHEN** generating the 'explore' command for Claude and Cursor
- **THEN** both SHALL use the same `body` content
- **AND** only the frontmatter and file path SHALL differ

#### Scenario: Multiagent workflow references correct team primitives

- **WHEN** generating the `/opsx:multiagent` command or skill body
- **THEN** the body SHALL reference `TaskCreate` and `TaskUpdate` for progress tracking
- **AND** the body SHALL NOT reference `TodoWrite`

#### Scenario: Distribution template produces actionable team setup

- **WHEN** generating the distribution.md template for the `dispec-driven` schema
- **THEN** the "Claude Code Team Setup" section SHALL describe team creation using `TeamCreate` with `team_name` and `description` parameters
- **AND** the section SHALL describe teammate spawning using the `Agent` tool with `name`, `team_name`, `subagent_type`, and `prompt` parameters
- **AND** the section SHALL describe task creation using `TaskCreate` with `subject`, `description`, and `activeForm` parameters
- **AND** the section SHALL NOT use pseudo-bash comments or placeholder syntax
