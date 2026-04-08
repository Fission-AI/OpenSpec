# enpal-spec-driven-schema Specification

## Purpose
Define the project-local `enpal-spec-driven` schema that forks the upstream `spec-driven` schema with Enpal-specific exploration conventions.

## Requirements

### Requirement: enpal-spec-driven schema exists in project
The system SHALL provide a project-local schema named `enpal-spec-driven` at `schemas/enpal-spec-driven/` containing a `schema.yaml` and `templates/` directory forked from `spec-driven`.

#### Scenario: Schema is listed
- **WHEN** user runs `openspec schemas`
- **THEN** `enpal-spec-driven` appears in the list with a description

#### Scenario: Schema resolves locally
- **WHEN** user runs `openspec schema which enpal-spec-driven`
- **THEN** the output shows `source: project` and path `schemas/enpal-spec-driven/`

### Requirement: enpal-spec-driven artifacts match spec-driven
The `enpal-spec-driven` schema SHALL define the same artifact sequence as `spec-driven`: proposal → specs → design → tasks, with the same `apply.requires` and `apply.tracks` configuration.

#### Scenario: Status output matches spec-driven structure
- **WHEN** a change is created with schema `enpal-spec-driven`
- **AND** user runs `openspec status --change <name> --json`
- **THEN** the `artifacts` array contains `proposal`, `specs`, `design`, `tasks` in dependency order

### Requirement: enpal-spec-driven proposal instruction references exploration convention
The proposal artifact instruction in `enpal-spec-driven` schema SHALL include guidance that the agent should check for and incorporate a relevant exploration document from `openspec/explorations/` when writing the proposal.

#### Scenario: Proposal instruction mentions explorations
- **WHEN** user runs `openspec instructions proposal --change <name>` on a change using `enpal-spec-driven`
- **THEN** the instruction text references the exploration document convention
- **AND** instructs the agent to read a matching exploration doc if one exists
