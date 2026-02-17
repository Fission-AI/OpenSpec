## ADDED Requirements

### Requirement: Schema which shows resolution result
The CLI SHALL provide an `openspec schema which <name>` command that displays where a schema resolves from.

#### Scenario: Schema resolves from project
- **WHEN** user runs `openspec schema which my-workflow` and schema exists in `openspec/schemas/my-workflow/`
- **THEN** system displays source as "project"
- **AND** displays full path to schema directory

#### Scenario: Schema resolves from user directory
- **WHEN** user runs `openspec schema which my-workflow` and schema exists only in user data directory
- **THEN** system displays source as "user"
- **AND** displays full path including XDG data directory

#### Scenario: Schema resolves from package
- **WHEN** user runs `openspec schema which spec-driven` and no override exists
- **THEN** system displays source as "package"
- **AND** displays full path to package's schemas directory

#### Scenario: Schema not found
- **WHEN** user runs `openspec schema which nonexistent`
- **THEN** system displays error that schema was not found
- **AND** lists available schemas
- **AND** exits with non-zero code

### Requirement: Schema which shows shadowing information
The CLI SHALL indicate when a schema shadows another schema at a lower priority level.

#### Scenario: Project schema shadows package
- **WHEN** user runs `openspec schema which spec-driven` and both project and package have `spec-driven`
- **THEN** system displays that project schema is active
- **AND** indicates it shadows the package version
- **AND** shows path to shadowed package schema

#### Scenario: No shadowing
- **WHEN** schema exists only in one location
- **THEN** system does not display shadowing information

#### Scenario: Multiple shadows
- **WHEN** project schema shadows both user and package schemas
- **THEN** system lists all shadowed locations in priority order

### Requirement: Schema which outputs JSON format
The CLI SHALL support `--json` flag for machine-readable output.

#### Scenario: JSON output basic
- **WHEN** user runs `openspec schema which spec-driven --json`
- **THEN** system outputs JSON with `name`, `source`, and `path` fields

#### Scenario: JSON output with shadows
- **WHEN** user runs `openspec schema which spec-driven --json` and schema has shadows
- **THEN** JSON includes `shadows` array with `source` and `path` for each shadowed schema

### Requirement: Schema which supports list mode
The CLI SHALL support listing all schemas with their resolution sources.

#### Scenario: List all schemas
- **WHEN** user runs `openspec schema which --all`
- **THEN** system displays all available schemas grouped by source
- **AND** indicates which schemas shadow others

#### Scenario: List in JSON format
- **WHEN** user runs `openspec schema which --all --json`
- **THEN** system outputs JSON array with resolution info for each schema
