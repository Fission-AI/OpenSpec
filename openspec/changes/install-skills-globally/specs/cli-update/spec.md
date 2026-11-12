## ADDED Requirements

### Requirement: Update refreshes the skills installed for this machine

When the global skills are installed, `openspec update` SHALL reinstall them at the CLI's version and the current profile, with no flag. It SHALL do so from any folder, including one that is not an OpenSpec project. It SHALL remove a global skill the profile no longer includes only when OpenSpec installed it. Without the global skills, update SHALL behave as in 2.0.

#### Scenario: A project that uses the global skills

- **WHEN** the user runs `openspec update` in a project with no skills of its own
- **THEN** the global skills SHALL be refreshed
- **AND** update SHALL NOT report that no tools are configured

#### Scenario: Outside a project

- **GIVEN** the global skills are installed
- **WHEN** the user runs `openspec update` in a folder with no `openspec/`
- **THEN** the global skills SHALL be refreshed and update SHALL exit 0

#### Scenario: A project with its own skills

- **GIVEN** the global skills are installed
- **WHEN** the user runs `openspec update` in a project with its own skills
- **THEN** both SHALL be updated
- **AND** update SHALL say a tool may list each skill twice and name `openspec init --scope global`

#### Scenario: Someone else's skill with an OpenSpec name

- **GIVEN** `~/.agents/skills/openspec-verify-change` exists and OpenSpec did not install it
- **WHEN** update runs with a profile that doesn't include verify
- **THEN** that folder SHALL be left alone

#### Scenario: The project update fails

- **GIVEN** the global skills are installed
- **WHEN** `openspec update` fails to update the project's own skills
- **THEN** the global skills SHALL still be refreshed
- **AND** update SHALL exit 1

#### Scenario: Dry run

- **WHEN** the user runs `openspec update --dry-run`
- **THEN** the plan SHALL note that the global skills would be refreshed
- **AND** nothing in the home folder SHALL change
