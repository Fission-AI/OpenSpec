## ADDED Requirements

### Requirement: External Issue Tracking Guidance

`openspec/AGENTS.md` SHALL include guidance for detecting, storing, and updating external issue references throughout the proposal lifecycle.

#### Scenario: Providing issue detection guidance

- **WHEN** an agent reads the External Issue Tracking section
- **THEN** find instructions for detecting issue references in user input
- **AND** find guidance on confirming tracking with the user before storing

#### Scenario: Providing metadata storage format

- **WHEN** an agent needs to store tracked issue references
- **THEN** find the YAML frontmatter format for proposal.md
- **AND** understand that only immutable references (tracker, id, url) are stored

#### Scenario: Providing update workflow guidance

- **WHEN** an agent needs to update external issues
- **THEN** find guidance on when to post updates (proposal created, section completed, archive)
- **AND** find instruction to confirm with user before any external update

#### Scenario: Providing tool usage guidance

- **WHEN** an agent has access to issue tracker tools
- **THEN** find guidance on using available tools to interact with trackers
- **AND** find fallback guidance for when no tools are available
