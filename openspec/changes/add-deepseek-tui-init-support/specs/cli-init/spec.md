# cli-init Delta Specification

## MODIFIED Requirements

### Requirement: Slash Command Generation

The command SHALL generate opsx slash commands only for selected tools that have a registered command adapter, while keeping adapterless tools valid for skill generation.

#### Scenario: Generating slash commands for a tool with a registered adapter

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

#### Scenario: Selected tool has no command adapter

- **GIVEN** a selected tool has `skillsDir` configured but no registered command adapter
- **WHEN** initialization includes command generation
- **THEN** skill generation for that tool SHALL still remain valid
- **AND** command-file generation SHALL be skipped for that tool
- **AND** the command output SHALL include `Commands skipped for: <tool-id> (no adapter)`

#### Scenario: Kimi CLI skips command-file generation

- **WHEN** the user selects Kimi CLI during initialization
- **THEN** OpenSpec SHALL treat it as a supported tool with `skillsDir: '.kimi'`
- **AND** command-file generation SHALL be skipped because no Kimi adapter is registered

#### Scenario: DeepSeek TUI skips command-file generation

- **WHEN** the user selects DeepSeek TUI during initialization
- **THEN** OpenSpec SHALL treat it as a supported tool with `skillsDir: '.deepseek'`
- **AND** skill files SHALL be generated under `<projectRoot>/.deepseek/skills/` when delivery includes skills
- **AND** command-file generation SHALL be skipped when no DeepSeek adapter is registered
- **AND** summary output SHALL report `Commands skipped for: deepseek (no adapter)` when command generation is requested

#### Scenario: DeepSeek appears in non-interactive tool validation

- **WHEN** the user runs `openspec init --tools deepseek`
- **THEN** OpenSpec SHALL accept `deepseek` as a valid tool id
- **AND** it SHALL process DeepSeek using the same validation pipeline as other supported tool ids
