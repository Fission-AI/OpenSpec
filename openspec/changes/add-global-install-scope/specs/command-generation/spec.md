## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface
The system SHALL provide install-context-aware command path resolution.

#### Scenario: Adapter interface structure
- **WHEN** implementing a tool adapter
- **THEN** command file path resolution SHALL receive install context (including effective scope and environment context)
- **AND** SHALL return the effective command output path for that context

#### Scenario: Codex global path remains supported
- **WHEN** resolving Codex command paths in global scope
- **THEN** the adapter SHALL target `$CODEX_HOME/prompts` when `CODEX_HOME` is set
- **AND** SHALL otherwise target `~/.codex/prompts`

### Requirement: Command generator function
The command generator SHALL pass install context into adapter path resolution for all generated commands.

#### Scenario: Scoped command generation
- **WHEN** generating commands for a tool with a resolved effective scope
- **THEN** generated command paths SHALL match that effective scope
- **AND** the formatted command body/frontmatter behavior SHALL remain tool-specific and unchanged
