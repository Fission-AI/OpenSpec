# instruction-loader Specification

## Purpose
Load templates from schema directories and enrich them with change-specific context for guiding artifact creation.

## ADDED Requirements

### Requirement: Template Loading
The system SHALL load templates from schema directories.

#### Scenario: Load template from schema directory
- **WHEN** `loadTemplate(schemaName, templatePath)` is called
- **THEN** the system loads the template from `schemas/<schemaName>/templates/<templatePath>`

#### Scenario: Template file not found
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

#### Scenario: Load context for non-existent change directory
- **WHEN** `loadChangeContext` is called for a non-existent change directory
- **THEN** the system returns context with empty completed set

### Requirement: Template Enrichment
The system SHALL enrich templates with change-specific context.

#### Scenario: Include artifact metadata
- **WHEN** instructions are generated for an artifact
- **THEN** the output includes change name, artifact ID, schema name, and output path

#### Scenario: Include dependency status
- **WHEN** an artifact has dependencies
- **THEN** the output shows each dependency with completion status (done/missing)

#### Scenario: Include unlocked artifacts
- **WHEN** instructions are generated
- **THEN** the output includes which artifacts become available after this one

#### Scenario: Root artifact indicator
- **WHEN** an artifact has no dependencies
- **THEN** the dependency section indicates this is a root artifact

### Requirement: Status Formatting
The system SHALL format change status as readable output.

#### Scenario: All artifacts completed
- **WHEN** all artifacts are completed
- **THEN** status shows all artifacts as "done"

#### Scenario: Mixed completion status
- **WHEN** some artifacts are completed
- **THEN** status shows completed as "done", ready as "ready", blocked as "blocked"

#### Scenario: Blocked artifact details
- **WHEN** an artifact is blocked
- **THEN** status shows which dependencies are missing

#### Scenario: Include output paths
- **WHEN** status is formatted
- **THEN** each artifact shows its output path pattern
