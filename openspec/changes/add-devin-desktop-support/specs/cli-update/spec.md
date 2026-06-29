## MODIFIED Requirements

### Requirement: Slash Command Updates
The update command SHALL refresh existing slash command files for configured tools without creating new ones.

#### Scenario: Updating workflows for Devin Desktop
- **WHEN** `.devin/workflows/` contains `opsx-propose.md`, `opsx-apply.md`, and `opsx-archive.md`
- **THEN** refresh each file using shared templates wrapped in OpenSpec markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** preserve the frontmatter structure (name, description, category, tags)

#### Scenario: Updating workflows for Windsurf
- **WHEN** `.windsurf/workflows/` contains `opsx-propose.md`, `opsx-apply.md`, and `opsx-archive.md`
- **THEN** refresh each file using shared templates wrapped in OpenSpec markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Missing workflow file
- **WHEN** a tool lacks a workflow file
- **THEN** do not create a new file during update
