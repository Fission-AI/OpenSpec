## MODIFIED Requirements

### Requirement: Specifications Display

The dashboard SHALL display specifications sorted by requirement count, supporting hierarchical organization.

#### Scenario: Specs listing with counts

- **WHEN** specifications exist in the project
- **THEN** system shows specs sorted by requirement count (descending) with count labels
- **AND** displays full hierarchical spec IDs (e.g., `cli/show` instead of just `show`)

#### Scenario: Specs with parsing errors

- **WHEN** a spec file cannot be parsed
- **THEN** system includes it with 0 requirement count

#### Scenario: Hierarchical specs in dashboard

- **WHEN** both flat and hierarchical specs exist
- **THEN** system displays all specs with their full IDs
- **AND** uses consistent formatting regardless of nesting depth

### Requirement: Summary Section

The dashboard SHALL display a summary section with key project metrics, including draft change count.

#### Scenario: Complete summary display

- **WHEN** dashboard is rendered with specs and changes
- **THEN** system shows total number of specifications (including all hierarchical specs) and requirements
- **AND** shows number of draft changes
- **AND** shows number of active changes in progress
- **AND** shows number of completed changes
- **AND** shows overall task progress percentage
