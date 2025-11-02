# Delta for CLI Apply Command

## ADDED Requirements

### Requirement: Git Branch Creation for Implementation
The `openspec apply` command SHALL create a feature branch for implementation when executed in a Git repository.

#### Scenario: Starting implementation in Git repository
- **WHEN** user runs `openspec apply <change-id>` in a Git repository
- **THEN** a branch named `feature/<change-id>` SHALL be created from current branch
- **AND** system SHALL display detected default branch
- **AND** system SHALL verify current branch matches default branch
- **AND** tasks from `openspec/changes/<change-id>/tasks.md` SHALL be displayed
- **AND** guidance message SHALL include next steps for implementation

#### Scenario: Not on default branch
- **WHEN** user runs `openspec apply` and current branch is not the default branch
- **THEN** system SHALL display warning "You're on branch '<current>', not '<default>'"
- **AND** system SHALL display recommendation to start from default branch
- **AND** system SHALL prompt "Continue anyway?" with default answer "no"
- **AND** if user declines, system SHALL exit with suggestion to checkout default branch
- **AND** if user confirms, feature branch SHALL be created from current branch

#### Scenario: Branch already exists
- **WHEN** user runs `openspec apply` and `feature/<change-id>` branch already exists
- **THEN** system SHALL prompt user with options: continue on existing, rename change-id, or proceed without Git
- **AND** user choice SHALL be respected
- **AND** if user chooses "continue", system SHALL checkout existing branch

#### Scenario: Change not found
- **WHEN** user runs `openspec apply <change-id>` and change does not exist in `openspec/changes/`
- **THEN** system SHALL display error "Change <change-id> not found in openspec/changes/"
- **AND** system SHALL exit with error code 1

#### Scenario: Using --no-git flag
- **WHEN** user runs `openspec apply <change-id> --no-git`
- **THEN** no Git operations SHALL be performed
- **AND** tasks SHALL be displayed normally
- **AND** no branch validation or creation SHALL happen
