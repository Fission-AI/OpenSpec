## Purpose

Lets teams declare store bindings inside their repository so that OpenSpec discovers stores automatically after clone, without requiring each developer to run `openspec store register` on their machine.

## ADDED Requirements

### Requirement: Project-scoped store registry discovery

The system SHALL discover a project-scoped store registry by walking up from the current working directory, looking for a `.openspec-store/registry.yaml` file. When found, the system SHALL merge it with the global registry, with project-scoped entries taking precedence on store ID conflicts.

#### Scenario: Store resolved from project-scoped registry
- **WHEN** a project contains `.openspec-store/registry.yaml` mapping a store ID to a relative path
- **AND** the user runs a command with `--store <id>` from within that project
- **THEN** the system resolves the store to the path relative to the registry file's directory
- **AND** no global registry registration is required

#### Scenario: Project-scoped registry not found
- **WHEN** no `.openspec-store/registry.yaml` exists in the current directory or any ancestor
- **THEN** the system resolves store IDs from the global registry
- **AND** existing behavior is unchanged

#### Scenario: Store ID not in project-scoped registry, present in global
- **WHEN** a project-scoped registry exists but does not contain the requested store ID
- **AND** the global registry contains the requested store ID
- **THEN** the system resolves the store from the global registry
- **AND** in JSON output, sets `source` to `'store'`; in human output, displays a warning that the store was resolved from the global registry

#### Scenario: Store ID not in project-scoped registry, not in global
- **WHEN** a project-scoped registry exists but does not contain the requested store ID
- **AND** the global registry also does not contain the requested store ID
- **THEN** the system reports an error listing available stores from both registries

#### Scenario: Project-scoped registry takes precedence over global registry
- **WHEN** a store ID is registered in both the project-scoped registry and the global registry
- **AND** the project-scoped registry maps the ID to a different path than the global registry
- **THEN** the system uses the path from the project-scoped registry
- **AND** in JSON output, sets `source` to `'project_store'`

#### Scenario: Project-scoped registry discovered from subdirectory
- **WHEN** `.openspec-store/registry.yaml` exists at the project root
- **AND** the user runs a command from a subdirectory of the project
- **THEN** the system discovers the registry by walking up to the project root

### Requirement: Relative path resolution in project-scoped registry

The system SHALL resolve store paths in a project-scoped registry relative to the directory containing the registry file, using platform-appropriate path joining.

#### Scenario: Relative path resolved from registry directory
- **WHEN** `.openspec-store/registry.yaml` at `/project/` maps store ID `specs` to path `specs`
- **THEN** the system resolves the store root to `/project/specs`

#### Scenario: Parent directory relative path
- **WHEN** `.openspec-store/registry.yaml` at `/project/app/` maps a store ID to path `../specs`
- **THEN** the system resolves the store root to `/project/specs`

#### Scenario: Cross-platform path handling
- **WHEN** the registry file is on Windows at `C:\project\`
- **AND** the store path is `specs`
- **THEN** the system resolves the store root using platform-appropriate path separators (`C:\project\specs`)

### Requirement: Project-scoped registry file format

The system SHALL accept a YAML file with a `version` field and a `stores` map. Each store entry maps a store ID to a path relative to the registry file's directory.

#### Scenario: Valid registry file
- **WHEN** `.openspec-store/registry.yaml` contains:
  ```yaml
  version: 1
  stores:
    platform-specs:
      path: platform-specs
  ```
- **THEN** the system parses the file and makes store ID `platform-specs` resolvable

#### Scenario: Malformed registry file
- **WHEN** `.openspec-store/registry.yaml` exists but contains invalid YAML
- **THEN** the system reports an error identifying the file and the parse failure
- **AND** resolves store IDs from the global registry

#### Scenario: Registry file with unsupported version
- **WHEN** `.openspec-store/registry.yaml` contains `version: 2`
- **THEN** the system reports an error identifying the file and the unsupported version
- **AND** resolves store IDs from the global registry

### Requirement: Backward compatibility with existing setups

The system SHALL NOT change behavior when no project-scoped registry file exists. All existing store resolution through the global registry SHALL continue to work without modification.

#### Scenario: No project-scoped registry, global registry used
- **WHEN** no `.openspec-store/registry.yaml` exists in the current directory or any ancestor
- **AND** a store is registered in the global registry
- **THEN** the system resolves the store from the global registry exactly as before

#### Scenario: No project-scoped registry, no global registration
- **WHEN** no `.openspec-store/registry.yaml` exists
- **AND** no store is registered in the global registry
- **THEN** the system reports the same error as before this feature was introduced

### Requirement: Project-scoped registry with multiple stores

The system SHALL support multiple store entries in a single project-scoped registry file, each mapping to an independent path.

#### Scenario: Multiple stores in one registry
- **WHEN** `.openspec-store/registry.yaml` contains:
  ```yaml
  version: 1
  stores:
    platform-specs:
      path: platform-specs
    design-system-specs:
      path: design-system-specs
  ```
- **THEN** both store IDs are resolvable from within the project

#### Scenario: Multiple clones of the same repository
- **WHEN** two clones of the same repository exist on the same machine
- **AND** each clone has its own `.openspec-store/registry.yaml` with the same store IDs
- **THEN** each clone resolves store IDs from its own project-scoped registry
- **AND** no conflict occurs between the clones, even if the global registry contains the same store IDs
