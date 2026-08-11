# cli-change Specification

## Purpose
Document the removal of the deprecated noun-form `openspec change ...` command group and the canonical verb-first replacements.

## Requirements
### Requirement: Deprecated change command group is removed
The CLI SHALL NOT register a top-level `change` command group.

#### Scenario: Removed change command is unavailable
- **WHEN** executing `openspec change ...`
- **THEN** the command SHALL fail without running a change command action or emitting the former deprecation warning
- **AND** users SHALL use `openspec show`, `openspec list`, or `openspec validate` instead

### Requirement: Canonical change operations remain available
The CLI SHALL provide change operations through the canonical verb-first commands.

#### Scenario: Show a change
- **WHEN** executing `openspec show <change-id> --type change`
- **THEN** display the change using the existing top-level show behavior

#### Scenario: List changes
- **WHEN** executing `openspec list` or `openspec list --changes`
- **THEN** display active changes using the existing list behavior

#### Scenario: Validate a change
- **WHEN** executing `openspec validate <change-id> --type change`
- **THEN** validate the change using the existing top-level validate behavior

### Requirement: Change data is preserved
Removing the command group SHALL NOT delete or migrate change directories, proposals, delta specs, tasks, or archived changes.
