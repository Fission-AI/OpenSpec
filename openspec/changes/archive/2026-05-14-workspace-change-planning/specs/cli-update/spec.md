## ADDED Requirements

### Requirement: Repo update redirects from workspace planning homes
The repo-local `pastelsdd update` command SHALL not silently treat a workspace planning home as a repo-local Pastelsdd project.

#### Scenario: Running update from a workspace root
- **GIVEN** the command runs from an Pastelsdd workspace root
- **WHEN** the user runs `pastelsdd update`
- **THEN** Pastelsdd SHALL not generate repo-local project files in the workspace root
- **AND** it SHALL tell the user to run `pastelsdd workspace update`

#### Scenario: Running update from inside a workspace planning directory
- **GIVEN** the command runs from a subdirectory of an Pastelsdd workspace planning home
- **WHEN** the user runs `pastelsdd update`
- **THEN** Pastelsdd SHALL not run repo-local update behavior
- **AND** it SHALL tell the user to run `pastelsdd workspace update`

#### Scenario: Running update from a repo-local project
- **GIVEN** the command runs from inside a repo-local Pastelsdd project
- **WHEN** the user runs `pastelsdd update`
- **THEN** Pastelsdd SHALL preserve existing repo-local update behavior
