## ADDED Requirements

### Requirement: Unarchive Command

The system SHALL provide an `openspec unarchive [change-name]` command that is the inverse of `openspec archive`: it moves a change folder out of `openspec/changes/archive/<prefix>-<name>/` back to `openspec/changes/<name>/` and reverses the spec merge that archiving applied to `openspec/specs/`.

#### Scenario: Restore an archived change

- **WHEN** the user runs `openspec unarchive <name>` for a change that was archived by this version or later
- **THEN** the command restores `openspec/specs/` to its pre-archive state
- **AND** moves the change folder back to `openspec/changes/<name>/`
- **AND** reports the restored change name and location

#### Scenario: Interactive selection

- **WHEN** no change-name is provided in an interactive session
- **THEN** the command lists archived changes (most-recently-archived first) and prompts the user to select one
- **AND** it does not auto-select

#### Scenario: Non-interactive requires a name

- **WHEN** the command is run with `--json` (or otherwise non-interactively) and no change-name is provided
- **THEN** it fails with a machine-readable diagnostic stating a change name is required
- **AND** exits with a non-zero status code

### Requirement: Archived Change Resolution

The command SHALL resolve the target archived directory from either a bare change `<name>` or a full archived directory id, treating the leading prefix as opaque up to the name, and SHALL never silently choose among multiple matches.

#### Scenario: Resolve a bare name with a single match

- **WHEN** exactly one archived directory matches `<name>` after stripping its leading prefix
- **THEN** the command resolves to that directory

#### Scenario: Tolerate differing prefix schemes

- **WHEN** an archived directory uses a date prefix (`YYYY-MM-DD-<name>`) or a sequence/other prefix (e.g. `NNN-<name>`)
- **THEN** the command resolves `<name>` regardless of which prefix scheme produced the directory

#### Scenario: Ambiguous bare name in interactive mode

- **WHEN** more than one archived directory matches a bare `<name>`
- **AND** the session is interactive
- **THEN** the command lists the matching directories (most-recent first) and prompts the user to choose
- **AND** it does not auto-select

#### Scenario: Ambiguous bare name in non-interactive mode

- **WHEN** more than one archived directory matches a bare `<name>`
- **AND** the command is run with `--json` or otherwise non-interactively
- **THEN** it fails with a diagnostic listing the candidate directory ids
- **AND** directs the user to re-run with the full archived directory id

#### Scenario: Full directory id resolves unambiguously

- **WHEN** the user passes the full archived directory id (including its prefix)
- **THEN** the command resolves to exactly that directory without prompting

#### Scenario: No matching archive

- **WHEN** no archived directory matches the provided name or id
- **THEN** the command fails with a clear not-found error and makes no changes

### Requirement: Deterministic Spec Reversal

The command SHALL reverse the spec merge deterministically by restoring, for each affected spec, the pre-merge content recorded in the change's applied-delta baseline — recreating specs that archiving deleted and deleting specs that archiving created — without re-parsing or inferring requirement content.

#### Scenario: Restore modified and removed requirements exactly

- **WHEN** the archived change's baseline records pre-merge content for an affected spec
- **THEN** the command restores that spec to the recorded pre-merge bytes
- **AND** requirements that were MODIFIED or REMOVED during archiving are restored to their exact prior content

#### Scenario: Reverse added requirements

- **WHEN** archiving added requirements to a spec
- **THEN** restoring the recorded pre-merge content removes exactly those added requirements

#### Scenario: Recreate a spec that archiving created

- **WHEN** archiving created a new spec (the baseline marks the pre-image as absent)
- **THEN** the command deletes that spec on reversal, returning `openspec/specs/` to its pre-archive shape

#### Scenario: Round-trip is byte-exact

- **WHEN** a change is archived and then unarchived with no intervening edits to the affected specs
- **THEN** `openspec/specs/` is byte-for-byte identical to its state before the archive

### Requirement: Drift Guard

The command SHALL verify, before reversing any spec, that each affected spec still matches the applied-result state recorded in the applied-delta baseline, and SHALL refuse to reverse a spec that has drifted rather than overwrite later changes.

#### Scenario: Refuse on drift

- **WHEN** an affected spec's current content no longer matches the applied-result digest recorded in the baseline (for example, a later change modified the same requirement)
- **THEN** the command refuses to reverse the spec merge
- **AND** it reports which specs drifted
- **AND** it directs the user to re-run with `--keep-specs` to restore the folder without touching specs

#### Scenario: Proceed when no drift

- **WHEN** every affected spec still matches its recorded applied-result state
- **THEN** the command proceeds with the deterministic spec reversal

### Requirement: Keep Specs Option

The command SHALL support a `--keep-specs` flag that restores the change folder to active without modifying `openspec/specs/`, and SHALL accept `--skip-specs` as an equivalent alias.

#### Scenario: Restore folder without touching specs

- **WHEN** the user runs `openspec unarchive <name> --keep-specs`
- **THEN** the command moves the change folder back to `openspec/changes/<name>/`
- **AND** it makes no changes to `openspec/specs/`
- **AND** it does not perform drift or reversal checks on specs

#### Scenario: Skip-specs alias

- **WHEN** the user runs `openspec unarchive <name> --skip-specs`
- **THEN** the command behaves identically to `--keep-specs`

### Requirement: Atomic Operation

The command SHALL apply the reversal atomically: it stages and validates all changes first, and on any failure it leaves the filesystem unchanged.

#### Scenario: Failure leaves no partial state

- **WHEN** any step of the reversal fails (for example, the folder move fails after specs were restored)
- **THEN** the command reports `Abort. No files were changed.`
- **AND** both `openspec/specs/` and the folder location are returned to their pre-command state

#### Scenario: Destination already exists

- **WHEN** an active change directory `openspec/changes/<name>/` already exists
- **THEN** the command fails without overwriting it
- **AND** it makes no changes to specs

### Requirement: Backward Compatibility For Pre-Baseline Archives

For changes archived before applied-delta baselines existed, the command SHALL reverse the operations it can invert from the archived delta alone and SHALL refuse to guess the operations it cannot, never producing an incorrect spec.

#### Scenario: Reverse the self-invertible operations

- **WHEN** an archived change has no applied-delta baseline
- **AND** its delta contains only ADDED and/or RENAMED requirements
- **THEN** the command reverses them by delta inversion (removing added requirements, renaming renamed requirements back)
- **AND** restores `openspec/specs/` accordingly

#### Scenario: Refuse to guess irreversible operations

- **WHEN** an archived change has no applied-delta baseline
- **AND** its delta contains MODIFIED or REMOVED requirements (whose pre-image is not recoverable from the delta)
- **THEN** the command does not modify those specs
- **AND** it reports which requirements cannot be safely reversed
- **AND** it directs the user to `--keep-specs` (and optionally to git-based recovery)

#### Scenario: Keep-specs always available

- **WHEN** an archived change has no applied-delta baseline
- **AND** the user runs `openspec unarchive <name> --keep-specs`
- **THEN** the command restores the folder without touching specs, regardless of which delta operations the change contains

### Requirement: Error Conditions

The command SHALL handle error conditions gracefully and consistently with `openspec archive`.

#### Scenario: Missing archive directory

- **WHEN** no `openspec/changes/archive/` directory exists
- **THEN** the command fails with a clear message and makes no changes

#### Scenario: JSON diagnostics

- **WHEN** the command is run with `--json` and a blocked condition occurs (not found, ambiguous, drift, destination exists, or pre-baseline irreversibility)
- **THEN** it emits a machine-readable diagnostic with a stable code
- **AND** exits with a non-zero status code
