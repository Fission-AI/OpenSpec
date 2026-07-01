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

The command SHALL apply the reversal atomically using a defined sequence: validate, then stage, then commit, so that any failure before the final commit step leaves the filesystem unchanged.

#### Scenario: Defined sequence

- **WHEN** the command performs a reversal that touches specs
- **THEN** it executes in this order:
  1. validate that the destination `openspec/changes/<name>/` does not exist and that every affected spec is present and drift-free against the baseline;
  2. compute the reversed spec content and write it to a temporary staging area inside `.openspec/` (no change yet to `openspec/specs/`);
  3. swap the staged specs into `openspec/specs/`;
  4. move the change folder from archive back to active.

#### Scenario: Failure before the folder move leaves specs untouched

- **WHEN** validation or staging (steps 1–2) fails
- **THEN** the command reports `Abort. No files were changed.`
- **AND** `openspec/specs/` and the archive folder are exactly as they were

#### Scenario: Failure of the final move rolls specs back

- **WHEN** the spec swap (step 3) has occurred but the folder move (step 4) fails
- **THEN** the command restores `openspec/specs/` from the still-present baseline
- **AND** reports `Abort. No files were changed.`
- **AND** if rollback itself cannot complete, it reports the partial state and the exact recovery steps rather than leaving a silent inconsistency

#### Scenario: Destination already exists

- **WHEN** an active change directory `openspec/changes/<name>/` already exists
- **THEN** the command fails without overwriting it
- **AND** it makes no changes to specs

### Requirement: Backward Compatibility For Pre-Baseline Archives

For changes archived before applied-delta baselines existed, the command SHALL reverse the spec merge only when the whole change is invertible from the archived delta alone, and SHALL otherwise refuse the spec reversal entirely (all-or-nothing) rather than leaving a partially reversed `openspec/specs/`. This preserves the same atomic, never-corrupt guarantee in the degraded path.

#### Scenario: Fully self-invertible change is reversed

- **WHEN** an archived change has no applied-delta baseline
- **AND** every delta operation across all of its affected specs is ADDED and/or RENAMED
- **THEN** the command reverses them by delta inversion (removing added requirements, renaming renamed requirements back) and restores `openspec/specs/` accordingly

#### Scenario: Mixed invertibility refuses all spec reversal

- **WHEN** an archived change has no applied-delta baseline
- **AND** its delta contains at least one MODIFIED or REMOVED requirement (whose pre-image is not recoverable from the delta), possibly alongside ADDED/RENAMED in the same or other specs
- **THEN** the command modifies no specs at all (it does not partially reverse the self-invertible specs)
- **AND** it reports which requirements cannot be safely reversed and why
- **AND** it directs the user to `--keep-specs` (and optionally to git-based recovery of the pre-image)

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
