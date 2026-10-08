## Purpose

Lets teams declare store bindings inside their repository so that OpenSpec discovers stores automatically after clone, without requiring each developer to run `openspec store register` on their machine.

## ADDED Requirements

### Requirement: Project-scoped store registry discovery

The system SHALL discover and resolve store IDs by walking up from the current working directory, looking for a `.openspec-store/registry.yaml` file at each level; the nearest registry that contains the ID wins, and when no project-scoped registry in the chain contains the ID, the system falls back to the global registry.

#### Scenario: Store resolved from project-scoped registry
- **WHEN** a project contains `.openspec-store/registry.yaml` mapping a store ID to a relative path
- **AND** the user runs a command with `--store <id>` from within that project
- **THEN** the system resolves the store to the path relative to the directory containing `.openspec-store/`
- **AND** no global registry registration is required
- **AND** in JSON output, sets `source` to `'project_store'`

#### Scenario: Project-scoped registry not found
- **WHEN** no `.openspec-store/registry.yaml` exists in the current directory or any ancestor
- **THEN** the system resolves store IDs from the global registry
- **AND** existing behavior is unchanged

#### Scenario: Store ID not in project-scoped registry, present in global
- **WHEN** no `.openspec-store/registry.yaml` in the ancestor chain contains the requested store ID
- **AND** the global registry contains the requested store ID
- **THEN** the system resolves the store from the global registry
- **AND** in JSON output, sets `source` to `'store'`

#### Scenario: Store ID found in ancestor project-scoped registry
- **WHEN** `.openspec-store/registry.yaml` at the current level does not contain the requested store ID
- **AND** `.openspec-store/registry.yaml` at an ancestor level contains the requested store ID
- **THEN** the system resolves the store from the ancestor registry
- **AND** in JSON output, sets `source` to `'project_store'`

#### Scenario: Store ID not in project-scoped registry, not in global
- **WHEN** no `.openspec-store/registry.yaml` in the ancestor chain contains the requested store ID
- **AND** the global registry also does not contain the requested store ID
- **THEN** the system reports an error that the store ID is not registered in any available registry

#### Scenario: Store ID found in registry but folder missing is an error
- **WHEN** the user runs a command with `--store <id>`
- **AND** the store ID is found in a project-scoped registry
- **AND** the resolved store folder does not exist on disk
- **THEN** the system reports an error that the store folder is missing
- **AND** does not fall back to the global registry

#### Scenario: Project-scoped registry takes precedence over global registry
- **WHEN** a store ID is registered in both the project-scoped registry and the global registry
- **AND** the project-scoped registry maps the ID to a different path than the global registry
- **THEN** the system uses the path from the project-scoped registry
- **AND** in JSON output, sets `source` to `'project_store'`

#### Scenario: Store pointer resolved through project-scoped registry
- **WHEN** config.yaml contains a `store:` pointer to a store ID
- **AND** that store ID is found in a project-scoped registry
- **THEN** the system resolves the store from the project-scoped registry
- **AND** in JSON output, sets `source` to `'project_store'`

#### Scenario: References resolved through project-scoped registry
- **WHEN** a `references:` entry names a store ID
- **AND** that store ID is found in a project-scoped registry along the ancestor chain
- **THEN** the system resolves the referenced store from the project-scoped registry
- **AND** reports no warning for the reference

#### Scenario: References resolve when the global registry is unreadable
- **WHEN** a `references:` entry names a store ID found in a project-scoped registry
- **AND** the global registry file is unreadable
- **THEN** the system still resolves the referenced store from the project-scoped registry

#### Scenario: Project-scoped registry discovered from subdirectory
- **WHEN** `.openspec-store/registry.yaml` exists at the project root
- **AND** the user runs a command from a subdirectory of the project
- **THEN** the system discovers the registry by walking up to the project root

#### Scenario: Project-scoped registry used as default root when no local root exists
- **WHEN** `.openspec-store/registry.yaml` exists and contains at least one store entry
- **AND** no `--store` flag is provided
- **AND** no `openspec/` root is found by walking up from the current directory
- **THEN** the system resolves the first store entry in document order from the nearest `.openspec-store/registry.yaml` as the root
- **AND** in JSON output, sets `source` to `'project_store'`

#### Scenario: Discovery reports an error when the first store entry is unusable
- **WHEN** no `--store` flag is provided and no local `openspec/` root exists
- **AND** the first store entry in document order points to a folder that does not exist
- **THEN** the system reports an error that the store folder is missing
- **AND** does not continue to the next entry

#### Scenario: Store setup does not write a project-scoped registry
- **WHEN** the user runs `openspec store setup <id>`
- **THEN** the system creates the store and registers it in the global registry
- **AND** does not create or modify any `.openspec-store/registry.yaml`

