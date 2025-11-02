# Delta for CLI Archive Command

## ADDED Requirements

### Requirement: Git Commit for Archive
The `openspec archive` command SHALL commit archive changes automatically when executed in a Git repository.

#### Scenario: Archiving with Git integration
- **WHEN** user runs `openspec archive <change-id>` in a Git repository
- **THEN** system SHALL verify current branch is `feature/<change-id>`
- **AND** system SHALL check for uncommitted changes in working directory
- **AND** if no uncommitted changes, archive operations SHALL be performed
- **AND** archive changes SHALL be staged with `git add openspec/`
- **AND** commit SHALL be created with message "chore: archive <change-id> change and update specs"
- **AND** success message SHALL display commit confirmation
- **AND** next steps SHALL be displayed (push, merge PR)

#### Scenario: Wrong branch during archive
- **WHEN** user runs `openspec archive` and current branch is not `feature/<change-id>`
- **THEN** system SHALL display warning "Expected to be on 'feature/<change-id>', but on '<current>'"
- **AND** system SHALL prompt "Continue archiving anyway?" with default answer "no"
- **AND** if user declines, system SHALL exit without archiving
- **AND** if user confirms, archive SHALL proceed with commit on current branch

#### Scenario: Uncommitted changes exist
- **WHEN** user runs `openspec archive` with uncommitted changes in working directory
- **THEN** system SHALL display error "You have uncommitted changes:"
- **AND** system SHALL list modified files
- **AND** system SHALL display suggested action to commit or stash changes first
- **AND** system SHALL exit with error code 1 without performing archive

#### Scenario: Git commit succeeds
- **WHEN** archive commit is created successfully
- **THEN** system SHALL display "✓ Committed: 'chore: archive <change-id> change and update specs'"
- **AND** system SHALL display next steps:
  - "1. Push: git push"
  - "2. Merge PR to main (implementation + archive + updated specs)"

#### Scenario: Using --no-git flag
- **WHEN** user runs `openspec archive <change-id> --no-git`
- **THEN** archive operations SHALL be performed normally
- **AND** no Git commit SHALL be created
- **AND** no branch validation SHALL occur
- **AND** success message SHALL not include Git-specific next steps
