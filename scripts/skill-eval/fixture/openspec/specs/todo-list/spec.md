# todo-list Specification

## Purpose
An in-memory list of todo items that callers can add to, complete, and read.

## Requirements
### Requirement: Adding a todo
The list SHALL add a todo with a trimmed, non-empty title, a unique numeric id, and `done` set to false.

#### Scenario: Title is trimmed
- **WHEN** a caller adds a todo titled "  Buy milk "
- **THEN** the returned item has the title "Buy milk" and `done` is false

#### Scenario: Empty title is rejected
- **WHEN** a caller adds a todo whose title is empty or only whitespace
- **THEN** the list throws an error saying the title is required

### Requirement: Completing a todo
The list SHALL mark an existing todo as done by id.

#### Scenario: Known id
- **WHEN** a caller completes a todo by its id
- **THEN** that todo's `done` is true

#### Scenario: Unknown id
- **WHEN** a caller completes an id that does not exist
- **THEN** the list throws an error naming the id

### Requirement: Reading todos
The list SHALL return copies of every todo in the order they were added.

#### Scenario: Callers cannot mutate the list
- **WHEN** a caller changes a returned item
- **THEN** the stored todo is unchanged
