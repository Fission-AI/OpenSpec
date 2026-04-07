## ADDED Requirements

### Requirement: Propose skill accepts explicit exploration doc path
The propose skill SHALL accept an `--exploration <path>` parameter in the command argument string. When present, the skill SHALL read the file at that path directly and use it as exploration context, skipping the `openspec/explorations/` directory scan entirely.

#### Scenario: User provides explicit exploration path
- **WHEN** user invokes `/enpalspec:propose my-change --exploration openspec/explorations/explore-workflow-ux.md`
- **THEN** the skill reads `openspec/explorations/explore-workflow-ux.md` directly
- **AND** states: "Using `openspec/explorations/explore-workflow-ux.md` as exploration context (provided explicitly)"
- **AND** skips the directory scan step
- **AND** proceeds to seed artifacts from that doc

#### Scenario: Exploration path provided as absolute path
- **WHEN** user passes an absolute path via `--exploration`
- **THEN** the skill reads that path as-is without modification

#### Scenario: Exploration file not found at provided path
- **WHEN** user passes `--exploration path/to/missing.md`
- **AND** the file does not exist
- **THEN** the skill reports: "Could not read exploration doc at `path/to/missing.md`. Check the path and retry."
- **AND** exits without creating any artifacts

#### Scenario: Parameter parsing with quoted path containing spaces
- **WHEN** user passes `--exploration "openspec/explorations/my topic.md"`
- **THEN** the skill treats the quoted string as the full path value
