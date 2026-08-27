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

