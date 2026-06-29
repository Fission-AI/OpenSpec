## ADDED Requirements

### Requirement: Sync Command

The system SHALL provide an `openspec sync [change-name]` command that applies a change's delta specs to `openspec/specs/` deterministically and in pure code, without archiving the change.

#### Scenario: Apply deltas to main specs

- **WHEN** the user runs `openspec sync <name>` for a change that has delta specs
- **THEN** the command applies the change's ADDED/MODIFIED/REMOVED/RENAMED operations to the corresponding main specs
- **AND** it does not move or archive the change folder
- **AND** it reports, per capability, the counts of requirements added, modified, removed, and renamed

#### Scenario: No delta specs

- **WHEN** a change has no delta specs to apply
- **THEN** the command reports that there is nothing to sync and makes no changes

#### Scenario: Interactive selection

- **WHEN** no change-name is provided in an interactive session
- **THEN** the command lists changes that have delta specs and prompts the user to choose
- **AND** it does not auto-select

### Requirement: Deterministic Merge

The sync merge SHALL be a pure function of the change's delta files and the base spec content, producing byte-identical output for the same inputs on every platform, performed in code without any AI inference.

#### Scenario: Same inputs produce identical output

- **WHEN** sync is run more than once on the same delta specs and the same base specs
- **THEN** the resulting `openspec/specs/` content is byte-for-byte identical every time

#### Scenario: Platform independence

- **WHEN** sync runs on different operating systems with the same inputs
- **THEN** the resulting spec content is identical regardless of line-ending or path-separator differences in the environment

#### Scenario: No inference

- **WHEN** sync applies deltas
- **THEN** it computes the result in code
- **AND** it does not call a language model or otherwise depend on non-deterministic input

### Requirement: Idempotent Regeneration

Sync SHALL be idempotent: re-running it on an unchanged change makes no further changes, and re-running it after a delta is revised regenerates the affected specs from scratch with no residue from the prior revision.

#### Scenario: Re-running is a no-op

- **WHEN** the user runs `openspec sync <name>` again with no change to the change's deltas or to the affected specs
- **THEN** no spec files are modified
- **AND** a subsequent `openspec sync <name> --check` reports no drift

#### Scenario: Revised delta leaves no crumbs

- **WHEN** a change's delta is revised (for example, a requirement that was added is removed, or a modified requirement's text changes) and sync is run again
- **THEN** the affected specs reflect exactly the current delta applied to the original base
- **AND** no requirement or content from the prior revision of the delta remains

### Requirement: Applied-Delta Baseline

When sync applies deltas to `openspec/specs/`, it SHALL record a per-change applied-delta baseline capturing, for each affected spec, its pre-merge content (or an absent marker when the spec is created) and a digest of the applied result, so that the merge can later be reversed and drift can be detected.

#### Scenario: Baseline recorded on apply

- **WHEN** sync writes changes to `openspec/specs/`
- **THEN** it records the pre-merge content and applied-result digest for each affected spec in the change's baseline

#### Scenario: Baseline refreshed on re-sync

- **WHEN** sync re-applies a revised delta
- **THEN** it refreshes the baseline to reflect the new pre-merge state and applied-result digest

### Requirement: Drift Check Mode

The sync command SHALL support a read-only `--check` mode that verifies spec consistency and exits non-zero on a problem, without modifying any files, so it can gate commits and CI as a plain binary.

#### Scenario: Deltas not cleanly appliable

- **WHEN** `openspec sync <name> --check` runs and the change's deltas cannot be cleanly applied to the base specs (for example, a MODIFIED, REMOVED, or RENAMED-from header is absent from the base)
- **THEN** the command reports the problem
- **AND** it exits with a non-zero status code
- **AND** it modifies no files

#### Scenario: Committed specs drifted from regenerated output

- **WHEN** `openspec sync <name> --check` runs, the change's specs have been synced, and the committed `openspec/specs/` content differs from the regenerated output
- **THEN** the command reports drift
- **AND** it exits with a non-zero status code
- **AND** it modifies no files

#### Scenario: Check passes

- **WHEN** `--check` runs and the specs are consistent with the deltas
- **THEN** the command exits zero and modifies no files

### Requirement: Fix Mode

The sync command SHALL support a `--fix` mode (the same as the default write behavior) that regenerates `openspec/specs/` from the change's deltas, suitable for use as an auto-fixer in a pre-commit hook.

#### Scenario: Fix regenerates specs

- **WHEN** the user runs `openspec sync <name> --fix`
- **THEN** the command writes `openspec/specs/` to the regenerated result
- **AND** a subsequent `--check` reports no drift

### Requirement: Shared Engine With Archive

The deterministic merge used by sync SHALL be the same engine used by `openspec archive`, so that syncing and archiving produce identical spec output for the same change.

#### Scenario: Archive and sync agree

- **WHEN** a change's deltas are applied by `openspec sync` and, separately, by `openspec archive`
- **THEN** the resulting `openspec/specs/` content is identical

### Requirement: JSON Output

The sync command SHALL support `--json` for non-interactive use, emitting machine-readable results and diagnostics.

#### Scenario: JSON success

- **WHEN** `openspec sync <name> --json` succeeds
- **THEN** it emits the per-capability counts and the root context as JSON

#### Scenario: JSON blocked path

- **WHEN** `openspec sync <name> --json` cannot proceed (no change, deltas not appliable, or drift under `--check`)
- **THEN** it emits a machine-readable diagnostic with a stable code
- **AND** exits with a non-zero status code
