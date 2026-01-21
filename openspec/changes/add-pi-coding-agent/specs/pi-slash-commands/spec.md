# Pi Slash Commands Specification

## Purpose

Generate OpenSpec slash command files for pi-coding-agent in the `.pi/prompts/` directory format.

## ADDED Requirements

### Requirement: Pi slash command file format

The system SHALL generate pi-coding-agent slash commands as Markdown files with YAML frontmatter containing a `description` field.

#### Scenario: Generating proposal command

- **WHEN** generating the proposal slash command for pi
- **THEN** create `.pi/prompts/openspec-proposal.md`
- **AND** include YAML frontmatter with `description: Scaffold a new OpenSpec change and validate strictly.`
- **AND** include the shared OpenSpec proposal template body wrapped in managed markers

#### Scenario: Generating apply command

- **WHEN** generating the apply slash command for pi
- **THEN** create `.pi/prompts/openspec-apply.md`
- **AND** include YAML frontmatter with `description: Implement an approved OpenSpec change and keep tasks in sync.`
- **AND** include the shared OpenSpec apply template body wrapped in managed markers

#### Scenario: Generating archive command

- **WHEN** generating the archive slash command for pi
- **THEN** create `.pi/prompts/openspec-archive.md`
- **AND** include YAML frontmatter with `description: Archive a deployed OpenSpec change and update specs.`
- **AND** include the shared OpenSpec archive template body wrapped in managed markers

### Requirement: Pi slash command configurator

The system SHALL provide a `PiSlashCommandConfigurator` class that extends `SlashCommandConfigurator`.

#### Scenario: Configurator registration

- **WHEN** the application initializes
- **THEN** register `PiSlashCommandConfigurator` in `SlashCommandRegistry` with toolId `pi`
- **AND** set `isAvailable` to `true`

#### Scenario: Path resolution

- **WHEN** resolving file paths for pi slash commands
- **THEN** use `path.join()` to construct paths like `.pi/prompts/openspec-proposal.md`
- **AND** ensure cross-platform compatibility with Windows path separators
