# Context Store As Standalone OpenSpec Root Spec

## Outcome

`context-store setup` and `context-store register` treat a context store as a
normal standalone OpenSpec root with a thin identity file.

After setup or registration, the durable planning state lives in normal
OpenSpec artifacts: config, specs, changes, and archived changes. The
`.openspec-store/` directory remains identity or local registry metadata, not a
separate planning model.

The existing beta context-store, initiative, and workspace shapes are not a
compatibility contract. This slice ignores old beta files unless they are the
thin `.openspec-store/store.yaml` identity file used by the new model.

## User Experience

A human or agent can create or register a standalone OpenSpec repo and then see
the same root shape they would expect from a normal OpenSpec project:

```text
context-store-root/
  .openspec-store/
    store.yaml
  openspec/
    config.yaml
    specs/
    changes/
      archive/
```

The command output and help point users toward normal OpenSpec specs and
changes, not initiatives, workspace-owned planning, generated agent files, or
collection-specific state.

In plain terms:

```text
context store = normal OpenSpec root + .openspec-store/store.yaml
```

## Scope

In scope:

- Root shape parity for `context-store setup` and `context-store register`.
- Default config creation during setup.
- Safe handling of missing, empty, Git-only, and existing healthy OpenSpec-root
  directories.
- Registering cloned or existing context stores on the local machine.
- Turning a healthy standalone OpenSpec root into a context store only after
  clear user confirmation.
- Separate `context-store doctor` reporting for OpenSpec-root health.
- Tests that verify setup, register, doctor, idempotency for the new model, and
  unsafe-folder behavior.

Out of scope:

- Store selectors for core lifecycle commands.
- Creating initiative links or initiative collections.
- Workspace-owned planning behavior.
- Agent/tool installation, generated commands, migration, or onboarding flows.
- Clone, pull, push, sync, branch, worktree, dashboard, apply, verify, or archive
  orchestration.
- Migrating, preserving, or cleaning up old beta context-store, initiative, or
  workspace file shapes.
- Public terminology cleanup or broad documentation rewrites.

## Acceptance Criteria

### Setup Ensures A Normal Root

`context-store setup` creates or preserves a healthy OpenSpec root. A healthy
OpenSpec root contains `openspec/`, a config file
(`openspec/config.yaml` or `openspec/config.yml`), `openspec/specs/`,
`openspec/changes/`, and `openspec/changes/archive/`.

When setup creates a config file, it creates `openspec/config.yaml` with the
default `spec-driven` schema.

#### Scenario: Setting Up A Missing Or Empty Store

- **GIVEN** a missing directory or empty directory
- **WHEN** the user runs `context-store setup`
- **THEN** OpenSpec leaves the directory with `.openspec-store/store.yaml`
- **AND** `openspec/config.yaml` exists with the default `spec-driven` schema
- **AND** `openspec/specs/`, `openspec/changes/`, and
  `openspec/changes/archive/` exist
- **AND** JSON output reports the relative paths created by the operation in
  `created_files`

#### Scenario: Accepting A Git-Only Directory

- **GIVEN** an existing directory that contains only `.git/`
- **WHEN** the user runs `context-store setup`
- **THEN** OpenSpec treats the directory as a safe fresh store
- **AND** OpenSpec preserves `.git/`
- **AND** OpenSpec creates the context-store identity metadata and healthy
  OpenSpec root

#### Scenario: Preserving An Existing Healthy Root

- **GIVEN** an initialized standalone OpenSpec root
- **WHEN** the user runs `context-store setup`
- **THEN** OpenSpec preserves existing config, specs, changes, and archived
  changes
- **AND** OpenSpec creates `.openspec-store/store.yaml` when identity metadata
  is missing

#### Scenario: Creating Default Config Non-Interactively

- **GIVEN** setup runs in non-interactive or JSON mode without tool selection
- **AND** no `openspec/config.yaml` or `openspec/config.yml` exists
- **WHEN** setup completes successfully
- **THEN** `openspec/config.yaml` exists with the default `spec-driven` schema

#### Scenario: Preserving Existing Config

- **GIVEN** `openspec/config.yaml` or `openspec/config.yml` already exists
- **WHEN** setup completes successfully
- **THEN** OpenSpec preserves the existing config file

#### Scenario: Rejecting Unsafe Folders

- **GIVEN** an arbitrary non-empty unmarked folder
- **WHEN** the user runs `context-store setup`
- **THEN** OpenSpec rejects it without treating it as a store root
- **AND** it does not create context-store metadata or OpenSpec-root files in
  that folder

#### Scenario: Rejecting Nested Git Setup Paths

- **GIVEN** a setup target path inside another Git repository
- **WHEN** the user runs `context-store setup`
- **THEN** OpenSpec rejects the path as unsafe for this slice
- **AND** it does not create context-store metadata or OpenSpec-root files in
  that path

### Register Requires An Existing Root

`context-store register` remembers a local clone or existing local root on this
machine. It does not initialize planning files.

#### Scenario: Registering A Cloned Context Store

