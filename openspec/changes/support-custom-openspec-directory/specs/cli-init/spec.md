## ADDED Requirements

### Requirement: Init separates workspace and planning destinations

`openspec init [path]` SHALL treat its path argument as the workspace root and, when `OPENSPEC_DIR` is set, create the complete OpenSpec structure at the selected directory while keeping workspace-scoped integrations at the workspace root.

#### Scenario: Initialize a custom relative directory

- **GIVEN** the user runs `openspec init .` with `OPENSPEC_DIR=ai/openspec`
- **WHEN** initialization completes
- **THEN** config, specs, changes, archive, and OpenSpec-owned instructions SHALL be created under `ai/openspec`
- **AND** selected project-local AI tool files SHALL be created under the workspace root
- **AND** no default root-level `openspec/` directory SHALL be created

#### Scenario: Custom directory already exists

- **GIVEN** `OPENSPEC_DIR` selects an existing valid OpenSpec directory
- **WHEN** the user runs `openspec init` to add or refresh tools
- **THEN** init SHALL enter its existing extend behavior for that directory
- **AND** it SHALL keep project-local tool discovery and generation anchored to the workspace root

#### Scenario: Invalid custom destination

- **GIVEN** `OPENSPEC_DIR` resolves to a file or selects an unsafe filesystem root
- **WHEN** the user runs `openspec init`
- **THEN** init SHALL fail before creating planning or tool files
