## ADDED Requirements

### Requirement: Schemas command SHALL honor authoritative root selection

`openspec schemas` SHALL resolve the authoritative OpenSpec root with the same precedence and diagnostics as other root-scoped commands, then list schemas using that root. The command SHALL accept `--store <id>` for explicit registered-store selection. Successful human output and successful `--json` output SHALL retain their existing formats.

#### Scenario: Nearest project root supplies schemas

- **GIVEN** the current directory is inside an OpenSpec root containing a project-local schema
- **WHEN** the user runs `openspec schemas --json`
- **THEN** the result SHALL include that root's project-local schema

#### Scenario: Explicit store overrides the current project

- **GIVEN** the current project and a registered store contain different project-local schemas
- **WHEN** the user runs `openspec schemas --json --store <id>`
- **THEN** the result SHALL include schemas from the selected store root
- **AND** it SHALL NOT include schemas that exist only in the current project

#### Scenario: Local store pointer supplies schemas

- **GIVEN** the nearest `openspec/config.yaml` is a config-only root declaring `store: <id>`
- **WHEN** the user runs `openspec schemas --json` without an explicit store flag
- **THEN** the result SHALL include schemas from the declared store root

#### Scenario: Global default store supplies schemas

- **GIVEN** no nearer OpenSpec root or pointer exists
- **AND** global configuration declares `defaultStore: <id>`
- **WHEN** the user runs `openspec schemas --json`
- **THEN** the result SHALL include schemas from the default store root

#### Scenario: Explicit store preserves root-selection precedence

- **GIVEN** a nearest project root, a global default store, and an explicitly selected registered store all exist
- **WHEN** the user runs `openspec schemas --json --store <id>`
- **THEN** the explicitly selected store SHALL supply the project-local schemas

#### Scenario: Nearest root precedes the global default

- **GIVEN** a nearest project root and a global default store contain different schemas
- **WHEN** the user runs `openspec schemas --json` without `--store`
- **THEN** the nearest project root SHALL supply the project-local schemas

#### Scenario: Rootless listing remains available without registered stores

- **GIVEN** no OpenSpec root, pointer, global default, or registered store exists
- **WHEN** the user runs `openspec schemas --json`
- **THEN** the command SHALL list user and package schemas using the current directory as its implicit root, as before

#### Scenario: Registered stores require an authoritative selection

- **GIVEN** no OpenSpec root, pointer, or global default exists
- **AND** one or more stores are registered
- **WHEN** the user runs `openspec schemas --json` without `--store`
- **THEN** the command SHALL fail with the standard root-selection diagnostic that asks the user to select a registered store
- **AND** it SHALL NOT silently list schemas from the current directory

#### Scenario: Invalid or unavailable store fails closed

- **WHEN** explicit, declared, or global-default store resolution fails
- **THEN** `openspec schemas` SHALL report the existing root-selection diagnostic and exit non-zero
- **AND** it SHALL NOT fall back to schemas from the current directory

#### Scenario: Removed store-path option is rejected deliberately

- **WHEN** the user runs `openspec schemas --store-path <path>`
- **THEN** the command SHALL reject the removed option with the standard instruction to register the store and use `--store <id>`

#### Scenario: Success output remains compatible

- **WHEN** root resolution succeeds
- **THEN** human output SHALL retain the existing schema listing and source labels
- **AND** `--json` output SHALL remain the existing top-level array of schema information

#### Scenario: Store path works across supported platforms

- **GIVEN** the selected store root uses a valid platform-native path, including a path containing spaces
- **WHEN** the user runs `openspec schemas --json --store <id>`
- **THEN** the command SHALL list schemas from that store without requiring the user or an Agent to compose a shell `cd` command
