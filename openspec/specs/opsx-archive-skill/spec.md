# OPSX Archive Skill Spec

## Purpose

Define the expected behavior for the `/opsx:archive` skill, including readiness checks, spec sync prompting, archive execution, and user-facing output.

## Requirements

### Requirement: OPSX Archive Skill

The system SHALL provide an `/opsx:archive` skill that archives completed changes in the experimental workflow.

#### Scenario: Archive a change with all artifacts complete

- **WHEN** agent executes `/opsx:archive` with a change name
- **AND** all artifacts in the schema are complete
- **AND** all tasks are complete
- **THEN** the agent moves the change to `openspec/changes/archive/<target-name>/`
- **AND** displays success message with archived location

#### Scenario: Change selection prompt

- **WHEN** agent executes `/opsx:archive` without specifying a change
- **THEN** the agent infers the change from conversation context, or auto-selects it when only one active change exists
- **AND** when ambiguous, prompts user to select from available changes, showing only active changes (excludes archive/)
- **AND** announces which change was selected and how to override

### Requirement: Artifact Completion Check

The skill SHALL check artifact completion status using the artifact graph before archiving.

#### Scenario: Incomplete artifacts warning

- **WHEN** agent checks artifact status
- **AND** one or more artifacts have status other than `done`
- **THEN** display warning listing incomplete artifacts
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All artifacts complete

- **WHEN** agent checks artifact status
- **AND** all artifacts have status `done`
- **THEN** proceed without warning

### Requirement: Task Completion Check

The skill SHALL check task completion status from tasks.md before archiving.

#### Scenario: Incomplete tasks found

- **WHEN** agent reads tasks.md
- **AND** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display warning showing count of incomplete tasks
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All tasks complete

- **WHEN** agent reads tasks.md
- **AND** all tasks are complete (marked with `- [x]`)
- **THEN** proceed without task-related warning

#### Scenario: No tasks file

- **WHEN** tasks.md does not exist
- **THEN** proceed without task-related warning

### Requirement: Spec Sync Prompt

The skill SHALL prompt to sync delta specs before archiving if specs exist.

#### Scenario: Delta specs exist

- **WHEN** agent checks for delta specs
- **AND** `specs/` directory exists in the change with spec files
- **THEN** prompt user: "This change has delta specs. Would you like to sync them to main specs before archiving?"
- **AND** if user cancels, stop without archiving
- **AND** if user confirms, execute `/opsx:sync` logic inline and wait for it to complete
- **AND** verify every capability that has a delta spec, not only those the sync reports it touched: ADDED requirements present, MODIFIED requirements carrying the changes named in the delta, REMOVED requirements absent, RENAMED requirements present under the new name and absent under the old one
- **AND** treat a capability whose last requirement the sync removed as verified when its main spec was deleted rather than left empty, and a spec the sync deliberately kept and reported as verified too
- **AND** stop without archiving if the sync fails or any capability does not verify
- **AND** archive only after verification passes, or when the user explicitly chose to archive without syncing or to archive already-synced specs

#### Scenario: No delta specs

- **WHEN** agent checks for delta specs
- **AND** no `specs/` directory or no spec files exist
- **THEN** proceed without sync prompt

### Requirement: Archive Process

The skill SHALL delegate the final move to `openspec archive "<name>" --skip-specs --yes --json`, using the same selected-root flags. Both single and bulk archive workflows SHALL retain their earlier confirmation and sync-verification steps, then use the CLI's archive lock and destination-collision handling.

#### Scenario: Successful archive

- **WHEN** the workflow's checks and any selected sync verification have completed
- **THEN** run the archive CLI with `--skip-specs` to preserve the earlier sync or skip decision and avoid a second merge
- **AND** use `--yes` for the confirmations already obtained by the workflow
- **AND** let the CLI create the archive directory, derive the date-prefixed name, and move the entire change directory
- **AND** require a zero exit status and an archive result for the selected change before reporting success
- **AND** report the returned `archive.path` as the archive location
- **AND** preserve `.openspec.yaml` file in archived change

#### Scenario: Archive already exists

- **WHEN** the target archive directory exists when the CLI checks the destination, including one created after the workflow's earlier checks
- **THEN** fail with error message
- **AND** leave the existing archive intact rather than nesting the change inside it
- **AND** suggest resolving the collision or using a different change name before retrying

#### Scenario: Archive command fails

- **WHEN** the CLI exits nonzero or returns no archive result
- **THEN** report its diagnostics without claiming success or falling back to a shell move
- **AND** do not bypass CLI validation to complete the move
- **AND** in a bulk archive, record that change as failed and continue with the remaining confirmed changes

### Requirement: Skill Output

The skill SHALL provide clear feedback about the archive operation.

#### Scenario: Archive complete with sync

- **WHEN** archive completes after syncing specs
- **THEN** preserve the earlier verified sync outcome even though the final `--skip-specs` invocation reports `archive.specsUpdated` as false
- **AND** display summary:
  - Specs synced (from `/opsx:sync` output)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete without sync

- **WHEN** archive completes without syncing specs
- **THEN** display summary:
  - Note that specs were not synced (if applicable)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete with warnings

- **WHEN** archive completes with incomplete artifacts or tasks
- **THEN** include note about what was incomplete
- **AND** suggest reviewing if archive was intentional
