# Sync Command Specification

## Purpose

The `openspec sync` command SHALL fold a change's delta specs into the main specs
without archiving the change, and SHALL provide a check that a change claiming to
be shipped has its deltas present in the main specs.

## ADDED Requirements

### Requirement: Lifecycle Status Field
A change SHALL be able to declare its lifecycle state as data in its
`.openspec.yaml`, using an optional `status` field whose value is `proposed` or
`shipped`. A change that does not declare one SHALL be treated as `proposed`.

#### Scenario: Undeclared status reads as proposed
- **WHEN** a change's `.openspec.yaml` has no `status` field, or the change has no
  metadata file at all
- **THEN** every reader SHALL treat the change as `proposed`
- **AND** no command SHALL write the field on the change's behalf

#### Scenario: A status that cannot be determined is not rounded to proposed
- **WHEN** a change's metadata mentions `status` but cannot be honored, because the
  file does not parse, carries an unknown value, or names a schema that does not
  resolve
- **THEN** the state SHALL be reported as undetermined with its reason
- **AND** `openspec sync --check` SHALL fail rather than pass the change

#### Scenario: Broken metadata that never mentions status is left alone
- **WHEN** a change's metadata cannot be honored and does not mention `status`
- **THEN** the change SHALL read as `proposed`
- **AND** `openspec sync --check` SHALL NOT report it

### Requirement: Folding Delta Specs
The command SHALL apply a change's delta specs to the main specs, leaving the
change directory where it is.

#### Scenario: Folding a named change
- **WHEN** `openspec sync <change>` is executed
- **THEN** each delta under the change's `specs/` SHALL be applied to its main spec
- **AND** the change directory SHALL NOT be moved
- **AND** the change's declared status SHALL NOT affect whether it is folded

#### Scenario: Folding every shipped change
- **WHEN** `openspec sync` is executed with no change name
- **THEN** every active change declaring `status: shipped` SHALL be folded
- **AND** a change declaring no status SHALL NOT be folded

#### Scenario: Folding is idempotent
- **WHEN** `openspec sync` is run against a change whose deltas are already in the
  main specs
- **THEN** no file SHALL be written
- **AND** the command SHALL report that the specs are already in sync

#### Scenario: Archiving after a sync is unaffected
- **WHEN** a change is folded by `openspec sync` and later archived
- **THEN** `openspec archive` SHALL apply zero operations and write no spec file
- **AND** the change SHALL be moved to the archive as it always was

### Requirement: Shipped Changes Are Folded
The command SHALL provide a check that asserts one property over the working tree:
every change claiming to be shipped has its deltas present in the main specs.

#### Scenario: A proposed change passes for free
- **WHEN** `openspec sync --check` is executed and no active change declares
  `status: shipped`
- **THEN** the command SHALL exit 0
- **AND** SHALL write no file

#### Scenario: A shipped change with unfolded deltas fails the check
- **WHEN** `openspec sync --check` is executed and an active change declaring
  `status: shipped` has a delta that is not in its main spec
- **THEN** the command SHALL exit 1
- **AND** SHALL name the change and each capability whose delta is unapplied
- **AND** SHALL name the command that folds them
- **AND** SHALL write no file

#### Scenario: Folded-ness is decided by the merge builder
- **WHEN** deciding whether a change's deltas are present in the main specs
- **THEN** the decision SHALL be that re-applying the delta produces zero applied
  operations, which is the same predicate the archive command uses to decide it
  has nothing to write
- **AND** SHALL NOT be a byte comparison against a rebuilt spec

#### Scenario: Archived changes are never examined
- **WHEN** `openspec sync --check` is executed
- **THEN** only active changes SHALL be examined
- **AND** a change that has been archived SHALL NOT be checked

### Requirement: Sync Never Deletes A Spec
The command SHALL NOT delete a main spec under any circumstance. Retiring a
capability remains the archive command's operation.

#### Scenario: A retirement is handed to archive
- **WHEN** a change's REMOVED entries would take a capability's last requirement
- **THEN** `openspec sync` SHALL refuse to fold that change
- **AND** SHALL name `openspec archive` as the command that performs a retirement
- **AND** the main spec file SHALL remain on disk

#### Scenario: The check reports a retirement without offering sync as the fix
- **WHEN** `openspec sync --check` finds a shipped change that would retire a
  capability
- **THEN** the command SHALL exit 1 naming the retirement
- **AND** SHALL NOT tell the user to run `openspec sync`

### Requirement: Guards Before Writing
The command SHALL run the same guards the archive command runs before it writes a
main spec.

#### Scenario: Delta specs are validated
- **WHEN** a change's delta specs fail validation and `--no-validate` was not passed
- **THEN** the command SHALL refuse the change and write no file

#### Scenario: Incomplete tasks block the fold
- **WHEN** a change has incomplete tasks and `--yes` was not passed
- **THEN** the command SHALL refuse the change and write no file
- **AND** SHALL name the rerun that proceeds anyway

#### Scenario: Every rebuilt spec is validated before any is written
- **WHEN** any rebuilt spec would fail validation
- **THEN** no spec file SHALL be written at all

#### Scenario: A fold that does not settle is named
- **WHEN** two shipped changes claim the same requirement in ways that cannot both
  hold, so re-evaluating after the write still reports unfolded deltas
- **THEN** the command SHALL name the changes involved
- **AND** SHALL NOT retry the fold

### Requirement: Shipping In One Diff
The command SHALL offer to set a change's status and fold it in a single run, so
that no intermediate commit claims a change is shipped while its deltas are absent
from the main specs.

#### Scenario: Marking a change shipped and folding it
- **WHEN** `openspec sync <change> --ship` is executed
- **THEN** the change's `.openspec.yaml` SHALL be set to `status: shipped`
- **AND** its deltas SHALL be folded in the same run
- **AND** the metadata file's comments and key order SHALL be preserved

#### Scenario: Ship is refused where it cannot apply
- **WHEN** `--ship` is passed with `--check`, or with no change name
- **THEN** the command SHALL refuse and say which flag combination is valid
