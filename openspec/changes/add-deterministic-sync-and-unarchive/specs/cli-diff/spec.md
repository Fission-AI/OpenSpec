## ADDED Requirements

### Requirement: Spec Diff Command

The system SHALL provide an `openspec diff [target] [--base <ref>]` command that renders a deterministic, spec-aware diff of spec and delta files, splicing each changed requirement's provenance and rationale inline so a reviewer sees what changed and why together. It SHALL compute the rendering in pure code, without AI inference.

#### Scenario: Diff a change's deltas

- **WHEN** the user runs `openspec diff <change>`
- **THEN** the command shows the change's delta operations grouped by capability and requirement
- **AND** annotates each with the rationale drawn from the change's `proposal.md`

#### Scenario: Diff main specs against a base revision

- **WHEN** the user runs `openspec diff --base <ref>` over `openspec/specs/`
- **THEN** the command shows the requirement-level differences since `<ref>`
- **AND** annotates each changed requirement with the change and delta operation that produced it, drawn from the recorded applied-delta provenance

#### Scenario: No inference

- **WHEN** the command renders a diff
- **THEN** it composes the result from the git diff and the recorded provenance/rationale in code
- **AND** it does not call a language model

### Requirement: Inline Reasoning Annotation

The diff SHALL annotate each changed requirement with the originating change and its rationale, sourced from existing OpenSpec artifacts, and SHALL NOT invent rationale that is not recorded.

#### Scenario: Annotated with originating change and rationale

- **WHEN** a changed requirement can be attributed to a change via provenance
- **THEN** the diff shows the originating change and a reference to or excerpt of its recorded rationale

#### Scenario: Unattributable change shown honestly

- **WHEN** a changed requirement cannot be attributed (no provenance recorded, e.g. a pre-baseline edit)
- **THEN** the diff shows the change without inventing a rationale
- **AND** it indicates that provenance is unavailable

### Requirement: Reuses Existing Artifacts, No New Sidecar Store

The rationale and provenance the diff splices SHALL come from artifacts OpenSpec already maintains — the change's `proposal.md` (the why) and the recorded applied-delta provenance (the what/where) — rather than a separate reasoning database.

#### Scenario: Reasoning resolved from existing artifacts

- **WHEN** the diff needs the reasoning for a changed requirement
- **THEN** it resolves the rationale from the originating change's `proposal.md` and the recorded provenance
- **AND** it requires no separate reasoning-log store

### Requirement: Deterministic Rendering

The diff rendering SHALL be a pure function of its inputs, producing byte-identical output for the same inputs on every platform.

#### Scenario: Repeated runs are identical

- **WHEN** `openspec diff` runs more than once on the same inputs
- **THEN** the output bytes are identical every time

#### Scenario: Platform independence

- **WHEN** the diff runs on different operating systems with the same inputs
- **THEN** the output is identical regardless of line-ending or path-separator differences

### Requirement: Git Diff Driver Integration

The command SHALL be usable as a git diff driver for spec files, documented as an opt-in `.gitattributes` registration, so that `git diff` over spec and delta files renders the spec-aware view. OpenSpec SHALL NOT modify the user's git configuration without explicit consent.

#### Scenario: Registered as a diff driver

- **WHEN** the user opts in by registering the driver for spec paths in `.gitattributes`
- **THEN** `git diff` over those paths renders the spec-aware, annotated diff

#### Scenario: Opt-in only

- **WHEN** the user has not registered the driver
- **THEN** OpenSpec does not alter git behavior
- **AND** `openspec diff` remains available as a standalone command

### Requirement: JSON Output

The diff command SHALL support `--json`, emitting a machine-readable, per-requirement structure (change operation, provenance, rationale reference) for review tooling.

#### Scenario: JSON annotated diff

- **WHEN** the user runs `openspec diff --json`
- **THEN** it emits, per changed requirement, the operation, the originating change, and a reference to the rationale
