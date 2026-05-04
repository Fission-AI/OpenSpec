## ADDED Requirements

### Requirement: Workspace Product Language
OpenSpec conventions SHALL describe coordination workspaces in user-facing product terms.

#### Scenario: Describing workspace structure
- **WHEN** OpenSpec documentation describes workspace support
- **THEN** it SHALL present a workspace as the planning home for work across linked repos or folders
- **AND** it SHALL describe `changes/` as the workspace planning area

#### Scenario: Avoiding internal workspace vocabulary
- **WHEN** OpenSpec documentation explains what a workspace includes
- **THEN** it SHALL prefer plain product language such as "repos or folders"
- **AND** it SHALL avoid user-facing reliance on terms such as "working set", "code area", "entry", "alias", or "local overlay"

#### Scenario: Distinguishing workspaces from changes
- **WHEN** OpenSpec documentation explains workspace planning
- **THEN** it SHALL describe a workspace as a durable planning home
- **AND** it SHALL describe individual features, fixes, and projects as changes inside the workspace

#### Scenario: Distinguishing workspace and repo-local surfaces
- **WHEN** OpenSpec documentation compares workspace and repo-local flows
- **THEN** it SHALL explain that workspace planning lives in the workspace root
- **AND** it SHALL explain that repo-local specs and changes continue to live under each repo's `openspec/` directory

#### Scenario: Sequencing the workspace roadmap
- **WHEN** workspace reimplementation work is split across multiple active changes
- **THEN** conventions SHALL allow those changes to remain flat siblings under `openspec/changes/`
- **AND** dependency order MAY be documented in proposal prose until formal change stacking metadata is available
