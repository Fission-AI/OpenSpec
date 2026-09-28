## ADDED Requirements

### Requirement: Workspace planning schema
The artifact graph SHALL provide a built-in workspace planning schema for workspace-scoped changes.

#### Scenario: Built-in workspace planning schema is available
- **WHEN** schemas are resolved from package built-ins
- **THEN** a schema named `workspace-planning` SHALL be available
- **AND** it SHALL describe the artifact structure for workspace-scoped planning

#### Scenario: Workspace planning schema artifacts
- **WHEN** the `workspace-planning` schema is loaded
- **THEN** it SHALL include the normal planning artifacts for a shared proposal, workspace-scoped specs, cross-area design, and coordination tasks
- **AND** it SHALL not require an additional area manifest outside those normal planning artifacts

#### Scenario: Workspace planning schema supports nested specs
- **WHEN** the `workspace-planning` schema defines its specs artifact
- **THEN** the specs artifact SHALL resolve workspace-scoped spec files under `specs/**/*.md`
- **AND** schema guidance SHALL describe `specs/<area-or-repo>/<capability>/spec.md` as the default convention for area-specific requirements

#### Scenario: Workspace planning schema templates
- **WHEN** artifact instructions are requested for the `workspace-planning` schema
- **THEN** the schema SHALL provide templates that guide agents to write workspace-level planning content
- **AND** those templates SHALL avoid instructing agents to create repo-local implementation artifacts
- **AND** specs instructions SHALL support organizing area-specific requirements under workspace-scoped `specs/` paths

#### Scenario: Workspace nested spec paths stay workspace-scoped
- **GIVEN** a workspace change has spec files under `specs/<area-or-repo>/<capability>/spec.md`
- **WHEN** OpenSpec reports status or artifact instructions for the workspace change
- **THEN** it SHALL preserve the concrete nested workspace spec paths
- **AND** it SHALL not treat those files as repo-local specs to sync or archive without an explicit affected-area implementation context

#### Scenario: Workspace planning apply readiness
- **WHEN** the `workspace-planning` schema defines apply readiness
- **THEN** it SHALL require coordination tasks before implementation begins
- **AND** the apply guidance SHALL direct agents to select an affected area before making implementation edits
