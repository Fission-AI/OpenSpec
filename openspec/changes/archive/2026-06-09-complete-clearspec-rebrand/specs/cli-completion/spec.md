## MODIFIED Requirements

### Requirement: Dynamic Completions

The completion system SHALL provide context-aware dynamic completions for project-specific values.

#### Scenario: Completing change IDs

- **WHEN** completing arguments for commands that accept change names (show, validate, archive)
- **THEN** discover active changes from `clearspec/changes/` directory
- **AND** exclude archived changes in `clearspec/changes/archive/`
- **AND** return change IDs as completion suggestions
- **AND** only provide suggestions when inside a ClearSpec-enabled project

#### Scenario: Completing spec IDs

- **WHEN** completing arguments for commands that accept spec names (show, validate)
- **THEN** discover specs from `clearspec/specs/` directory
- **AND** return spec IDs as completion suggestions
- **AND** only provide suggestions when inside a ClearSpec-enabled project
