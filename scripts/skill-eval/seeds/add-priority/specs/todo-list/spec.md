## ADDED Requirements

### Requirement: Todo priority
The list SHALL record a priority of `low`, `normal`, or `high` on every todo, defaulting to `normal`, and SHALL reject any other priority.

#### Scenario: Default priority
- **WHEN** a caller adds a todo without a priority
- **THEN** the returned item's priority is `normal`

#### Scenario: Explicit priority
- **WHEN** a caller adds a todo with priority `high`
- **THEN** the returned item's priority is `high`

#### Scenario: Unknown priority is rejected
- **WHEN** a caller adds a todo with priority `urgent`
- **THEN** the list throws an error naming the allowed priorities
