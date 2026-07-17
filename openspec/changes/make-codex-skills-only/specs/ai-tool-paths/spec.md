## ADDED Requirements

### Requirement: Codex skills path is the supported Codex integration path
The system SHALL identify `.codex/skills/` as the supported Codex OpenSpec workflow path.

#### Scenario: Codex skills path defined
- **WHEN** looking up the `codex` tool
- **THEN** the system SHALL provide `.codex` as the Codex skills base directory
- **AND** generated Codex skills SHALL be written under `<projectRoot>/.codex/skills/`

#### Scenario: Codex command path is not advertised as supported
- **WHEN** displaying AI tool path documentation or command-generation metadata
- **THEN** the system SHALL present Codex as a skills-only OpenSpec integration
- **AND** it SHALL NOT advertise `$CODEX_HOME/prompts/opsx-<id>.md` as a generated Codex command path

### Requirement: Codex global prompt cleanup path resolution
The system SHALL resolve the legacy Codex prompt cleanup directory using Codex home semantics.

#### Scenario: CODEX_HOME is set
- **WHEN** cleaning up previously managed Codex prompt files
- **AND** `CODEX_HOME` is set
- **THEN** the system SHALL inspect the `prompts` directory under the resolved `CODEX_HOME` path

#### Scenario: CODEX_HOME is unset
- **WHEN** cleaning up previously managed Codex prompt files
- **AND** `CODEX_HOME` is not set
- **THEN** the system SHALL inspect the `prompts` directory under the user's default `.codex` home

#### Scenario: Cross-platform Codex prompt paths
- **WHEN** resolving Codex skills or legacy prompt cleanup paths on Windows, macOS, or Linux
- **THEN** the system SHALL construct paths with platform path utilities
- **AND** it SHALL preserve correct path separators for the current operating system

### Requirement: Codex-managed legacy prompt cleanup patterns reflect the final managed surfaces
The system SHALL identify managed Codex prompt cleanup targets using the final split patterns for global and repo-local artifacts.

#### Scenario: Global legacy Codex prompts use an exact directory and filename allowlist
- **WHEN** detecting managed legacy Codex prompt files in the resolved Codex prompt directory
- **THEN** the system SHALL match only exact historical OpenSpec-owned filenames directly under that resolved directory
- **AND** it SHALL infer the represented workflow IDs from those filenames
- **AND** the allowlist SHALL include `opsx-update.md` mapped to the `update` workflow

#### Scenario: Repo-local openspec compatibility prompt names
- **WHEN** detecting legacy Codex prompt files in the project tree
- **THEN** the system SHALL match repo-local files named `.codex/prompts/openspec-*.md`

#### Scenario: Other Codex prompts are unmanaged
- **WHEN** a Codex prompt file does not match the managed pattern for its scope
- **THEN** cleanup SHALL leave that file unchanged
