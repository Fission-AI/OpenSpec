## ADDED Requirements

### Requirement: Spec Format Command

The system SHALL provide an `openspec format [target]` command that rewrites OpenSpec spec files and delta spec files to a single deterministic canonical form, in pure code without AI inference. By default it writes; `--check` runs read-only.

#### Scenario: Format main and delta specs

- **WHEN** the user runs `openspec format` with no target
- **THEN** the command formats the main specs under `openspec/specs/` and the delta specs under active changes' `specs/` directories
- **AND** it reports which files were reformatted

#### Scenario: Format a specific target

- **WHEN** the user runs `openspec format <path>` for a spec or delta file or directory
- **THEN** the command formats only that target

#### Scenario: No inference

- **WHEN** the command formats a file
- **THEN** it computes the canonical form in code
- **AND** it does not call a language model or otherwise depend on non-deterministic input

### Requirement: Deterministic Canonical Form

The formatter SHALL produce byte-identical output for the same input on every platform, and SHALL be idempotent: formatting already-canonical content changes nothing.

#### Scenario: Same input yields identical output

- **WHEN** the formatter runs more than once on the same input
- **THEN** the output bytes are identical every time

#### Scenario: Idempotent

- **WHEN** the formatter is applied to content it has already formatted
- **THEN** the content is unchanged

#### Scenario: Line endings normalized

- **WHEN** the input contains CRLF or mixed line endings
- **THEN** the canonical output uses normalized line endings regardless of the platform

### Requirement: Behavior-Preserving Normalization

The formatter SHALL change only presentation — whitespace, blank-line policy, list markers and indentation, and heading spacing — and SHALL NOT change the meaning of a spec. It SHALL NOT reorder requirements or scenarios, rewrite prose, or add, remove, merge, or split requirements or scenarios.

#### Scenario: Requirement and scenario order preserved

- **WHEN** the formatter runs on a spec
- **THEN** the order of requirements and of scenarios within each requirement is unchanged

#### Scenario: Prose is not rewritten

- **WHEN** the formatter normalizes a requirement
- **THEN** the requirement's wording and scenario text are byte-for-byte unchanged except for surrounding whitespace normalization

#### Scenario: Parsed content is identical before and after

- **WHEN** a spec is parsed before formatting and after formatting
- **THEN** the parsed requirements, scenarios, and delta operations are identical

### Requirement: Canonical Section Organization

The formatter SHALL normalize the structural presentation of a spec deterministically — heading levels and nesting, the spacing between sections, and the canonical headers for delta sections — without changing which sections are present or their order.

#### Scenario: Canonical headings and spacing

- **WHEN** a spec uses inconsistent heading spacing or blank-line separation between requirements and scenarios
- **THEN** the formatter rewrites them to the canonical spacing defined by the conventions

#### Scenario: Canonical delta section headers

- **WHEN** a delta file contains `## ADDED/MODIFIED/REMOVED/RENAMED Requirements` sections
- **THEN** the formatter normalizes those headers to their canonical form
- **AND** it does not move requirements between sections

### Requirement: Shared Canonicalization With The Merge Engine

The canonical form produced by `openspec format` SHALL be the same canonical form emitted by the deterministic merge engine used by `openspec sync` and `openspec archive`, so that synced or archived specs are already canonical.

#### Scenario: Merge output is already formatted

- **WHEN** `openspec sync` or `openspec archive` writes a spec
- **THEN** running `openspec format --check` on that spec passes without changes

#### Scenario: One canonicalizer

- **WHEN** the same spec content is produced by the formatter and by the merge engine
- **THEN** the two results are byte-identical

### Requirement: Check Mode

The format command SHALL support a read-only `--check` mode that exits non-zero when any target is not in canonical form, naming the offending files and modifying nothing, so it can gate commits and CI as a plain binary.

#### Scenario: Unformatted file detected

- **WHEN** `openspec format --check` finds a file that is not in canonical form
- **THEN** the command reports the file
- **AND** it exits with a non-zero status code and modifies no files

#### Scenario: All formatted

- **WHEN** every target is already in canonical form
- **THEN** the command exits zero and modifies no files

### Requirement: Fix Mode

The format command SHALL, by default (or with `--fix`), rewrite targets to canonical form, suitable for use as an auto-fixer in a pre-commit hook.

#### Scenario: Fix writes canonical form

- **WHEN** the user runs `openspec format` (or `openspec format --fix`)
- **THEN** the command writes each target's canonical form
- **AND** a subsequent `openspec format --check` passes

### Requirement: Incremental Checking

The format check MAY use recorded content digests to skip files whose content is unchanged since they were last checked, re-checking only what changed. A skip SHALL be permitted only when it cannot change the result versus a full check.

#### Scenario: Unchanged file skipped

- **WHEN** `--check` runs and a file's current content digest matches the recorded digest
- **THEN** the command may skip re-checking that file
- **AND** the overall result is identical to checking it fully

#### Scenario: Changed or unknown file fully checked

- **WHEN** a file's digest does not match, no digest is recorded, or the recorded digest uses an unrecognized scheme
- **THEN** the command performs the full check for that file

### Requirement: JSON Output

The format command SHALL support `--json` for non-interactive use, emitting machine-readable results and diagnostics.

#### Scenario: JSON reports unformatted files

- **WHEN** `openspec format --check --json` finds files not in canonical form
- **THEN** it emits the list of offending files as JSON
- **AND** exits with a non-zero status code

#### Scenario: JSON reports written files

- **WHEN** `openspec format --json` rewrites files
- **THEN** it emits the list of changed files as JSON
