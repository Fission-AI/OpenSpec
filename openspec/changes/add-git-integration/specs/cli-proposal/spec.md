# Delta for CLI Proposal Command

## ADDED Requirements

### Requirement: Git Branch Creation for Proposals
The `openspec proposal` command SHALL create a spec branch for proposal review when executed in a Git repository.

#### Scenario: Proposal in Git repository
- **WHEN** user runs `openspec proposal <change-id>` in a Git repository
- **THEN** a branch named `spec/<change-id>` SHALL be created from the default branch
- **AND** proposal files SHALL be scaffolded in `openspec/changes/<change-id>/`
- **AND** proposal files SHALL be committed automatically with message "spec: <change-title> proposal"
- **AND** success message SHALL include next steps for validation, pushing, and creating PR

#### Scenario: Default branch detection
- **WHEN** system creates spec branch
- **THEN** default branch SHALL be detected from `git symbolic-ref refs/remotes/origin/HEAD`
- **AND** if detection fails, SHALL try `git config init.defaultBranch`
- **AND** if both fail, SHALL fallback to "main"

#### Scenario: Branch already exists
- **WHEN** user runs `openspec proposal` and `spec/<change-id>` branch already exists
- **THEN** system SHALL prompt user with options: continue on existing, rename change-id, delete and recreate, or proceed without Git
- **AND** user choice SHALL be respected
- **AND** if user chooses "continue", system SHALL checkout existing branch

#### Scenario: Not a Git repository
- **WHEN** user runs `openspec proposal` in a non-Git directory
- **THEN** system SHALL display informational message "Not a Git repository. Proceeding without Git integration."
- **AND** proposal scaffolding SHALL continue normally
- **AND** no Git operations SHALL be attempted

#### Scenario: Git command fails
- **WHEN** any Git operation fails during proposal creation
- **THEN** system SHALL display error message with details
- **AND** system SHALL prompt to continue without Git integration
- **AND** if user confirms, proposal scaffolding SHALL continue without Git

### Requirement: Opt-out Flag for Git Integration
The `openspec proposal` command SHALL support a flag to disable Git integration.

#### Scenario: Using --no-git flag
- **WHEN** user runs `openspec proposal <change-id> --no-git`
- **THEN** no Git operations SHALL be performed
- **AND** only proposal scaffolding SHALL occur
- **AND** no branch creation or commits SHALL happen
