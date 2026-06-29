## ADDED Requirements

### Requirement: Update Workflow Command

The system SHALL provide a `/opsx:update` workflow skill that revises a change's existing planning artifacts in place. It SHALL NOT advance the build frontier (it does not create a not-yet-started artifact) and SHALL edit planning artifacts only, never implementation code.

#### Scenario: Select the change to update

- **WHEN** the user invokes `/opsx:update` without a change name
- **THEN** the skill infers the change from conversation context if possible
- **AND** if it cannot, it lists available changes (most-recently-modified first) and asks the user to choose, never auto-selecting

#### Scenario: Revise without advancing the frontier

- **WHEN** the user asks `/opsx:update` to revise an existing artifact
- **THEN** the skill updates that artifact and only its already-existing downstream dependents
- **AND** it does NOT create any artifact that does not yet exist (that remains the job of `/opsx:continue`/`/opsx:propose`)

#### Scenario: Update stays within the plan

- **WHEN** revising artifacts would imply changes to implementation code
- **THEN** the skill updates the planning artifacts only
- **AND** it directs the user to `/opsx:apply` to carry the revised plan into code, rather than editing code itself

### Requirement: Graph-Driven Propagation

The `/opsx:update` skill SHALL determine which artifacts are related, in what order to revisit them, and where they live by reading the change's artifact graph and resolved paths from the CLI, and SHALL NOT rely on hardcoded artifact names or assumed path separators. This makes the skill correct for custom schemas and on every platform, not only the default `spec-driven` schema.

#### Scenario: Propagate to downstream dependents in revisit order

- **WHEN** the user changes a given artifact
- **THEN** the skill obtains that artifact's downstream dependents and their revisit order from the CLI (`openspec status --impact <artifact> --json`)
- **AND** it reviews each downstream artifact against its now-changed upstreams, in that order

#### Scenario: Does not compute the file list or order itself

- **WHEN** the skill needs to know which artifacts are affected and in what order
- **THEN** it uses the set and order returned by the CLI
- **AND** it does not enumerate, order, or filter artifacts by its own logic or by assumed artifact names

#### Scenario: Works for a custom schema

- **WHEN** the active change uses a custom schema whose artifact ids are not `proposal`/`specs`/`design`/`tasks`
- **THEN** the skill uses the artifact ids and dependency edges reported by the CLI
- **AND** propagation works without any change to the skill

#### Scenario: Resolve artifact paths cross-platform

- **WHEN** the skill reads or writes an artifact on macOS, Linux, or Windows
- **THEN** it uses the resolved path provided by the CLI status/instructions output
- **AND** it does not assume forward-slash separators

### Requirement: Cohesive Audit Mode

The `/opsx:update` skill SHALL support an audit mode that reviews a whole change for artifacts that have drifted from or are incoherent with their upstream dependencies and offers to fix them, using the deterministic signals the CLI provides rather than its own heuristics.

#### Scenario: Audit reports drifted artifacts when a baseline exists

- **WHEN** the user invokes `/opsx:update` in audit mode and a recorded digest baseline exists
- **THEN** the skill uses the CLI's drift report (current upstream digest vs. recorded baseline) to identify which downstream artifacts to review
- **AND** it presents them in revisit order

#### Scenario: Audit falls back to structural facts without a baseline

- **WHEN** no digest baseline has been recorded for the change
- **THEN** the skill does not guess at staleness
- **AND** it surfaces the deterministic structural facts the CLI reports (e.g. a declared capability without a spec, an empty or missing output) and asks the user how to proceed

#### Scenario: Audit offers per-artifact fixes

- **WHEN** audit mode identifies one or more artifacts to revise
- **THEN** the skill proposes a concrete revision for each, in revisit order
- **AND** it applies a revision only after the user confirms it

### Requirement: User-Confirmed Incremental Application

The `/opsx:update` skill SHALL propose each artifact revision and apply it only after user confirmation, re-checking coherence after each applied change.

#### Scenario: Confirm before writing

- **WHEN** the skill has a proposed revision for an artifact
- **THEN** it shows the user what it intends to change and why before writing
- **AND** it writes only after the user confirms

#### Scenario: Intent change is redirected to a new change

- **WHEN** the requested revision changes the intent of the change rather than refining it (per the "Update vs. Start Fresh" heuristic)
- **THEN** the skill recommends starting a new change (`/opsx:new`) instead of mutating the existing proposal into different work
