## ADDED Requirements
### Requirement: Slash Command Safety
All generated slash command templates SHALL include safety guardrails.

#### Scenario: CLI Availability Check
- **WHEN** generating slash commands for any tool
- **THEN** the template SHALL include an instruction to verify the `openspec` CLI is installed and available in the environment
- **AND** guide the user to install it via `npm install -g @fission-ai/openspec` if missing
