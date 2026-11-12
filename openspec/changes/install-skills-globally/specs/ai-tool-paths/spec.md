## ADDED Requirements

### Requirement: Each tool's home skills folder

The system SHALL know, for each tool with project skills, whether a global install reaches it through `~/.agents/skills/`, through a link in its own home skills folder, or not at all. Home folders SHALL match the skills CLI's table (version 1.8.1), including its environment overrides (`CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `HERMES_HOME`, `GROK_HOME`, `VIBE_HOME`).

#### Scenario: Claude Code with a custom config folder

- **GIVEN** `CLAUDE_CONFIG_DIR` is `/work/claude`
- **WHEN** the global install links Claude Code
- **THEN** the link SHALL be `/work/claude/skills/<skill>`

#### Scenario: A tool that reads the shared home folder

- **WHEN** the global install sets up Codex
- **THEN** no link SHALL be made for it
