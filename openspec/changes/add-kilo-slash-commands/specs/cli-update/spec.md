## MODIFIED Requirements
### Requirement: Slash Command Updates
The update command SHALL refresh existing slash command files for configured tools without creating new ones.

#### Scenario: Updating slash commands for Kilo Code
- **WHEN** `.kilocode/workflows/` already contains `openspec-plan-change.md`, `openspec-author-proposal.md`, and `openspec-validate-change.md`
- **THEN** refresh each Markdown workflow from the shared templates while preserving any content outside the OpenSpec markers
- **AND** ensure the regenerated workflows keep the frontmatter descriptions and reminders to gather missing context
- **AND** report the updated `/openspec-plan-change.md`, `/openspec-author-proposal.md`, and `/openspec-validate-change.md` slash commands in the success summary
