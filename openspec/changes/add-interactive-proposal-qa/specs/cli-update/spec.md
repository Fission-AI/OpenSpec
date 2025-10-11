## MODIFIED Requirements
### Requirement: Slash Command Updates
The update command SHALL refresh existing slash command files for configured tools, including the interactive proposal interview template, without creating new ones.

#### Scenario: Updating slash commands for Claude Code
- **WHEN** `.claude/commands/openspec/` contains `proposal.md`, `proposal-qa.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure the `proposal-qa` template contains the interactive discovery instructions aligned with the latest assistant guidance.

#### Scenario: Updating slash commands for Cursor
- **WHEN** `.cursor/commands/` contains `openspec-proposal.md`, `openspec-proposal-qa.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure the `proposal-qa` template contains the interactive discovery instructions aligned with the latest assistant guidance.

#### Scenario: Updating slash commands for OpenCode
- **WHEN** `.opencode/commands/` contains `openspec-proposal.md`, `openspec-proposal-qa.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure the `proposal-qa` template contains the interactive discovery instructions aligned with the latest assistant guidance.
