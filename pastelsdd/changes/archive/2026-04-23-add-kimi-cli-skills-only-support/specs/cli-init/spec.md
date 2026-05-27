# cli-init Delta Specification

## MODIFIED Requirements

### Requirement: Slash Command Generation

The command SHALL generate pastel slash commands only for selected tools that have a registered command adapter, while keeping adapterless tools valid for skill generation.

#### Scenario: Generating slash commands for a tool with a registered adapter

- **WHEN** a tool with a registered command adapter is selected during initialization
- **THEN** create 9 slash command files using the tool's command adapter:
  - `/pastel:explore`
  - `/pastel:new`
  - `/pastel:continue`
  - `/pastel:apply`
  - `/pastel:ff`
  - `/pastel:verify`
  - `/pastel:sync`
  - `/pastel:archive`
  - `/pastel:bulk-archive`
- **AND** use tool-specific path conventions (e.g., `.claude/commands/pastel/` for Claude)
- **AND** include tool-specific frontmatter format

#### Scenario: Selected tool has no command adapter

- **GIVEN** a selected tool has `skillsDir` configured but no registered command adapter
- **WHEN** initialization includes command generation
- **THEN** skill generation for that tool SHALL still remain valid
- **AND** command-file generation SHALL be skipped for that tool
- **AND** the command output SHALL include `Commands skipped for: <tool-id> (no adapter)`

#### Scenario: Kimi CLI skips command-file generation

- **WHEN** the user selects Kimi CLI during initialization
- **THEN** Pastelsdd SHALL treat it as a supported tool with `skillsDir: '.kimi'`
- **AND** command-file generation SHALL be skipped because no Kimi adapter is registered
