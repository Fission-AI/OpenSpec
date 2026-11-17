## ADDED Requirements

### Requirement: Choose whether to keep skills in the repository

Interactive update in a project with repo-owned skills and no recorded choice SHALL offer **Keep in this project** as the default and **Switch to global** as the alternative.

#### Scenario: Keep team skills

- **WHEN** the developer presses Enter
- **THEN** update SHALL refresh the profile’s skills in the repository and record the choice as `skillsScope: project` in `openspec/config.yaml`
- **AND** after the choice is committed, interactive updates in any checkout SHALL skip the migration prompt
- **AND** `openspec init --scope global` SHALL still allow an explicit switch

#### Scenario: Move team skills

- **WHEN** the developer switches to global
- **THEN** update SHALL finish installing the requested skills before removing the repo copies
- **AND** it SHALL tell the developer to commit the removals and teammates to run update after pulling

#### Scenario: Fresh teammate checkout

- **WHEN** a teammate without global skills runs interactive update after pulling the removals
- **THEN** they SHALL be able to select their own tools or skip setup
- **AND** ordinary CLI commands and validation SHALL work without that setup

### Requirement: Preserve hosted Copilot until the switch succeeds

OpenSpec SHALL finish and verify the requested global installation before applying the hosted Copilot opt-out.

#### Scenario: Incomplete install

- **WHEN** any requested global skill fails or is skipped
- **THEN** the project skills, Copilot files and cloud setting SHALL remain intact

#### Scenario: Second cloud deletion fails

- **WHEN** the second managed Copilot file cannot be removed
- **THEN** OpenSpec SHALL restore the first and keep the project skills and cloud setting for a retry

### Requirement: Keep installed workflows synchronized with the running CLI

Update SHALL install the selected workflows, replace changes to built-in skills and remove excluded built-ins. It SHALL preserve separately named skills, project configuration and specifications.

#### Scenario: Downgrade or upgrade

- **WHEN** the user runs an older or newer CLI on an existing managed installation
- **THEN** its selected tools SHALL see the same skill names and instructions as a fresh install of that CLI
- **AND** the next update SHALL leave current skills untouched

#### Scenario: Local project history

- **WHEN** init or update visits a project
- **THEN** the CLI SHALL remember its path locally without listing other repositories for migration
