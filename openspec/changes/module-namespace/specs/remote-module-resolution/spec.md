# Remote Module Resolution Specification

## Purpose

Define how OpenSpec resolves modules that are located in remote git repositories, extending the module registry to support multi-repo architectures with read-only external specs.

## ADDED Requirements

### Requirement: Git-Based Module Location

The system SHALL support module locations specified as git repository references, with repository URL and optional ref (branch, tag, or commit).

#### Scenario: Module configured with git reference

- **WHEN** config contains:
  ```yaml
  modules:
    auth:
      git: github.com/org/auth-service
      ref: main
  ```
- **THEN** the system resolves the `auth` module by fetching specs from the specified git repository at the `main` branch

#### Scenario: Module configured with git ref as tag

- **WHEN** config contains:
  ```yaml
  modules:
    contracts:
      git: github.com/org/api-contracts
      ref: v2.1.0
  ```
- **THEN** the system resolves the `contracts` module using the `v2.1.0` tag

#### Scenario: Git ref defaults to HEAD

- **WHEN** config contains a git module without an explicit `ref` field
- **THEN** the system SHALL default to the repository's default branch

#### Scenario: Custom spec path within remote repo

- **WHEN** config contains:
  ```yaml
  modules:
    auth:
      git: github.com/org/auth-service
      ref: main
      path: docs/openspec/specs
  ```
- **THEN** the system uses `docs/openspec/specs` as the spec root instead of the default `openspec/specs/`

### Requirement: Read-Only Module Detection

The system SHALL detect whether a module is writable (local path) or read-only (git remote) and adjust apply-phase behavior accordingly.

#### Scenario: Local module is writable

- **WHEN** a module's location is a local filesystem path
- **THEN** the system marks the module as writable
- **AND** delta specs targeting this module are applied directly during archive

#### Scenario: Remote module is read-only

- **WHEN** a module's location is a git reference
- **THEN** the system marks the module as read-only
- **AND** delta specs targeting this module represent proposals, not direct writes

#### Scenario: Archive with read-only module deltas

- **WHEN** archiving a change that includes delta specs for a read-only module
- **THEN** the system SHALL skip applying those deltas to the remote module
- **AND** display a message listing the unapplied deltas: "Delta specs for remote module '{name}' were not applied (read-only). Coordinate with the module owner."
- **AND** the delta specs are preserved in the archive for reference

### Requirement: Remote Spec Caching

The system SHALL cache remote module specs locally to avoid repeated network fetches within a session.

#### Scenario: First access to remote module

- **WHEN** a remote module's specs are accessed for the first time
- **THEN** the system fetches the specs from the git repository
- **AND** caches them in a local directory (e.g., `.openspec/cache/{module-name}/`)

#### Scenario: Subsequent access uses cache

- **WHEN** a remote module's specs are accessed again within the same CLI invocation
- **THEN** the system uses the cached version without re-fetching

#### Scenario: Cache refresh

- **WHEN** executing with `--refresh-modules` flag
- **THEN** the system re-fetches all remote module specs regardless of cache state

#### Scenario: Network unavailable

- **WHEN** a remote module cannot be fetched (network error, repo not found)
- **AND** a cached version exists
- **THEN** the system uses the cached version and logs a warning
- **AND** the warning includes the cache age

#### Scenario: Network unavailable and no cache

- **WHEN** a remote module cannot be fetched and no cache exists
- **THEN** the system logs an error for that module
- **AND** operations targeting that module fail with a clear message

### Requirement: Shared Registry Manifest

The system SHALL support a `registry` field in config.yaml that points to an external file containing module definitions, enabling organization-wide module discovery.

#### Scenario: Registry points to a local file

- **WHEN** config contains `registry: ./shared/modules.yaml`
- **THEN** the system reads module definitions from that file
- **AND** merges them with any inline `modules` definitions in config.yaml

#### Scenario: Registry points to a git-hosted file

- **WHEN** config contains:
  ```yaml
  registry:
    git: github.com/org/openspec-registry
    ref: main
    path: modules.yaml
  ```
- **THEN** the system fetches and reads module definitions from the remote file

#### Scenario: Inline modules override registry modules

- **WHEN** both `registry` and `modules` define the same module name
- **THEN** the inline `modules` definition takes precedence
- **AND** the system logs a debug message about the override

#### Scenario: Registry file format

- **WHEN** reading a registry manifest file
- **THEN** the system expects YAML format with the same structure as the `modules` field in config.yaml:
  ```yaml
  payments: ./packages/payments
  auth:
    git: github.com/org/auth-service
    ref: main
  ```
