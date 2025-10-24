## MODIFIED Requirements
### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Gemini CLI
- **WHEN** the user selects Gemini CLI during initialization
- **THEN** create `.gemini/commands/openspec/proposal.toml`, `.gemini/commands/openspec/apply.toml`, and `.gemini/commands/openspec/archive.toml`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** ensure each TOML file contains OpenSpec-managed markers around the prompt so future updates can refresh the body safely
