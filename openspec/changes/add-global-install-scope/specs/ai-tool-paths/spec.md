## MODIFIED Requirements

### Requirement: AIToolOption skillsDir field
The `AIToolOption` interface SHALL include scope support metadata in addition to path metadata.

#### Scenario: Scope support metadata present
- **WHEN** a tool entry is defined in `AI_TOOLS`
- **THEN** it MAY declare supported install scopes for skills and commands
- **AND** this metadata SHALL be used for effective scope resolution

### Requirement: Path configuration for supported tools
Path metadata SHALL support both project and global install targets via resolver logic.

#### Scenario: Project scope path
- **WHEN** effective scope is `project` for skills
- **THEN** skills SHALL be written under `<projectRoot>/<skillsDir>/skills/`

#### Scenario: Global scope path
- **WHEN** effective scope is `global` for a supported tool/surface
- **THEN** paths SHALL resolve to tool-specific global directories
- **AND** environment overrides (for example `CODEX_HOME`) SHALL be respected where applicable
