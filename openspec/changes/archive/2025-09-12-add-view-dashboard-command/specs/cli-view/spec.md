# CLI View Command - Changes

## ADDED Requirements

### Requirement: Dashboard Display

The system SHALL provide a `view` command that displays a dashboard overview of specs and changes.

#### Scenario: Basic dashboard display

- **WHEN** user runs `pastelsdd view`
- **THEN** system displays a formatted dashboard with sections for summary, active changes, completed changes, and specifications

#### Scenario: No Pastelsdd directory

- **WHEN** user runs `pastelsdd view` in a directory without Pastelsdd
- **THEN** system displays error message "✗ No pastelsdd directory found"

### Requirement: Summary Section

The dashboard SHALL display a summary section with key project metrics.

#### Scenario: Complete summary display

- **WHEN** dashboard is rendered with specs and changes
- **THEN** system shows total number of specifications and requirements
- **AND** shows number of active changes in progress
- **AND** shows number of completed changes
- **AND** shows overall task progress percentage

#### Scenario: Empty project summary

- **WHEN** no specs or changes exist
- **THEN** summary shows zero counts for all metrics

### Requirement: Active Changes Display

The dashboard SHALL show active changes with visual progress indicators.

#### Scenario: Active changes with progress bars

- **WHEN** there are in-progress changes with tasks
- **THEN** system displays each change with change name left-aligned
- **AND** visual progress bar using Unicode characters
- **AND** percentage completion on the right

#### Scenario: No active changes

- **WHEN** all changes are completed or no changes exist
- **THEN** active changes section is omitted from display

### Requirement: Completed Changes Display

The dashboard SHALL list completed changes in a separate section.

#### Scenario: Completed changes listing

- **WHEN** there are completed changes (all tasks done)
- **THEN** system shows them with checkmark indicators in a dedicated section

#### Scenario: Mixed completion states

- **WHEN** some changes are complete and others active
- **THEN** system separates them into appropriate sections

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