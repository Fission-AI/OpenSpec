# CLI Init Specification (Delta)

## ADDED Requirements

### Requirement: Slash Command Configuration

#### Scenario: Generating slash commands for Pi

- **WHEN** the user selects Pi during initialization
- **THEN** create `.pi/prompts/openspec-proposal.md`, `.pi/prompts/openspec-apply.md`, and `.pi/prompts/openspec-archive.md`
- **AND** populate each file with YAML frontmatter containing only a `description` field that summarizes the workflow stage
- **AND** wrap the shared template body with OpenSpec markers so `openspec update` can refresh the content
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

### Requirement: AI Tool Configuration

#### Scenario: Pi appears in tool selection

- **WHEN** displaying the AI tool selection menu
- **THEN** include "Pi" as an available option with value `pi`
- **AND** display success label "Pi" when configuration completes
