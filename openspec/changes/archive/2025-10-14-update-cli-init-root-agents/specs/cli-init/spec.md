## MODIFIED Requirements
### Requirement: AI Tool Configuration
The command SHALL configure AI coding assistants with OpenSpec instructions using a grouped selection experience so teams can enable native integrations while always provisioning guidance for other assistants.

#### Scenario: Prompting for AI tool selection
- **WHEN** run interactively
- **THEN** present a multi-select wizard that separates options into two headings:
  - **Natively supported providers** shows each available first-party integration (Claude Code, Cursor, OpenCode, …) with checkboxes
  - **Other tools** explains that the root-level `AGENTS.md` stub is always generated for AGENTS-compatible assistants and cannot be deselected
- **AND** mark already configured native tools with "(already configured)" to signal that choosing them will refresh managed content
- **AND** keep disabled or unavailable providers labelled as "coming soon" so users know they cannot opt in yet
- **AND** allow confirming the selection even when no native provider is chosen because the root stub remains enabled by default
- **AND** change the base prompt copy in extend mode to "Which natively supported AI tools would you like to add or refresh?"

### Requirement: Exit Code Adjustments
`openspec init` SHALL treat extend mode without new native tool selections as a successful refresh.

#### Scenario: Allowing empty extend runs
- **WHEN** OpenSpec is already initialized and the user selects no additional natively supported tools
- **THEN** complete successfully while refreshing the root `AGENTS.md` stub
- **AND** exit with code 0

## ADDED Requirements
### Requirement: Root instruction stub
`openspec init` SHALL always scaffold the root-level `AGENTS.md` hand-off so every teammate finds the primary OpenSpec instructions.

#### Scenario: Creating root `AGENTS.md`
- **GIVEN** the project may or may not already contain an `AGENTS.md` file
- **WHEN** initialization completes in fresh or extend mode
- **THEN** create or refresh `AGENTS.md` at the repository root using the managed marker block from `TemplateManager.getAgentsStandardTemplate()`
- **AND** preserve any existing content outside the managed markers while replacing the stub text inside them
- **AND** create the stub regardless of which native AI tools are selected
