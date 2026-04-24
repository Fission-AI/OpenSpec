# instruction-loader Specification — Delta

## MODIFIED Requirements

### Requirement: Change Context Loading

The system SHALL load change context combining graph and completion state, with awareness of module-qualified spec paths in delta specs.

#### Scenario: Load context for existing change

- **WHEN** `loadChangeContext(projectRoot, changeName)` is called for an existing change
- **THEN** the system returns a context with graph, completed set, schema name, and change info

#### Scenario: Load context for change with module-qualified delta specs

- **WHEN** `loadChangeContext` is called for a change whose `specs/` directory contains module-prefixed paths
- **THEN** the system resolves module names against the module registry
- **AND** includes the resolved module locations in the context for downstream use

#### Scenario: Load context with custom schema

- **WHEN** `loadChangeContext(projectRoot, changeName, schemaName)` is called
- **THEN** the system uses the specified schema instead of default

#### Scenario: Load context for non-existent change directory

- **WHEN** `loadChangeContext` is called for a non-existent change directory
- **THEN** the system returns context with empty completed set

### Requirement: Template Enrichment

The system SHALL enrich templates with change-specific context, including module information when in multi-module mode.

#### Scenario: Include artifact metadata

- **WHEN** instructions are generated for an artifact
- **THEN** the output includes change name, artifact ID, schema name, and output path

#### Scenario: Include module registry in metadata

- **WHEN** instructions are generated for a change in multi-module mode
- **THEN** the output includes the list of available modules and their resolved locations
- **AND** this allows downstream consumers (agents, skills) to understand the module topology

#### Scenario: Include dependency status

- **WHEN** an artifact has dependencies
- **THEN** the output shows each dependency with completion status (done/missing)

#### Scenario: Include unlocked artifacts

- **WHEN** instructions are generated
- **THEN** the output includes which artifacts become available after this one
