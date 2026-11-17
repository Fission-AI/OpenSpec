## ADDED Requirements

### Requirement: Install the running CLI’s skills for the selected tools

Init SHALL install skills from the running CLI’s GitHub release tag with the package installer, the selected agent IDs, scope and workflow profile. Project installs SHALL leave any existing package lock untouched.

#### Scenario: New project

- **WHEN** a developer initializes a new project with Claude selected
- **THEN** the project SHALL contain its OpenSpec project data and Claude SHALL be able to read the profile’s skills from its global folder

#### Scenario: Team skills in Git

- **WHEN** a developer runs `openspec init --scope project --tools claude,cursor`
- **THEN** both agents SHALL be able to read the same instructions from another checkout
- **AND** the project marker SHALL retain the OpenSpec tool IDs
- **AND** no project skills lock SHALL be created

#### Scenario: Release unavailable

- **WHEN** Git is unavailable or the installer cannot fetch the matching GitHub tag
- **THEN** setup SHALL report the failure and SHALL NOT install from the default branch

#### Scenario: Registry and scope

- **WHEN** a user selects a package-supported tool, an existing OpenSpec ID or the windsurf alias
- **THEN** setup SHALL use that integration, preserving windsurf as the alias for Devin Desktop
- **AND** a previously supported tool outside the registry SHALL use the universal folder

#### Scenario: Skip tool setup

- **WHEN** the user passes `--tools none`
- **THEN** init SHALL skip skill installation

#### Scenario: Project-only agent

- **WHEN** a user requests a tool that only supports the project scope
- **THEN** init SHALL use project scope by default and explain the limitation for an explicit global request