- **GIVEN** an existing healthy OpenSpec root with `.openspec-store/store.yaml`
- **WHEN** the user runs `context-store register`
- **THEN** OpenSpec registers it
- **AND** OpenSpec writes local registry state only when needed
- **AND** OpenSpec does not create or rewrite OpenSpec planning files

#### Scenario: Turning A Healthy Root Into A Context Store

- **GIVEN** an existing healthy OpenSpec root without `.openspec-store/store.yaml`
- **WHEN** the user runs `context-store register`
- **THEN** OpenSpec asks whether to turn the root into the named context store
- **AND** if the user confirms, OpenSpec creates `.openspec-store/store.yaml`
  and registers the store locally
- **AND** if the user declines, OpenSpec does not write metadata or registry
  state

#### Scenario: Refusing Unconfirmed Non-Interactive Conversion

- **GIVEN** an existing healthy OpenSpec root without `.openspec-store/store.yaml`
- **WHEN** the user runs `context-store register` in non-interactive or JSON mode
  without explicit confirmation
- **THEN** OpenSpec refuses to convert the root into a context store
- **AND** OpenSpec does not write metadata or registry state

#### Scenario: Refusing Arbitrary Directories

- **GIVEN** a missing directory, partial OpenSpec root, or existing directory
  that is not a healthy OpenSpec root
- **WHEN** the user runs `context-store register`
- **THEN** OpenSpec refuses to register it
- **AND** OpenSpec does not silently initialize it as an OpenSpec root
- **AND** OpenSpec does not create `.openspec-store/store.yaml` or local
  registry state

### Metadata Stays Thin

Context-store metadata remains identity or registry metadata only.

#### Scenario: Avoiding Old Planning Models In This Slice

- **WHEN** setup or register completes
- **THEN** OpenSpec does not create initiative links, initiative collections, or
  workspace-owned planning state
- **AND** OpenSpec does not install generated agent skills, slash commands, or
  tool configuration files into the store
- **AND** OpenSpec does not run full `openspec init`, tool detection, legacy
  cleanup, migration, skill generation, command generation, or onboarding flows

#### Scenario: Ignoring Old Beta Files

- **GIVEN** a directory contains old beta files such as `initiatives/`,
  `.openspec-workspace/`, `workspace.yaml`, `AGENTS.md`, `.codex/`, `.claude/`,
  or `.cursor/`
- **WHEN** setup or register succeeds for the new model
- **THEN** OpenSpec ignores those files for this slice
- **AND** OpenSpec does not migrate, upgrade, delete, or repair those files
- **AND** OpenSpec does not treat those files as proof that the folder is a
  healthy OpenSpec root or valid context store
- **AND** OpenSpec does not preserve old beta planning behavior as a requirement

#### Scenario: Validating Thin Identity Metadata

- **GIVEN** `.openspec-store/store.yaml` exists
- **WHEN** setup, register, or doctor reads it
- **THEN** OpenSpec treats it as the context-store identity file
- **AND** the file must match the thin identity shape for the new model
- **AND** invalid or mismatched identity metadata is reported as a metadata issue

### Doctor Separates Root Health

`context-store doctor` reports OpenSpec-root health separately from
context-store metadata and Git health. In JSON output, each store includes a
distinct `openspec_root` section.

#### Scenario: Reporting OpenSpec Root Health

- **WHEN** doctor inspects a context store
- **THEN** the report covers the `openspec/` directory,
  `openspec/config.yaml` or `openspec/config.yml`, `openspec/specs/`,
  `openspec/changes/`, and `openspec/changes/archive/`
- **AND** root-health issues are distinguishable from metadata and Git issues in
  human and JSON output
- **AND** JSON output includes `openspec_root` separately from `metadata` and
  `git`
- **AND** doctor does not mutate files

#### Scenario: Reporting Without Repairing

- **GIVEN** a registered context store has valid metadata and Git state but is
  missing `openspec/changes/archive/`
- **WHEN** doctor inspects the context store
- **THEN** doctor reports the missing archive directory under `openspec_root`
- **AND** doctor does not create `openspec/changes/archive/`

### Safety, Not Beta Compatibility

This slice protects user-authored files and repeatable command behavior. It does
not treat previous beta context-store behavior as a stable surface.

#### Scenario: Repeating Setup Or Register

- **GIVEN** the same context-store id and path are already registered and the
  OpenSpec root is healthy
- **WHEN** setup or register runs again for that root
- **THEN** OpenSpec reports that the store is already registered, already exists,
  or has nothing to change
- **AND** OpenSpec does not mutate files just to prove the command worked
- **AND** JSON output reports no newly created files for the no-op operation
- **AND** OpenSpec does not duplicate registry entries

#### Scenario: Preserving User Edits Across Reruns

- **GIVEN** the user edits `openspec/config.yaml` or `openspec/config.yml` after
  setup
- **WHEN** setup or register runs again for that root
- **THEN** OpenSpec preserves the edited config file
- **AND** OpenSpec preserves user-authored specs, changes, archived changes, and
  valid identity metadata

#### Scenario: Preserving User Content On Failure

- **GIVEN** setup or register creates files or directories during an operation
- **WHEN** the operation fails before completion
- **THEN** OpenSpec removes only files and empty directories it created during
  that operation
- **AND** OpenSpec preserves unrelated user content
