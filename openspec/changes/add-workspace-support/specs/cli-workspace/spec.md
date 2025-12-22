## ADDED Requirements

### Requirement: Workspace Configuration Schema
The system SHALL support a `workspace.yaml` configuration file that defines multi-repository workspace structure and conventions.

#### Scenario: Valid workspace configuration
- **WHEN** `openspec/workspace.yaml` exists with valid content
- **THEN** parse and validate the following required fields:
  - `name`: string identifying the workspace
  - `repos`: array of repository definitions with `name` (string) and `path` (string, relative to workspace root)
- **AND** accept optional fields:
  - `repos[].role`: string hint (e.g., "api", "client", "shared")
  - `conventions.crossRepoChanges.requireImpactSection`: boolean
  - `conventions.crossRepoChanges.requireImplementationOrder`: boolean

#### Scenario: Invalid workspace configuration
- **WHEN** `workspace.yaml` has invalid schema (missing required fields, wrong types)
- **THEN** report validation error with specific field and expected type
- **AND** exit with non-zero status code

### Requirement: Workspace Initialization
The `openspec init --workspace` command SHALL create a workspace structure for coordinating multiple repositories.

#### Scenario: Initializing new workspace
- **WHEN** `openspec init --workspace` is executed in a directory without existing `openspec/`
- **THEN** prompt for workspace name
- **AND** auto-discover child directories containing `.git` or `package.json`
- **AND** present multi-select for repo inclusion
- **AND** optionally prompt for repo roles
- **AND** create `openspec/` directory structure
- **AND** generate `openspec/workspace.yaml` with selected repos
- **AND** generate workspace-aware `AGENTS.md` with cross-repo coordination guidance

#### Scenario: Discovering child repositories
- **WHEN** scanning for repositories during workspace init
- **THEN** identify directories containing `.git` directory or `package.json` file
- **AND** exclude common non-repo directories (node_modules, .git, dist, build)
- **AND** present discovered repos with relative paths for user selection

#### Scenario: Workspace init with existing openspec
- **WHEN** `openspec init --workspace` is executed in directory with existing `openspec/`
- **THEN** detect existing structure and offer to extend with workspace.yaml
- **AND** preserve existing specs, changes, and configurations
- **AND** add workspace.yaml if not present

### Requirement: Workspace Validation
The `openspec validate --workspace` command SHALL aggregate validation across all workspace repositories and enforce cross-repo conventions.

#### Scenario: Validating workspace structure
- **WHEN** `openspec validate --workspace` is executed
- **THEN** load and validate `openspec/workspace.yaml` schema
- **AND** verify each repo path in workspace.yaml exists
- **AND** warn if repo lacks `openspec/` directory (not initialized)

#### Scenario: Aggregating repo validations
- **WHEN** running workspace validation
- **THEN** execute standard validation for each repo's `openspec/` directory
- **AND** collect results per repo
- **AND** display summary with per-repo status and issue counts
- **AND** exit with non-zero code if any repo has errors

#### Scenario: Displaying workspace validation results
- **WHEN** workspace validation completes
- **THEN** format output with workspace header showing repo count
- **AND** display each repo's validation status with indentation
- **AND** show cross-repo change validation results separately
- **AND** provide summary counts (repos validated, errors, warnings)

### Requirement: Cross-Repo Change Detection
The validation system SHALL identify changes that affect multiple repositories based on Impact section content.

#### Scenario: Detecting cross-repo changes
- **WHEN** validating changes in workspace root `openspec/changes/`
- **THEN** parse `proposal.md` for `## Impact` section
- **AND** extract repo names from `Affected repos:` list
- **AND** classify change as cross-repo if it references more than one repo from workspace.yaml

#### Scenario: Single-repo change in workspace
- **WHEN** a change's Impact section references only one repo (or no repos)
- **THEN** treat as standard single-repo change
- **AND** skip cross-repo validation rules

### Requirement: Impact Section Validation
The validation system SHALL enforce Impact section requirements for cross-repo changes.

#### Scenario: Missing Impact section in cross-repo change
- **WHEN** a change references multiple repos but lacks `## Impact` section
- **THEN** report ERROR: "Cross-repo change must include ## Impact section"
- **AND** include guidance on required Impact format

#### Scenario: Valid Impact section format
- **WHEN** Impact section contains `Affected repos:` with repo list
- **THEN** validate each repo name exists in workspace.yaml
- **AND** accept nested paths under each repo (e.g., `backend: api/, models/`)

#### Scenario: Unknown repo in Impact section
- **WHEN** Impact section references repo name not in workspace.yaml
- **THEN** report WARNING: "Unknown repo 'name' referenced in Impact section"
- **AND** suggest checking workspace.yaml for typos or adding the repo

#### Scenario: Missing implementation order
- **WHEN** cross-repo change lacks `Implementation order:` in Impact section
- **AND** workspace conventions require implementation order
- **THEN** report WARNING: "Cross-repo change should specify implementation order"
- **AND** provide example format: "Implementation order: backend first, then mobile"

### Requirement: Workspace-Aware Templates
The template system SHALL include workspace-specific guidance in generated files.

#### Scenario: Generating workspace AGENTS.md
- **WHEN** initializing workspace or updating templates
- **THEN** include workspace section in AGENTS.md explaining:
  - How to create cross-repo changes with Impact section
  - How to validate workspace with `openspec validate --workspace`
  - Convention for implementation ordering

#### Scenario: Generating workspace project.md
- **WHEN** initializing workspace
- **THEN** include cross-repo conventions section in project.md template
- **AND** list workspace repos with their roles
- **AND** document workspace-specific conventions
