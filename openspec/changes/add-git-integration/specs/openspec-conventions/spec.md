# Delta for OpenSpec Conventions

## ADDED Requirements

### Requirement: Git Integration Workflow
OpenSpec SHALL support Git-integrated spec-driven development workflow with two-phase branching.

#### Scenario: Two-phase branching workflow
- **WHEN** developer follows OpenSpec Git-integrated workflow
- **THEN** Phase 1 SHALL use `spec/<change-id>` branch for proposal creation and review
- **AND** Phase 1 spec branch SHALL be created from default branch
- **AND** Phase 2 SHALL use `feature/<change-id>` branch for implementation
- **AND** Phase 2 feature branch SHALL be created from default branch after specs are merged
- **AND** archive commit SHALL be part of feature branch before merge
- **AND** single merge to default branch SHALL include implementation code, archive changes, and updated specs

#### Scenario: Default branch detection
- **WHEN** Git integration initializes
- **THEN** system SHALL attempt to detect default branch from `git symbolic-ref refs/remotes/origin/HEAD`
- **AND** if detection fails, SHALL try `git config init.defaultBranch`
- **AND** if both methods fail, SHALL fallback to "main"

#### Scenario: Branch naming convention
- **WHEN** Git integration creates branches
- **THEN** spec branches SHALL use naming pattern `spec/<change-id>`
- **AND** feature branches SHALL use naming pattern `feature/<change-id>`
- **AND** change-id SHALL be in kebab-case format
- **AND** change-id SHALL be unique within the repository

#### Scenario: Parallel changes
- **WHEN** multiple changes are being developed simultaneously
- **THEN** each change SHALL have its own independent `spec/<change-id>` branch
- **AND** each change SHALL have its own independent `feature/<change-id>` branch
- **AND** developers SHALL manage sequential dependencies manually

#### Scenario: Graceful degradation
- **WHEN** OpenSpec commands are run in non-Git repository
- **THEN** all OpenSpec functionality SHALL work without Git integration
- **AND** informational message SHALL notify user of non-Git environment
- **AND** no errors SHALL be raised due to missing Git

### Requirement: Git Integration Configuration
OpenSpec SHALL provide configuration options for Git integration behavior.

#### Scenario: Disabling Git integration via flag
- **WHEN** user runs any OpenSpec command with `--no-git` flag
- **THEN** no Git operations SHALL be performed for that command
- **AND** all other OpenSpec functionality SHALL work normally
- **AND** command behavior SHALL be identical to non-Git environment

#### Scenario: Git integration documentation
- **WHEN** OpenSpec is initialized in a project with `openspec init`
- **THEN** generated `openspec/AGENTS.md` SHALL include Git workflow documentation
- **AND** documentation SHALL explain two-phase branching
- **AND** documentation SHALL provide examples of complete workflow
- **AND** documentation SHALL explain how to disable Git integration

## MODIFIED Requirements

### Requirement: Change Proposal Creation
The system SHALL scaffold change proposals in `openspec/changes/<change-id>/` directory with optional Git integration.

#### Scenario: Proposal creation in non-Git environment
- **WHEN** user creates a change proposal outside Git repository
- **THEN** directory structure SHALL be created under `openspec/changes/<change-id>/`
- **AND** proposal.md, tasks.md, and spec deltas SHALL be scaffolded
- **AND** no Git operations SHALL be attempted

#### Scenario: Proposal creation in Git repository
- **WHEN** user creates a change proposal in a Git repository
- **THEN** directory structure SHALL be created under `openspec/changes/<change-id>/`
- **AND** proposal.md, tasks.md, and spec deltas SHALL be scaffolded
- **AND** `spec/<change-id>` branch SHALL be created automatically
- **AND** proposal files SHALL be committed with message "spec: <change-title> proposal"
- **AND** user SHALL be guided to validate, push, and create PR for spec review
