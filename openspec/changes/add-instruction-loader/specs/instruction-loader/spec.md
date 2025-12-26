## ADDED Requirements

### Requirement: Template Loading
The system SHALL load templates from schema directories.

#### Scenario: Template loaded from schema directory
- **WHEN** `loadTemplate(schemaName, templatePath)` is called
- **THEN** the system loads the template from `schemas/<schemaName>/templates/<templatePath>`

#### Scenario: Template not found
- **WHEN** a template file does not exist in the schema's templates directory
- **THEN** the system throws an error with the template path

### Requirement: Change Context Loading
The system SHALL load change context combining graph and completion state.

#### Scenario: Load context for existing change
- **WHEN** `loadChangeContext(projectRoot, changeName)` is called for an existing change
- **THEN** the system returns a context with graph, completed set, schema name, and change info

#### Scenario: Load context with custom schema
- **WHEN** `loadChangeContext(projectRoot, changeName, schemaName)` is called
- **THEN** the system uses the specified schema instead of default

#### Scenario: Load context for missing change
- **WHEN** `loadChangeContext` is called for a non-existent change directory
- **THEN** the system returns context with empty completed set

### Requirement: Instruction Enrichment
The system SHALL enrich templates with change-specific context.

#### Scenario: Header with change info
- **WHEN** instructions are generated for an artifact
- **THEN** the output includes change name, artifact ID, schema name, and output path

#### Scenario: Dependency status shown
- **WHEN** an artifact has dependencies
- **THEN** the output shows each dependency with completion status (done/missing)

#### Scenario: Next steps shown
- **WHEN** instructions are generated
- **THEN** the output includes which artifacts become available after this one

#### Scenario: Root artifact dependencies
- **WHEN** an artifact has no dependencies
- **THEN** the dependency section indicates this is a root artifact

### Requirement: Status Formatting
The system SHALL format change status as readable output.

#### Scenario: Format complete change
- **WHEN** all artifacts are completed
- **THEN** status shows all artifacts as "done"

#### Scenario: Format partial change
- **WHEN** some artifacts are completed
- **THEN** status shows completed as "done", ready as "ready", blocked as "blocked"

#### Scenario: Show blocked dependencies
- **WHEN** an artifact is blocked
- **THEN** status shows which dependencies are missing

#### Scenario: Show output paths
- **WHEN** status is formatted
- **THEN** each artifact shows its output path pattern
