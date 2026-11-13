## ADDED Requirements

### Requirement: Update separates workspace and planning destinations

`openspec update [path]` SHALL refresh OpenSpec-owned planning instructions in the environment-selected OpenSpec directory while detecting and refreshing project-local AI tool integrations at the workspace root.

#### Scenario: Update a relocated project

- **GIVEN** the workspace uses `OPENSPEC_DIR=ai/openspec`
- **WHEN** the user runs `openspec update .`
- **THEN** OpenSpec-owned files under `ai/openspec` SHALL be refreshed
- **AND** existing project-local tool files under the workspace root SHALL be refreshed
- **AND** update SHALL NOT create or refresh a default root-level `openspec/` directory

#### Scenario: Selected directory is missing

- **GIVEN** `OPENSPEC_DIR` does not resolve to an existing valid OpenSpec directory
- **WHEN** the user runs `openspec update`
- **THEN** update SHALL fail with a diagnostic naming the selected directory
- **AND** it SHALL NOT fall back to the default directory
