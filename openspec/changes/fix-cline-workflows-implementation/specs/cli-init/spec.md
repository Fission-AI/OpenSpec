# Delta for CLI Init

## MODIFIED Requirements
### Requirement: Slash Command Configuration

#### Scenario: Generating slash commands for Cline
- **WHEN** the user selects Cline during initialization
- **THEN** create `.clinerules/workflows/openspec-proposal.md`, `.clinerules/workflows/openspec-apply.md`, and `.clinerules/workflows/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** include Cline-specific Markdown heading frontmatter
- **AND** each template includes instructions for the relevant OpenSpec workflow stage
