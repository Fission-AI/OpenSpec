## ADDED Requirements

### Requirement: Library-specific integration updates
Update SHALL select one project library before rewriting integrations or generated files. It SHALL preserve explicit positional project paths, honor --library, and use the nearest selected local project by default. Multiple descendant targets without a nearest root SHALL require explicit selection.

#### Scenario: Update a descendant project
- **WHEN** update selects a descendant with --library batch-worker
- **THEN** update only that project's configured integrations and generated files

#### Scenario: No nearest update target
- **WHEN** update runs above several libraries without an explicit project
- **THEN** list possible project paths and exit before writing integrations
