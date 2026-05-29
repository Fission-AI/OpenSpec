## ADDED Requirements

### Requirement: Workspace command group
The CLI SHALL provide a dedicated `openspec workspace` command group for multi-repo workspace management.

#### Scenario: Workspace commands are available
- **WHEN** a user runs `openspec --help`
- **THEN** the CLI SHALL list a `workspace` command group
- **AND** that group SHALL include `init`, `sync`, and `doctor` subcommands

### Requirement: Workspace initialization
`openspec workspace init` SHALL scaffold a multi-repo workspace from an explicit root directory.

#### Scenario: Initialize a sibling-repo workspace
- **GIVEN** a workspace root containing multiple sibling repositories
- **WHEN** the user runs `openspec workspace init`
- **THEN** the command SHALL discover candidate repos and instruction files
- **AND** SHALL present the discovered entries for review before writing files
- **AND** SHALL create `openspec-workspace.yaml` at the workspace root
- **AND** SHALL scaffold the configured control-plane repo when missing

#### Scenario: Preserve repo-local instruction ownership
- **WHEN** `openspec workspace init` encounters an existing repo-local `AGENTS.md`
- **THEN** the command SHALL reference that file in the workspace manifest or router output
- **AND** SHALL NOT overwrite the repo-local file

### Requirement: Workspace sync
`openspec workspace sync` SHALL regenerate workspace-managed outputs from the manifest.

#### Scenario: Regenerate workspace router
- **GIVEN** a valid `openspec-workspace.yaml`
- **WHEN** the user runs `openspec workspace sync`
- **THEN** the command SHALL regenerate `.agents.md` when router generation is enabled
- **AND** SHALL use relative paths derived from the manifest
- **AND** SHALL report generated or updated files in its summary

### Requirement: Workspace diagnostics
`openspec workspace doctor` SHALL validate workspace topology and generated outputs.

#### Scenario: Missing referenced repo path
- **GIVEN** a manifest entry whose `path` does not exist
- **WHEN** the user runs `openspec workspace doctor`
- **THEN** the command SHALL report the missing path as a validation problem

#### Scenario: Stale generated router
- **GIVEN** `.agents.md` content that does not match the current manifest
- **WHEN** the user runs `openspec workspace doctor`
- **THEN** the command SHALL report the router as stale
- **AND** SHALL suggest running `openspec workspace sync`
