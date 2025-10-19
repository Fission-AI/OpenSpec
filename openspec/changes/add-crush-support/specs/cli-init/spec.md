## ADDED Requirements
### Requirement: Crush Tool Support
The system SHALL provide Crush AI assistant as a supported tool option during OpenSpec initialization.

#### Scenario: Initialize project with Crush support
- **WHEN** user runs `openspec init --tool crush`
- **THEN** Crush-specific slash commands are configured in `.crush/commands/openspec/`
- **AND** Crush AGENTS.md includes OpenSpec workflow instructions
- **AND** Crush is registered as available configurator

#### Scenario: Crush proposal command generation
- **WHEN** Crush slash commands are configured
- **THEN** `.crush/commands/openspec/proposal.md` contains proposal workflow with guardrails
- **AND** Includes Crush-specific frontmatter with OpenSpec category and tags
- **AND** Follows established slash command template pattern

#### Scenario: Crush apply and archive commands
- **WHEN** Crush slash commands are configured
- **THEN** `.crush/commands/openspec/apply.md` contains implementation workflow
- **AND** `.crush/commands/openspec/archive.md` contains archiving workflow
- **AND** Both commands include appropriate frontmatter and references