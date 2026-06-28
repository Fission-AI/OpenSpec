## ADDED Requirements

### Requirement: Recursive spec discovery
The system SHALL recursively walk the `openspec/specs/` directory tree to discover all specs at any nesting depth. A directory is a spec if and only if it contains a `spec.md` file. The spec ID SHALL be the `/`-separated relative path from `openspec/specs/` to the directory containing `spec.md`.

#### Scenario: Discover flat specs
- **WHEN** `openspec/specs/cli-show/spec.md` exists
- **THEN** the system discovers spec ID `cli-show`

#### Scenario: Discover nested specs
- **WHEN** `openspec/specs/cli/show/spec.md` exists
- **THEN** the system discovers spec ID `cli/show`

#### Scenario: Discover deeply nested specs
- **WHEN** `openspec/specs/domain/project/feature/spec.md` exists
- **THEN** the system discovers spec ID `domain/project/feature`

#### Scenario: Ignore intermediate directories without spec.md
- **WHEN** `openspec/specs/cli/` exists as a directory without `spec.md`
- **AND** `openspec/specs/cli/show/spec.md` exists
- **THEN** `cli` is NOT discovered as a spec
- **AND** `cli/show` IS discovered as a spec

#### Scenario: Skip hidden directories
- **WHEN** a directory under `openspec/specs/` starts with `.`
- **THEN** the system SHALL skip it and its children during discovery

#### Scenario: Mixed flat and nested coexist
- **WHEN** both `openspec/specs/cli-show/spec.md` and `openspec/specs/cli/show/spec.md` exist
- **THEN** both `cli-show` and `cli/show` are discovered as separate specs

### Requirement: Cross-platform spec ID normalization
Spec IDs SHALL always use `/` as the path separator, regardless of the operating system. The system SHALL normalize OS-specific path separators to `/` when constructing spec IDs from filesystem paths.

#### Scenario: Windows path normalization
- **WHEN** running on Windows where filesystem paths use `\`
- **AND** `openspec\specs\cli\show\spec.md` exists
- **THEN** the spec ID SHALL be `cli/show` (not `cli\show`)

#### Scenario: Spec ID to filesystem path conversion
- **WHEN** resolving spec ID `cli/show` to a filesystem path
- **THEN** the system SHALL use the OS-appropriate path separator for filesystem operations
- **AND** construct the path as `path.join(specsDir, 'cli', 'show', 'spec.md')`

### Requirement: Discovery performance
The system SHALL discover specs efficiently, avoiding unnecessary filesystem operations.

#### Scenario: Use fast-glob for recursive discovery
- **WHEN** discovering specs
- **THEN** the system SHALL use glob pattern `**/spec.md` under `openspec/specs/`
- **AND** exclude hidden directories from traversal

#### Scenario: Return sorted results
- **WHEN** returning discovered spec IDs
- **THEN** the results SHALL be sorted alphabetically
- **AND** hierarchical specs sort naturally (e.g., `cli/archive` before `cli/show`, and `cli-show` before `cli/show`)
