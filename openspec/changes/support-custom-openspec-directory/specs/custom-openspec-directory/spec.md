## Purpose

Allow a project to relocate its complete OpenSpec directory without changing the workspace location of coding-agent integrations or adopting store machinery.

## ADDED Requirements

### Requirement: Environment selects the complete OpenSpec directory

OpenSpec SHALL accept `OPENSPEC_DIR` as a workspace-relative path to the complete directory for project config, specs, changes, and optional custom schemas, and SHALL use that directory consistently across every shipped command that reads or writes OpenSpec project data.

For discovery, a custom directory SHALL use the same qualification predicate as nearest-root selection: it qualifies when `specs/` or `changes/` is a planning directory that is not itself a store root, or when `config.yaml` or `config.yml` exists. A config-only directory therefore qualifies for selection, while config parsing and command-specific validation remain responsible for reporting malformed or incomplete content.

#### Scenario: Relative directory from workspace root

- **GIVEN** `OPENSPEC_DIR` is `ai/openspec`
- **AND** `ai/openspec` qualifies under the established nearest-root predicate
- **WHEN** the user runs a root-scoped command from the workspace root
- **THEN** the command SHALL read and write planning data under `ai/openspec`

#### Scenario: Relative directory from a workspace subdirectory

- **GIVEN** `OPENSPEC_DIR` is `ai/openspec`
- **AND** the user is inside a subdirectory of the same workspace
- **AND** no closer ancestor has its own qualifying `ai/openspec` directory
- **WHEN** the user runs a root-scoped command
- **THEN** OpenSpec SHALL resolve the nearest ancestor whose `ai/openspec` qualifies under that predicate
- **AND** the command SHALL use the same planning data as an invocation from the workspace root

#### Scenario: Nested workspace has its own custom directory

- **GIVEN** `OPENSPEC_DIR` is `ai/openspec`
- **AND** both an outer workspace and a nested workspace contain a qualifying `ai/openspec` directory
- **WHEN** the user runs a root-scoped command inside the nested workspace
- **THEN** OpenSpec SHALL treat the nested workspace as a separate workspace
- **AND** it SHALL select the nested workspace's `ai/openspec` directory

#### Scenario: Absolute directory is rejected

- **GIVEN** `OPENSPEC_DIR` is an absolute platform-native path to a valid OpenSpec directory
- **WHEN** the user runs a root-scoped command
- **THEN** the command SHALL fail with guidance to use a workspace-relative path
- **AND** it SHALL explain that standalone planning repositories use stores

#### Scenario: Relative directory escapes the workspace

- **GIVEN** `OPENSPEC_DIR` contains parent traversal that resolves outside the workspace candidate
- **WHEN** the user runs an OpenSpec command
- **THEN** the command SHALL fail before reading or writing project data

#### Scenario: Symlink escapes the workspace

- **GIVEN** `OPENSPEC_DIR` is a relative path whose existing candidate is a symlink
- **AND** the candidate's canonical path is outside the workspace ancestor that resolved it
- **WHEN** the user runs an OpenSpec command
- **THEN** the command SHALL fail before reading or writing project data

#### Scenario: Environment is unset or empty

- **WHEN** `OPENSPEC_DIR` is unset, empty, or whitespace-only
- **THEN** existing project and store root selection SHALL behave as before

#### Scenario: Config-only directory qualifies

- **GIVEN** `OPENSPEC_DIR` resolves to a directory containing `config.yaml` but no `specs/` or `changes/` directory
- **WHEN** OpenSpec performs root selection
- **THEN** it SHALL select that custom directory
- **AND** any config-content error SHALL be reported by the existing config validation path

### Requirement: Custom-directory selection is explicit and fail-closed

OpenSpec SHALL validate an environment-selected directory before a command mutates project data and SHALL NOT silently fall back to another project or store root when explicit custom-directory selection is invalid or conflicts with explicit store selection.

#### Scenario: Directory is missing

- **GIVEN** `OPENSPEC_DIR` names a directory that cannot be resolved
- **WHEN** the user runs a command other than `init`
- **THEN** the command SHALL fail with an actionable custom-directory diagnostic
- **AND** it SHALL NOT read from or write to the default `openspec/` directory

#### Scenario: Path is not a directory

- **GIVEN** `OPENSPEC_DIR` resolves to a file or another non-directory object
- **WHEN** the user runs an OpenSpec command
- **THEN** the command SHALL fail before reading or writing project data

#### Scenario: Explicit store conflicts with environment selection

- **GIVEN** `OPENSPEC_DIR` is set to a non-empty value
- **WHEN** the user also passes `--store <id>`
- **THEN** the command SHALL fail with guidance to choose one root source
- **AND** it SHALL NOT mutate either location

### Requirement: Root provenance exposes the authoritative directory

OpenSpec SHALL make the authoritative OpenSpec directory available to humans and agents so neither has to reconstruct it from the workspace or store root.

#### Scenario: Human command uses custom directory

- **WHEN** a human-mode command resolves `OPENSPEC_DIR`
- **THEN** stderr SHALL identify the selected custom OpenSpec directory before command-specific output

#### Scenario: JSON command reports custom directory

- **WHEN** a JSON command resolves `OPENSPEC_DIR`
- **THEN** its root object SHALL report `source: "environment"`
- **AND** it SHALL report the canonical absolute directory in `openspec_dir`

#### Scenario: Default project or store reports directory

- **WHEN** a JSON command resolves a default project root or registered store
- **THEN** its root object SHALL report the canonical absolute OpenSpec directory in `openspec_dir`
- **AND** existing root fields SHALL retain their meanings

### Requirement: Custom directories work across supported platforms

OpenSpec SHALL resolve custom-directory identity using platform-native path semantics and canonical existing-path identity on macOS, Linux, and Windows.

#### Scenario: Path contains spaces

- **GIVEN** `OPENSPEC_DIR` resolves to a valid directory whose path contains spaces
- **WHEN** the user completes a normal change lifecycle
- **THEN** creation, status, instructions, validation, and archive SHALL all use that directory

#### Scenario: Windows path and alias

- **GIVEN** a Windows path uses supported native separators or an existing filesystem alias
- **WHEN** OpenSpec resolves the custom directory
- **THEN** all commands SHALL agree on one canonical directory identity
- **AND** no command SHALL construct a mixed-separator filesystem path

### Requirement: Store behavior remains isolated

Custom project-directory selection SHALL reuse the canonical root contract without changing registered-store layout, identity, health, or registry behavior.

#### Scenario: Registered store is selected

- **WHEN** the user selects a registered store with `--store <id>` and `OPENSPEC_DIR` is unset or empty
- **THEN** the store SHALL continue using `<store root>/openspec`
- **AND** store identity and health validation SHALL remain unchanged

#### Scenario: Custom project needs no store metadata

- **WHEN** a project selects an in-workspace directory with `OPENSPEC_DIR`
- **THEN** OpenSpec SHALL NOT require store registration or store identity metadata
