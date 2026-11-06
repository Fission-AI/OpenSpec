## ADDED Requirements

### Requirement: Library-aware item display
The show command SHALL discover items across the local library scope, show library labels in interactive choices, and resolve a named item to its unique owner. It SHALL honor --library and existing --type flags and emit ambiguity diagnostics containing the candidate libraries.

#### Scenario: Show a descendant spec
- **WHEN** show names a spec that exists in one descendant library
- **THEN** show that library's spec content using existing formatting and JSON options

#### Scenario: Select duplicate changes interactively
- **WHEN** two libraries contain a change with the same name
- **THEN** offer separate labeled choices and display the selected owner's change

#### Scenario: Ambiguous direct show
- **WHEN** direct show names an item in multiple libraries
- **THEN** report their relative project paths and --library examples without displaying an arbitrary item
