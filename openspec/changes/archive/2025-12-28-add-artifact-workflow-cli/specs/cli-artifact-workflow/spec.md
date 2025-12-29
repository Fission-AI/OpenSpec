# cli-artifact-workflow Specification

## Purpose
CLI commands for artifact workflow operations, exposing the artifact graph and instruction loader functionality to users and agents. Commands are top-level for fluid UX and implemented in isolation for easy removal.

## ADDED Requirements

### Requirement: Status Command
The system SHALL display artifact completion status for a change.

#### Scenario: Show status with all states
- **WHEN** user runs `openspec status --change <id>`
- **THEN** the system displays each artifact with status indicator:
  - `[x]` for completed artifacts
  - `[ ]` for ready artifacts
  - `[-]` for blocked artifacts (with missing dependencies listed)

#### Scenario: Status shows completion summary
- **WHEN** user runs `openspec status --change <id>`
- **THEN** output includes completion percentage and count (e.g., "2/4 artifacts complete")

#### Scenario: Status JSON output
- **WHEN** user runs `openspec status --change <id> --json`
- **THEN** the system outputs JSON with changeName, schemaName, isComplete, and artifacts array

#### Scenario: Missing change parameter
- **WHEN** user runs `openspec status` without `--change`
- **THEN** the system displays an error with list of available changes

#### Scenario: Unknown change
- **WHEN** user runs `openspec status --change unknown-id`
- **THEN** the system displays an error indicating the change does not exist

### Requirement: Next Command
The system SHALL show which artifacts are ready to be created.

#### Scenario: Show ready artifacts
- **WHEN** user runs `openspec next --change <id>`
- **THEN** the system lists artifacts whose dependencies are all satisfied

#### Scenario: No artifacts ready
- **WHEN** all artifacts are either completed or blocked
- **THEN** the system indicates no artifacts are ready (with explanation)

#### Scenario: All artifacts complete
- **WHEN** all artifacts in the change are completed
- **THEN** the system indicates the change is complete

#### Scenario: Next JSON output
- **WHEN** user runs `openspec next --change <id> --json`
- **THEN** the system outputs JSON array of ready artifact IDs

### Requirement: Instructions Command
The system SHALL output enriched instructions for creating an artifact.

#### Scenario: Show enriched instructions
- **WHEN** user runs `openspec instructions <artifact> --change <id>`
- **THEN** the system outputs:
  - Artifact metadata (ID, output path, description)
  - Template content
  - Dependency status (done/missing)
  - Unlocked artifacts (what becomes available after completion)

#### Scenario: Instructions JSON output
- **WHEN** user runs `openspec instructions <artifact> --change <id> --json`
- **THEN** the system outputs JSON matching ArtifactInstructions interface

#### Scenario: Unknown artifact
- **WHEN** user runs `openspec instructions unknown-artifact --change <id>`
- **THEN** the system displays an error listing valid artifact IDs for the schema

#### Scenario: Artifact with unmet dependencies
- **WHEN** user requests instructions for a blocked artifact
- **THEN** the system displays instructions with a warning about missing dependencies

### Requirement: Templates Command
The system SHALL show resolved template paths for all artifacts in a schema.

#### Scenario: List template paths with default schema
- **WHEN** user runs `openspec templates`
- **THEN** the system displays each artifact with its resolved template path using the default schema

#### Scenario: List template paths with custom schema
- **WHEN** user runs `openspec templates --schema tdd`
- **THEN** the system displays template paths for the specified schema

#### Scenario: Templates JSON output
- **WHEN** user runs `openspec templates --json`
- **THEN** the system outputs JSON mapping artifact IDs to template paths

#### Scenario: Template resolution source
- **WHEN** displaying template paths
- **THEN** the system indicates whether each template is from user override or package built-in

### Requirement: New Change Command
The system SHALL create new change directories with validation.

#### Scenario: Create valid change
- **WHEN** user runs `openspec new change add-feature`
- **THEN** the system creates `openspec/changes/add-feature/` directory

#### Scenario: Invalid change name
- **WHEN** user runs `openspec new change "Add Feature"` with invalid name
- **THEN** the system displays validation error with guidance

#### Scenario: Duplicate change name
- **WHEN** user runs `openspec new change existing-change` for an existing change
- **THEN** the system displays an error indicating the change already exists

#### Scenario: Create with description
- **WHEN** user runs `openspec new change add-feature --description "Add new feature"`
- **THEN** the system creates the change directory with description in README.md

### Requirement: Schema Selection
The system SHALL support custom schema selection for workflow commands.

#### Scenario: Default schema
- **WHEN** user runs workflow commands without `--schema`
- **THEN** the system uses the "spec-driven" schema

#### Scenario: Custom schema
- **WHEN** user runs `openspec status --change <id> --schema tdd`
- **THEN** the system uses the specified schema for artifact graph

#### Scenario: Unknown schema
- **WHEN** user specifies an unknown schema
- **THEN** the system displays an error listing available schemas

### Requirement: Output Formatting
The system SHALL provide consistent output formatting.

#### Scenario: Color output
- **WHEN** terminal supports colors
- **THEN** status indicators use colors: green (done), yellow (ready), red (blocked)

#### Scenario: No color output
- **WHEN** `--no-color` flag is used or NO_COLOR environment variable is set
- **THEN** output uses text-only indicators without ANSI colors

#### Scenario: Progress indication
- **WHEN** loading change state takes time
- **THEN** the system displays a spinner during loading

### Requirement: Experimental Isolation
The system SHALL implement artifact workflow commands in isolation for easy removal.

#### Scenario: Single file implementation
- **WHEN** artifact workflow feature is implemented
- **THEN** all commands are in `src/commands/artifact-workflow.ts`

#### Scenario: Help text marking
- **WHEN** user runs `--help` on any artifact workflow command
- **THEN** help text indicates the command is experimental
