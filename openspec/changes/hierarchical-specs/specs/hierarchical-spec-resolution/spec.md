## ADDED Requirements

### Requirement: Path-based spec ID resolution
The system SHALL resolve spec IDs that contain `/` by treating each segment as a directory level under `openspec/specs/`. The final segment is the directory containing `spec.md`.

#### Scenario: Resolve hierarchical spec ID
- **WHEN** resolving spec ID `cli/show`
- **THEN** the system SHALL look for `openspec/specs/cli/show/spec.md`

#### Scenario: Resolve flat spec ID
- **WHEN** resolving spec ID `cli-show`
- **THEN** the system SHALL look for `openspec/specs/cli-show/spec.md`
- **AND** maintain backward compatibility with existing flat structure

#### Scenario: Spec not found
- **WHEN** resolving a spec ID that does not exist
- **THEN** the system SHALL report the spec as not found
- **AND** suggest nearest matches from all discovered specs (flat and hierarchical)

### Requirement: Subtree filtering
The system SHALL support filtering specs by path prefix to show only specs within a given subtree.

#### Scenario: Filter by prefix
- **WHEN** listing specs with prefix `cli/`
- **THEN** return only specs whose ID starts with `cli/`
- **AND** exclude specs like `cli-show` that share the prefix string but are flat IDs

#### Scenario: Filter with trailing slash
- **WHEN** the user provides prefix `cli/`
- **THEN** the system treats it as a subtree filter
- **AND** returns specs like `cli/show`, `cli/validate`, `cli/list`

#### Scenario: Filter without trailing slash resolves as spec first
- **WHEN** the user provides `cli` without trailing slash
- **AND** `cli` is a valid spec ID (has `openspec/specs/cli/spec.md`)
- **THEN** resolve it as that specific spec

#### Scenario: Filter without trailing slash falls back to subtree
- **WHEN** the user provides `cli` without trailing slash
- **AND** `cli` is NOT a valid spec ID
- **AND** specs exist with prefix `cli/`
- **THEN** treat it as a subtree filter and list matching specs

### Requirement: Fuzzy matching for hierarchical IDs
The system SHALL extend fuzzy matching to support both full path matching and leaf-segment matching for hierarchical spec IDs.

#### Scenario: Full path fuzzy match
- **WHEN** the user types `cli/shw` (typo)
- **THEN** suggest `cli/show` based on edit distance on the full ID string

#### Scenario: Leaf segment match
- **WHEN** the user types `show`
- **AND** no exact match exists for flat spec ID `show`
- **AND** `cli/show` exists as a hierarchical spec
- **THEN** suggest `cli/show` as a match

#### Scenario: Multiple leaf matches
- **WHEN** the user types `show`
- **AND** both `cli/show` and `admin/show` exist
- **THEN** suggest both as matches, sorted alphabetically

### Requirement: Delta spec path resolution for changes
The system SHALL resolve delta spec paths within changes using the same hierarchical structure as main specs.

#### Scenario: Hierarchical delta spec
- **WHEN** a change modifies spec `cli/show`
- **THEN** the delta spec SHALL be located at `changes/<name>/specs/cli/show/spec.md`

#### Scenario: Flat delta spec
- **WHEN** a change modifies spec `cli-show`
- **THEN** the delta spec SHALL be located at `changes/<name>/specs/cli-show/spec.md`

#### Scenario: Discovery of delta specs in changes
- **WHEN** discovering delta specs within a change directory
- **THEN** the system SHALL recursively walk `changes/<name>/specs/` using the same discovery logic as main specs
