## ADDED Requirements
### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Claude Code
- **WHEN** the user selects Claude Code during initialization
- **THEN** create `.claude/commands/pastelsdd/proposal.md`, `.claude/commands/pastelsdd/apply.md`, and `.claude/commands/pastelsdd/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for Cursor
- **WHEN** the user selects Cursor during initialization
- **THEN** create `.cursor/commands/pastelsdd-proposal.md`, `.cursor/commands/pastelsdd-apply.md`, and `.cursor/commands/pastelsdd-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for OpenCode
- **WHEN** the user selects OpenCode during initialization
- **THEN** create `.opencode/commands/pastelsdd-proposal.md`, `.opencode/commands/pastelsdd-apply.md`, and `.opencode/commands/pastelsdd-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage
