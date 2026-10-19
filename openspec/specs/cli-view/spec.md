# cli-view Specification

## Purpose

The `openspec view` command provides a comprehensive dashboard view of the OpenSpec project state, displaying specifications, changes, and progress metrics in a unified, visually appealing format to help developers quickly understand project status.

## Requirements

### Requirement: Dashboard Display

The system SHALL provide a `view` command that displays a dashboard overview of specs and changes.

#### Scenario: Basic dashboard display

- **WHEN** user runs `openspec view`
- **THEN** system displays a formatted dashboard with sections for summary, active changes, completed changes, and specifications

#### Scenario: No OpenSpec directory

- **WHEN** user runs `openspec view` in a directory without OpenSpec
- **THEN** system displays error message "✗ No openspec directory found"

### Requirement: Summary Section

The dashboard SHALL display a summary section with key project metrics, including draft change count.

#### Scenario: Complete summary display

- **WHEN** dashboard is rendered with specs and changes
- **THEN** system shows total number of specifications and requirements
- **AND** shows number of draft changes
- **AND** shows number of active changes in progress
- **AND** shows number of completed changes
- **AND** shows overall task progress percentage

#### Scenario: Empty project summary

- **WHEN** no specs or changes exist
- **THEN** summary shows zero counts for all metrics

### Requirement: Active Changes Display
The dashboard SHALL show active changes with visual progress indicators.

#### Scenario: Active changes ordered by completion percentage
- **WHEN** multiple active changes are displayed with progress information
- **THEN** list them sorted by completion percentage ascending so 0% items appear first
- **AND** treat missing progress values as 0% for ordering
- **AND** break ties by change identifier in ascending alphabetical order to keep output deterministic

### Requirement: Active Change Workflow Status

The dashboard SHALL show each active change's schema and artifact states beneath its task progress, using the same workflow resolution as `openspec status`. Workflow status SHALL NOT change task progress, change categories, or sorting.

#### Scenario: Workflow states

- **WHEN** an active change's workflow can be loaded
- **THEN** show the schema name and artifacts in dependency order
- **AND** mark existing artifact outputs with `✓`, ready artifacts with `→`, blocked artifacts with no symbol, and skipped artifacts with `(skipped)`
- **AND** treat an existing tasks artifact as done even when its implementation checklist is unfinished

#### Scenario: Store-local workflow

- **WHEN** the dashboard targets a store through `--store` or a project store pointer
- **THEN** resolve workflow schemas and artifact files from that store
- **AND** use the store's default schema for changes without a schema in their metadata

#### Scenario: Invalid workflow

- **WHEN** an active change's metadata or schema cannot be loaded
- **THEN** print a warning identifying the change and the error
- **AND** omit only that change's workflow status while retaining its task progress and rendering other changes

#### Scenario: Terminal controls in workflow text

- **WHEN** schema names, artifact identifiers, or workflow errors contain terminal control characters
- **THEN** replace those characters with inert text in the dashboard output
- **AND** preserve the underlying identifiers and workflow states

### Requirement: Completed Changes Display

The dashboard SHALL list completed changes in a separate section, only showing changes with ALL tasks completed.

> **Fixes bug**: Previously, changes with `total === 0` were incorrectly shown as completed.

#### Scenario: Completed changes listing

- **WHEN** there are changes with `tasks.total > 0` AND `tasks.completed === tasks.total`
- **THEN** system shows them with checkmark indicators in a dedicated section

#### Scenario: Mixed completion states

- **WHEN** some changes are complete and others active
- **THEN** system separates them into appropriate sections

#### Scenario: Empty changes not completed

- **WHEN** a change has no tasks.md or zero tasks defined
- **THEN** system does NOT show it in "Completed Changes" section
- **AND** shows it in "Draft Changes" section instead

### Requirement: Specifications Display

The dashboard SHALL display specifications sorted by requirement count.

#### Scenario: Specs listing with counts

- **WHEN** specifications exist in the project
- **THEN** system shows specs sorted by requirement count (descending) with count labels

#### Scenario: Specs with parsing errors

- **WHEN** a spec file cannot be parsed
- **THEN** system includes it with 0 requirement count

### Requirement: Visual Formatting

The dashboard SHALL use consistent visual formatting with colors and symbols.

#### Scenario: Color coding

- **WHEN** dashboard elements are displayed
- **THEN** system uses cyan for specification items
- **AND** yellow for active changes
- **AND** green for completed items
- **AND** dim gray for supplementary text

#### Scenario: Progress bar rendering

- **WHEN** displaying progress bars
- **THEN** system uses filled blocks (█) for completed portions and light blocks (░) for remaining

### Requirement: Error Handling

The view command SHALL handle errors gracefully.

#### Scenario: File system errors

- **WHEN** file system operations fail
- **THEN** system continues with available data and omits inaccessible items

#### Scenario: Invalid data structures

- **WHEN** specs or changes have invalid format
- **THEN** system skips invalid items and continues rendering

### Requirement: Draft Changes Display

The dashboard SHALL display changes without tasks in a separate "Draft" section.

#### Scenario: Draft changes listing

- **WHEN** there are changes with no tasks.md or zero tasks defined
- **THEN** system shows them in a "Draft Changes" section
- **AND** uses a distinct indicator (e.g., `○`) to show draft status

#### Scenario: Draft section ordering

- **WHEN** multiple draft changes exist
- **THEN** system sorts them alphabetically by name

### Requirement: Task progress SHALL be resolved through the tracked-tasks artifact glob

`openspec view` SHALL determine a change's task progress by resolving its tracked-tasks artifact and counting checkboxes across that artifact's output glob (`generates`) — the same file-resolution `openspec status` uses to detect the tasks artifact — rather than assuming a fixed `changes/<name>/tasks.md` path. The tracked-tasks artifact SHALL be identified as the artifact whose `generates` equals the schema's `apply.tracks` value, falling back to the artifact with id `tasks` when no `apply` block is present. (`apply.tracks` is a filename that selects the artifact; the glob is that artifact's `generates`.) Resolution SHALL be scoped to the change directory, SHALL aggregate completed and total checkbox counts across every matching file, and SHALL NOT double-count. When the schema cannot be resolved, no tracked-tasks artifact is found, or the glob matches no file, `view` SHALL fall back to counting a single top-level `tasks.md` exactly as today, and SHALL NOT raise an error.

Note on scope: `openspec status` detects whether the tasks artifact *file exists*; it does not count checkboxes (a change whose nested `tasks.md` files exist is reported by `status` as having the tasks artifact complete even when boxes are unchecked). The parity established here is therefore **resolution-mechanism parity** — `view` resolves the same set of `tasks.md` files `status` resolves — and `view` additionally counts checkboxes within them. The fix removes `view`'s blindness to nested files; it does not make `view` agree with a task count `status` does not produce.

#### Scenario: Nested tasks files under a glob schema

- **GIVEN** a schema whose tasks artifact `generates` is `**/tasks.md`
- **AND** a change with `backend/tasks.md` and `frontend/tasks.md` and no top-level `tasks.md`
- **WHEN** running `openspec view`
- **THEN** the change SHALL show aggregated task progress summed across both files
- **AND** SHALL NOT be classified as a Draft change solely because no top-level `tasks.md` exists

#### Scenario: Tracked-tasks files resolve the same as status

- **GIVEN** a schema whose tasks artifact `generates` is `**/tasks.md`
- **WHEN** running `openspec view` and `openspec status --change <name>`
- **THEN** both SHALL resolve the same set of `tasks.md` files for the change — `status` to detect the tasks artifact, `view` to count checkboxes within them

#### Scenario: Files exist but tasks unchecked are not Completed

- **GIVEN** a glob-tasks change whose matched `tasks.md` files contain unchecked boxes
- **WHEN** running `openspec view`
- **THEN** the change SHALL be classified Active (not Completed), even though `status` reports the tasks artifact as present

#### Scenario: Tracked-tasks artifact identified by apply.tracks, not a fixed id

- **GIVEN** a custom schema whose tracked-tasks artifact is not named `tasks` but is selected by `apply.tracks`
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be resolved from that artifact's `generates` glob

#### Scenario: Resolution stays scoped to the change directory

- **WHEN** resolving a change's `tasks.md` files
- **THEN** matching SHALL be rooted at `changes/<name>/` only
- **AND** SHALL NOT count `tasks.md` files belonging to another change or under `changes/archive/`

#### Scenario: Unresolvable schema falls back without error

- **GIVEN** a change whose configured schema cannot be resolved (for example, the config names a missing schema)
- **WHEN** running `openspec view`
- **THEN** task progress SHALL fall back to counting a single top-level `tasks.md`
- **AND** `view` SHALL NOT crash

#### Scenario: Single top-level tasks file is unchanged

- **GIVEN** a change with exactly one top-level `changes/<name>/tasks.md`, or a project with no resolvable schema
- **WHEN** running `openspec view`
- **THEN** task progress SHALL be counted from that single file exactly as before

#### Scenario: A change with no tasks anywhere stays Draft

- **GIVEN** a change with no `tasks.md` matching the tracked-tasks glob
- **WHEN** running `openspec view`
- **THEN** the change SHALL report zero tasks and be classified as Draft, as today
