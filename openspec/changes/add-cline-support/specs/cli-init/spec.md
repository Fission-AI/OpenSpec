## ADDED Requirements
### Requirement: Cline Tool Support
The system SHALL provide Cline (VS Code extension) as a supported tool option during OpenSpec initialization.

#### Scenario: Initialize project with Cline support
- **WHEN** user runs `openspec init --tools cline`
- **THEN** Cline-specific rule files are configured in `.clinerules/`
- **AND** CLINE.md root file includes OpenSpec workflow instructions
- **AND** Cline is registered as available configurator

#### Scenario: Cline proposal rule generation
- **WHEN** Cline rules are configured
- **THEN** `.clinerules/openspec-proposal.md` contains proposal workflow with guardrails
- **AND** Includes Cline-specific Markdown heading frontmatter
- **AND** Follows established slash command template pattern

#### Scenario: Cline apply and archive rules
- **WHEN** Cline rules are configured
- **THEN** `.clinerules/openspec-apply.md` contains implementation workflow
- **AND** `.clinerules/openspec-archive.md` contains archiving workflow
- **AND** Both commands include appropriate headers and references

#### Scenario: Cline root instructions
- **WHEN** Cline is selected during initialization
- **THEN** CLINE.md is created at project root
- **AND** Contains OpenSpec markers for managed content
- **AND** References `@/openspec/AGENTS.md` for workflow instructions
