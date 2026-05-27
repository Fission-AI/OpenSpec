## MODIFIED Requirements
### Requirement: Active Changes Display
The dashboard SHALL show active changes with visual progress indicators.

#### Scenario: Active changes ordered by completion percentage
- **WHEN** multiple active changes are displayed with progress information
- **THEN** list them sorted by completion percentage ascending so 0% items appear first
- **AND** treat missing progress values as 0% for ordering
- **AND** break ties by change identifier in ascending alphabetical order to keep output deterministic
