## MODIFIED Requirements

### Requirement: Slash Command Generation

The command SHALL generate opsx slash commands for selected AI tools when a command adapter is registered for that tool.

#### Scenario: Generating slash commands for a tool

- **WHEN** a tool with a registered command adapter is selected during initialization
- **THEN** create 9 slash command files using the tool's command adapter:
  - `/opsx:explore`
  - `/opsx:new`
  - `/opsx:continue`
  - `/opsx:apply`
  - `/opsx:ff`
  - `/opsx:verify`
  - `/opsx:sync`
  - `/opsx:archive`
  - `/opsx:bulk-archive`
- **AND** use tool-specific path conventions (e.g., `.claude/commands/opsx/` for Claude)
- **AND** include tool-specific frontmatter format

#### Scenario: Selected tool without command adapter

- **WHEN** a selected tool supports skills but has no registered command adapter
- **THEN** generate OpenSpec skills for that tool
- **AND** skip slash command generation for that tool
- **AND** include explicit summary output that command generation was skipped because no adapter is available
