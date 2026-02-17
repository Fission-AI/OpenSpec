# cli-artifact-workflow Specification

## Purpose
Define artifact workflow CLI behavior (`status`, `instructions`, `templates`, and setup flows) for scaffolded and active changes.

## Requirements
### Requirement: Status Command

The system SHALL display artifact completion status for a change, including scaffolded (empty) changes.

> **Fixes bug**: Previously required `proposal.md` to exist via `getActiveChangeIds()`.

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

#### Scenario: Status JSON includes apply requirements

- **WHEN** user runs `openspec status --change <id> --json`
- **THEN** the system outputs JSON with:
  - `changeName`, `schemaName`, `isComplete`, `artifacts` array
  - `applyRequires`: array of artifact IDs needed for apply phase

#### Scenario: Status on scaffolded change

- **WHEN** user runs `openspec status --change <id>` on a change with no artifacts
- **THEN** system displays all artifacts with their status
- **AND** root artifacts (no dependencies) show as ready `[ ]`
- **AND** dependent artifacts show as blocked `[-]`

#### Scenario: Missing change parameter

- **WHEN** user runs `openspec status` without `--change`
- **THEN** the system displays an error with list of available changes
- **AND** includes scaffolded changes (directories without proposal.md)

#### Scenario: Unknown change

- **WHEN** user runs `openspec status --change unknown-id`
- **AND** directory `openspec/changes/unknown-id/` does not exist
- **THEN** the system displays an error listing all available change directories

### Requirement: Next Artifact Discovery

The workflow SHALL use `openspec status` output to determine what can be created next, rather than a separate next-command surface.

#### Scenario: Discover next artifacts from status output

- **WHEN** a user needs to know which artifact to create next
- **THEN** `openspec status --change <id>` identifies ready artifacts with `[ ]`
- **AND** no dedicated "next command" is required to continue the workflow

### Requirement: Instructions Command

The system SHALL output enriched instructions for creating an artifact, including for scaffolded changes.

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

#### Scenario: Instructions on scaffolded change

- **WHEN** user runs `openspec instructions proposal --change <id>` on a scaffolded change
- **THEN** system outputs template and metadata for creating the proposal
- **AND** does not require any artifacts to already exist

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

### Requirement: Schema Apply Block

The system SHALL support an `apply` block in schema definitions that controls when and how implementation begins.

#### Scenario: Schema with apply block

- **WHEN** a schema defines an `apply` block
- **THEN** the system uses `apply.requires` to determine which artifacts must exist before apply
- **AND** uses `apply.tracks` to identify the file for progress tracking (or null if none)
- **AND** uses `apply.instruction` for guidance shown to the agent

#### Scenario: Schema without apply block

- **WHEN** a schema has no `apply` block
- **THEN** the system requires all artifacts to exist before apply is available
- **AND** uses default instruction: "All artifacts complete. Proceed with implementation."

### Requirement: Apply Instructions Command

The system SHALL generate schema-aware apply instructions via `openspec instructions apply`.

#### Scenario: Generate apply instructions

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** all required artifacts (per schema's `apply.requires`) exist
- **THEN** the system outputs:
  - Context files from all existing artifacts
  - Schema-specific instruction text
  - Progress tracking file path (if `apply.tracks` is set)

#### Scenario: Apply blocked by missing artifacts

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** required artifacts are missing
- **THEN** the system indicates apply is blocked
- **AND** lists which artifacts must be created first

#### Scenario: Apply instructions JSON output

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **THEN** the system outputs JSON with:
  - `contextFiles`: array of paths to existing artifacts
  - `instruction`: the apply instruction text
  - `tracks`: path to progress file or null
  - `applyRequires`: list of required artifact IDs

### Requirement: Tool selection flag

The `artifact-experimental-setup` command SHALL accept a `--tool <tool-id>` flag to specify the target AI tool.

#### Scenario: Specify tool via flag

- **WHEN** user runs `openspec artifact-experimental-setup --tool cursor`
- **THEN** skill files are generated in `.cursor/skills/`
- **AND** command files are generated using Cursor's frontmatter format

#### Scenario: Missing tool flag

- **WHEN** user runs `openspec artifact-experimental-setup` without `--tool`
- **THEN** the system displays an error requiring the `--tool` flag
- **AND** lists valid tool IDs in the error message

#### Scenario: Unknown tool ID

- **WHEN** user runs `openspec artifact-experimental-setup --tool unknown-tool`
- **AND** the tool ID is not in `AI_TOOLS`
- **THEN** the system displays an error listing valid tool IDs

#### Scenario: Tool without skillsDir

- **WHEN** user specifies a tool that has no `skillsDir` configured
- **THEN** the system displays an error indicating skill generation is not supported for that tool

#### Scenario: Tool without command adapter

- **WHEN** user specifies a tool that has `skillsDir` but no command adapter registered
- **THEN** skill files are generated successfully
- **AND** command generation is skipped with informational message

### Requirement: Output messaging

The setup command SHALL display clear output about what was generated.

#### Scenario: Show target tool in output

- **WHEN** setup command runs successfully
- **THEN** output includes the target tool name (e.g., "Setting up for Cursor...")

#### Scenario: Show generated paths

- **WHEN** setup command completes
- **THEN** output lists all generated skill file paths
- **AND** lists all generated command file paths (if applicable)

#### Scenario: Show skipped commands message

- **WHEN** command generation is skipped due to missing adapter
- **THEN** output includes message: "Command generation skipped - no adapter for <tool>"
