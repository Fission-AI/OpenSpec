## ADDED Requirements

### Requirement: Status JSON provides planning context
The status command SHALL provide machine-readable planning context for repo-local and workspace changes.

#### Scenario: Reporting planning home
- **WHEN** a user runs `openspec status --change <id> --json`
- **THEN** the output SHALL identify whether the change is repo-local or workspace-scoped
- **AND** it SHALL include the planning home root and change root

#### Scenario: Reporting concrete artifact paths
- **WHEN** a user runs `openspec status --change <id> --json`
- **THEN** the output SHALL include concrete paths for existing artifacts
- **AND** agents SHALL be able to read those paths without assuming `openspec/changes/<id>/`
- **AND** workspace-scoped nested spec paths SHALL be reported without flattening the area or capability path

#### Scenario: Reporting workspace affected areas
- **GIVEN** the change is workspace-scoped
- **WHEN** a user runs `openspec status --change <id> --json`
- **THEN** the output SHALL include known affected areas
- **AND** it SHALL indicate when affected areas remain unresolved without requiring an additional area manifest artifact

#### Scenario: Reporting next steps
- **WHEN** a user runs `openspec status --change <id> --json`
- **THEN** the output SHALL include next step guidance for agents
- **AND** the guidance SHALL use plain action language

### Requirement: Status JSON action context
The status command SHALL expose action context that lets agents act without hardcoded filesystem assumptions.

#### Scenario: Planning action context
- **WHEN** a workspace change is still in planning
- **THEN** status JSON SHALL identify the planning artifacts agents may read or update
- **AND** it SHALL indicate that linked repos and folders are context for exploration

#### Scenario: Implementation action context
- **WHEN** a workspace change has a selected affected area for implementation
- **THEN** status JSON SHALL include the allowed edit root for that area
- **AND** it SHALL avoid authorizing edits outside that selected area

#### Scenario: Repo-local action context
- **GIVEN** the change is repo-local
- **WHEN** a user runs `openspec status --change <id> --json`
- **THEN** status JSON SHALL preserve existing artifact status behavior
- **AND** it SHALL report a repo-local planning home for agents that use action context

### Requirement: Instructions use resolved planning paths
Artifact and apply instructions SHALL use resolved planning paths rather than hardcoded repo-local change paths.

#### Scenario: Workspace artifact instructions
- **GIVEN** the change is workspace-scoped
- **WHEN** a user runs `openspec instructions <artifact> --change <id> --json`
- **THEN** instruction output SHALL point to the artifact path under the workspace change root
- **AND** it SHALL not instruct the agent to write under a linked repo unless an explicit implementation context allows it

#### Scenario: Repo-local artifact instructions
- **GIVEN** the change is repo-local
- **WHEN** a user runs `openspec instructions <artifact> --change <id> --json`
- **THEN** instruction output SHALL preserve existing repo-local paths

### Requirement: Workflow skills use CLI artifact context
Generated workflow skills SHALL use OpenSpec CLI output as the source of truth for artifact locations.

#### Scenario: Skills inspect status before artifact work
- **WHEN** a generated workflow skill needs to inspect or create artifacts for a change
- **THEN** it SHALL instruct the agent to run `openspec status --change <id> --json`
- **AND** it SHALL use returned planning context and artifact paths rather than assuming a repo-local change path

#### Scenario: Skills use instructions before writing artifacts
- **WHEN** a generated workflow skill is about to create or update an artifact
- **THEN** it SHALL instruct the agent to run `openspec instructions <artifact> --change <id> --json`
- **AND** it SHALL write to the resolved artifact path returned by the command

#### Scenario: Skills avoid hardcoded repo-local paths
- **WHEN** generated workflow skills describe artifact locations
- **THEN** they SHALL avoid hardcoded examples that require changes to live under `openspec/changes/<id>/`
- **AND** any examples SHALL defer to CLI-reported paths for repo-local and workspace-scoped changes

#### Scenario: Skills guard unsupported workspace workflows
- **GIVEN** a generated workflow skill is selected by the global profile
- **AND** the workflow does not yet have full workspace-scoped behavior in this slice
- **WHEN** the skill is used for a workspace-scoped change
- **THEN** it SHALL tell the agent that the workspace action is not supported yet
- **AND** it SHALL not instruct the agent to fall back to repo-local paths or edit linked repos without an explicit allowed edit root

### Requirement: Workspace schema instructions
Workflow commands SHALL use the workspace planning schema instructions for workspace-scoped changes that use that schema.

#### Scenario: Workspace planning artifact order
- **GIVEN** a workspace-scoped change uses schema `workspace-planning`
- **WHEN** a user runs `openspec status --change <id> --json`
- **THEN** the artifact list SHALL reflect the workspace planning schema
- **AND** it SHALL include the normal proposal, specs, design, and tasks artifacts

#### Scenario: Workspace specs instructions
- **GIVEN** a workspace-scoped change uses schema `workspace-planning`
- **WHEN** a user requests instructions for the specs artifact
- **THEN** instruction output SHALL guide the agent to organize area-specific requirements under workspace-scoped `specs/` paths
- **AND** it SHALL not require all affected areas to be finalized before planning can continue
- **AND** it SHALL not instruct the agent to create repo-local spec files while the change is still in workspace planning
