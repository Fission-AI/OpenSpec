# new-change-git-branch Specification

## Purpose
Define the optional `--branch` flag for `openspec new change` that creates and checks out a git branch named after the change.

## ADDED Requirements

### Requirement: Git Branch Creation Flag

The `openspec new change` command SHALL support an optional `--branch` flag that, when provided, creates and checks out a new git branch named `openspec/<change-name>` after the change directory is created.

#### Scenario: Branch created and checked out on success

- **WHEN** executing `openspec new change my-feature --branch`
- **AND** the current directory is inside a git repository
- **AND** the branch `openspec/my-feature` does not already exist
- **THEN** the system creates the change directory at `openspec/changes/my-feature/`
- **AND** creates a new git branch named `openspec/my-feature`
- **AND** checks out the new branch
- **AND** displays a success message indicating the branch was created and checked out

#### Scenario: No branch created when flag is absent

- **WHEN** executing `openspec new change my-feature` without `--branch`
- **THEN** the system creates the change directory normally
- **AND** does NOT create or checkout any git branch

#### Scenario: Error when not in a git repository

- **WHEN** executing `openspec new change my-feature --branch`
- **AND** the current directory is NOT inside a git repository
- **THEN** the change directory is still created successfully
- **AND** the system outputs a warning indicating git is not available or the directory is not a git repository
- **AND** the process exits with a non-zero exit code

#### Scenario: Error when branch already exists

- **WHEN** executing `openspec new change my-feature --branch`
- **AND** the branch `openspec/my-feature` already exists in the git repository
- **THEN** the change directory is still created successfully
- **AND** the system outputs an error indicating the branch already exists
- **AND** the process exits with a non-zero exit code

#### Scenario: Error when git is not installed

- **WHEN** executing `openspec new change my-feature --branch`
- **AND** `git` is not available on the system PATH
- **THEN** the change directory is still created successfully
- **AND** the system outputs an error indicating git was not found
- **AND** the process exits with a non-zero exit code

### Requirement: Branch Name Derived from Change Name

The git branch name SHALL be deterministically derived from the change name using the pattern `openspec/<change-name>`.

#### Scenario: Branch name uses openspec namespace

- **WHEN** creating a change named `add-user-auth` with `--branch`
- **THEN** the created branch name is exactly `openspec/add-user-auth`

#### Scenario: Branch name inherits change name validation

- **GIVEN** change names are already validated to be kebab-case (`[a-z0-9][a-z0-9-]*[a-z0-9]`)
- **WHEN** the `--branch` flag is used
- **THEN** the resulting branch name `openspec/<change-name>` is always a valid git branch name

### Requirement: Cross-Platform Git Execution

The system SHALL execute git commands using `execFileSync` with the `git` binary directly, without relying on shell-specific features.

#### Scenario: Git commands run without shell on all platforms

- **WHEN** the `--branch` flag is used on any supported platform (macOS, Linux, Windows)
- **THEN** git is invoked via `execFileSync('git', [...args], { cwd: projectRoot, stdio: 'pipe' })`
- **AND** no shell expansion or shell-specific syntax is used

#### Scenario: Git repository detection uses rev-parse

- **WHEN** the `--branch` flag is used
- **THEN** the system checks for a git repository by running `git rev-parse --git-dir`
- **AND** treats a non-zero exit code as "not a git repository"
