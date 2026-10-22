## ADDED Requirements

### Requirement: Clearing completed todos
The list SHALL remove every completed todo when a caller clears completed todos, and SHALL return the number of todos removed.

#### Scenario: Completed todos are removed
- **WHEN** a list has two completed todos and one open todo and a caller clears completed todos
- **THEN** only the open todo remains and the call returns 2

#### Scenario: Nothing to clear
- **WHEN** a list has no completed todos and a caller clears completed todos
- **THEN** the list is unchanged and the call returns 0
