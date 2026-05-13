## ADDED Requirements

### Requirement: Workspace planning schema
The artifact graph SHALL provide a built-in workspace planning schema for workspace-scoped changes.

#### Scenario: Built-in workspace planning schema is available
- **WHEN** schemas are resolved from package built-ins
- **THEN** a schema named `workspace-planning` SHALL be available
- **AND** it SHALL describe the artifact structure for workspace-scoped planning

#### Scenario: Workspace planning schema artifacts
- **WHEN** the `workspace-planning` schema is loaded
- **THEN** it SHALL include artifacts for a shared proposal, affected areas, cross-area design, and coordination tasks
- **AND** the affected areas artifact SHALL be distinct from delivery slices or phases

#### Scenario: Workspace planning schema templates
- **WHEN** artifact instructions are requested for the `workspace-planning` schema
- **THEN** the schema SHALL provide templates that guide agents to write workspace-level planning content
- **AND** those templates SHALL avoid instructing agents to create repo-local implementation artifacts

#### Scenario: Workspace planning apply readiness
- **WHEN** the `workspace-planning` schema defines apply readiness
- **THEN** it SHALL require coordination tasks before implementation begins
- **AND** the apply guidance SHALL direct agents to select an affected area before making implementation edits
