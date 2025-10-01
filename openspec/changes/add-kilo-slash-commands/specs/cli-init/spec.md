## MODIFIED Requirements
### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Kilo Code
- **WHEN** the user selects Kilo Code during initialization
- **THEN** create `.kilocode/workflows/openspec-plan-change.md`, `.kilocode/workflows/openspec-author-proposal.md`, and `.kilocode/workflows/openspec-validate-change.md`
- **AND** populate each Markdown file with the OpenSpec planning, proposal authoring, and validation workflows (including frontmatter descriptions and reminders to collect missing inputs)
- **AND** wrap the managed content in OpenSpec markers so future updates can refresh the body safely
- **AND** list the resulting `/openspec-plan-change.md`, `/openspec-author-proposal.md`, and `/openspec-validate-change.md` slash commands in the success summary
