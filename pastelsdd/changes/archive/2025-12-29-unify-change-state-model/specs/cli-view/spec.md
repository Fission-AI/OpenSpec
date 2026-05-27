# cli-view Specification Delta

## ADDED Requirements

### Requirement: Draft Changes Display

The dashboard SHALL display changes without tasks in a separate "Draft" section.

#### Scenario: Draft changes listing

- **WHEN** there are changes with no tasks.md or zero tasks defined
- **THEN** system shows them in a "Draft Changes" section
- **AND** uses a distinct indicator (e.g., `○`) to show draft status

#### Scenario: Draft section ordering

- **WHEN** multiple draft changes exist
- **THEN** system sorts them alphabetically by name

## MODIFIED Requirements

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