### Requirement: Relative path resolution in project-scoped registry

The system SHALL resolve store paths in a project-scoped registry relative to the directory containing `.openspec-store/`, using platform-appropriate path joining.

#### Scenario: Relative path resolved from registry directory
- **WHEN** `.openspec-store/registry.yaml` at `/project/` maps a store ID to path `store-a`
- **THEN** the system resolves the store root to `/project/store-a`

#### Scenario: Parent directory relative path
- **WHEN** `.openspec-store/registry.yaml` at `/project/app/` maps a store ID to path `../specs`
- **THEN** the system resolves the store root to `/project/specs`

#### Scenario: Cross-platform path handling
- **WHEN** the registry file is on Windows at `C:\project\`
- **AND** the store path is `specs`
- **THEN** the system resolves the store root using platform-appropriate path separators (`C:\project\specs`)

#### Scenario: Absolute and parent paths are accepted
- **WHEN** `.openspec-store/registry.yaml` maps a store ID to an absolute path (e.g. `/home/me/store`) or a parent-relative path (e.g. `../platform-specs`)
- **THEN** the system resolves the store root without error
- **AND** does not restrict paths to within the project directory

### Requirement: Project-scoped registry file format

The system SHALL accept a YAML file with a `version` field and a `stores` map where each store entry maps a store ID to a path relative to the directory containing `.openspec-store/`.

#### Scenario: Valid registry file
- **WHEN** `.openspec-store/registry.yaml` contains:
  ```yaml
  version: 1
  stores:
    store-a:
      path: store-a
  ```
- **THEN** the system parses the file and makes store ID `store-a` resolvable

#### Scenario: Malformed registry file
- **WHEN** `.openspec-store/registry.yaml` exists but contains invalid YAML
- **THEN** the system reports a warning identifying the file as malformed
- **AND** the walk continues to ancestor registries or the global registry

#### Scenario: Registry file with unsupported version
- **WHEN** `.openspec-store/registry.yaml` contains `version: 2`
- **THEN** the system reports a warning identifying the file as malformed
- **AND** the walk continues to ancestor registries or the global registry

#### Scenario: Registry file missing version field
- **WHEN** `.openspec-store/registry.yaml` exists but has no `version` field
- **THEN** the system reports a warning identifying the file as malformed
- **AND** the walk continues to ancestor registries or the global registry

#### Scenario: Registry file missing stores field
- **WHEN** `.openspec-store/registry.yaml` contains `version: 1` but no `stores` map
- **THEN** the system reports a warning identifying the file as malformed
- **AND** the walk continues to ancestor registries or the global registry

#### Scenario: Empty registry file
- **WHEN** `.openspec-store/registry.yaml` contains `stores: {}` and no entries
- **THEN** the system treats the file as a valid registry with no stores
- **AND** reports no warning

### Requirement: Backward compatibility with existing setups

The system SHALL preserve existing store resolution behavior when no project-scoped registry file exists, so that all store resolution through the global registry continues to work without modification.

#### Scenario: No project-scoped registry, global registry used
- **WHEN** no `.openspec-store/registry.yaml` exists in the current directory or any ancestor
- **AND** a store is registered in the global registry
- **THEN** the system resolves the store from the global registry exactly as before

#### Scenario: No project-scoped registry, no global registration
- **WHEN** no `.openspec-store/registry.yaml` exists
- **AND** no store is registered in the global registry
- **THEN** the system reports an error that the store ID is not registered in any available registry

### Requirement: Project-scoped registry with multiple stores

The system SHALL support multiple store entries in a single project-scoped registry file, each mapping to an independent path.

#### Scenario: Multiple stores in one registry
- **WHEN** `.openspec-store/registry.yaml` contains:
  ```yaml
  version: 1
  stores:
    store-a:
      path: store-a
    store-b:
      path: store-b
  ```
- **THEN** both store IDs are resolvable from within the project

#### Scenario: Multiple clones of the same repository
- **WHEN** two clones of the same repository exist on the same machine
- **AND** each clone has its own `.openspec-store/registry.yaml` with the same store IDs
- **THEN** each clone resolves store IDs from its own project-scoped registry
- **AND** no conflict occurs between the clones, even if the global registry contains the same store IDs

### Requirement: Project-scoped registry operations follow the discovery walk

The system SHALL apply the discovery walk to `openspec store list --scope project`, `openspec store unregister <id> --scope project`, `openspec store remove <id> --scope project`, and `openspec store doctor [id] --scope project`: these commands resolve the chain of `.openspec-store/registry.yaml` files upward from the current working directory.

#### Scenario: List shows all registries in the chain
- **WHEN** `store list --scope project` is run from a nested directory
- **AND** `.openspec-store/registry.yaml` exists at both the nested level and an ancestor level
- **THEN** the list includes entries from every registry in the chain, nearest first
- **AND** each entry carries the directory of the registry that owns it
- **AND** when the same store ID appears in multiple registries, the first entry in the list is the one that wins resolution

#### Scenario: List from a directory with no registry
- **WHEN** `store list --scope project` is run from a directory with no `.openspec-store/registry.yaml` in it or any ancestor
- **THEN** the list is empty
- **AND** no error is reported

#### Scenario: Malformed registry during an operation walk
- **WHEN** `store list --scope project` is run
- **AND** a `.openspec-store/registry.yaml` in the chain is malformed
- **THEN** the system reports a warning identifying the file as malformed
- **AND** skips that registry and continues with the next level up

#### Scenario: Unregister removes from the nearest registry containing the id
- **WHEN** `store unregister <id> --scope project` is run from a nested directory
- **AND** the id is registered in an ancestor `.openspec-store/registry.yaml`
- **THEN** the system removes the entry from that ancestor registry
- **AND** reports the registry file it edited

#### Scenario: Unregister with the id in multiple registries
- **WHEN** `store unregister <id> --scope project` is run from a directory where the id is registered in both the nearest and an ancestor registry
- **THEN** the system removes the entry from the nearest registry only
- **AND** leaves the ancestor registration unchanged

#### Scenario: Unregister with the id in no project registry
- **WHEN** `store unregister <id> --scope project` is run
- **AND** no `.openspec-store/registry.yaml` in the chain contains the id
- **THEN** the system reports an error that the id is not registered

#### Scenario: Doctor checks the whole chain
- **WHEN** `store doctor --scope project` is run from a nested directory
- **AND** `.openspec-store/registry.yaml` exists at multiple levels of the chain
- **THEN** doctor inspects stores from every registry in the chain

#### Scenario: Doctor by id resolves through the chain
- **WHEN** `store doctor <id> --scope project` is run from a nested directory
- **AND** the id is registered only in an ancestor registry
- **THEN** doctor inspects the store from the ancestor registry

#### Scenario: Store list shows entries with missing folders as a warning
- **WHEN** `store list --scope project` is run
- **AND** a store entry points to a folder that does not exist on disk
- **THEN** the list includes the entry with a warning indicating the folder is missing
- **AND** the command completes successfully

#### Scenario: Doctor reports an unusable store entry without stopping
- **WHEN** `store doctor --scope project` is run
- **AND** a store entry points to a folder that does not exist on disk
- **THEN** doctor reports the problem and a pasteable fix for that entry
- **AND** continues inspecting remaining entries

#### Scenario: Unregister succeeds when the store folder is missing
- **WHEN** `store unregister <id> --scope project` is run
- **AND** the id is found in a project-scoped registry
- **AND** the store folder does not exist on disk
- **THEN** the system removes the registry entry
- **AND** reports a warning that the folder was not found
- **AND** the command completes successfully

#### Scenario: Remove is refused when the store folder is missing
- **WHEN** `store remove <id> --scope project` is run
- **AND** the id is found in a project-scoped registry
- **AND** the store folder does not exist on disk
- **THEN** the system reports an error that the folder is missing
- **AND** does not remove the registry entry
- **AND** does not delete any files

### Requirement: Project-scoped remove requires confirmation

The system SHALL require confirmation before `openspec store remove <id> --scope project` deletes a store.

#### Scenario: Remove with --scope project deletes the folder and binding after confirmation
- **WHEN** `store remove <id> --scope project` is run from a nested directory
- **AND** the id is registered in an ancestor `.openspec-store/registry.yaml`
- **THEN** the system requires confirmation (`--yes` in non-interactive mode)
- **AND** deletes the store's folder from disk
- **AND** removes the entry from the ancestor registry
- **AND** reports the registry file it edited

#### Scenario: Remove without confirmation is refused
- **WHEN** `store remove <id> --scope project` is run outside interactive mode
- **AND** no `--yes` flag is provided
- **THEN** the system refuses to delete and reports a `store_remove_confirmation_required` error

### Requirement: Project-scoped register writes at the current level

The system SHALL write the registry entry for `openspec store register <path> --scope project` to `.openspec-store/registry.yaml` in the directory where the command is run.

#### Scenario: Register writes at the level where the command is run
- **WHEN** `store register <path> --scope project` is run from a directory
- **AND** the store path is inside that directory
- **THEN** the registry entry is written to `.openspec-store/registry.yaml` in that directory
