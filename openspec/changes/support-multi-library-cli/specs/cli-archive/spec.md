## ADDED Requirements

### Requirement: Archive owning library selection
Archive SHALL resolve a named change within the discovered scope before any task check, spec write, or archive move. It SHALL require an explicit library selection for duplicate names and keep all existing archive checks and prompts within the selected library.

#### Scenario: Archive a unique descendant change
- **WHEN** archive names a change found only in a descendant library
- **THEN** merge its delta into that library's specs and move it to that library's archive

#### Scenario: Duplicate archive names
- **WHEN** two discovered libraries contain the named change
- **THEN** report both paths and exit without modifying either library

#### Scenario: Unreadable candidate library
- **WHEN** a candidate library cannot be inspected when establishing archive ownership
- **THEN** report incomplete selection and leave all artifacts unchanged
