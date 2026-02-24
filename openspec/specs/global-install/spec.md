## ADDED Requirements

### Requirement: Global root resolution

The system SHALL resolve a tool's global installation root directory via the adapter interface.

#### Scenario: Adapter with known global root

- **WHEN** calling `getGlobalRoot()` on a tool adapter that supports global installation (e.g., Claude Code, OpenCode, Codex)
- **THEN** it SHALL return an absolute path to the tool's global configuration directory
- **AND** the path SHALL follow the tool's own documented convention per platform

#### Scenario: Adapter without global support

- **WHEN** calling `getGlobalRoot()` on a tool adapter that has no global filesystem path (e.g., Cursor, Windsurf)
- **THEN** it SHALL return `null`

#### Scenario: OPENSPEC_GLOBAL_ROOT override

- **WHEN** the `OPENSPEC_GLOBAL_ROOT` environment variable is set
- **THEN** the system SHALL use the env var value as the base path for all global installs, replacing the adapter's native global root
- **AND** the per-tool subdirectory structure SHALL be preserved under the override path

### Requirement: Global path derivation for commands

The system SHALL derive global command file paths from the adapter's global root.

#### Scenario: Deriving global command path

- **WHEN** a tool adapter returns a non-null global root
- **AND** the system needs the global path for a command
- **THEN** the system SHALL construct the absolute path by combining the global root with the tool's command path pattern (e.g., `<globalRoot>/commands/opsx/<id>.md` for Claude Code)

### Requirement: Global path derivation for skills

The system SHALL derive global skill file paths from the adapter's global root.

#### Scenario: Deriving global skill path

- **WHEN** a tool adapter returns a non-null global root
- **AND** the system needs the global path for a skill
- **THEN** the system SHALL construct the absolute path by combining the global root with the tool's skill path pattern (e.g., `<globalRoot>/skills/openspec-<id>/SKILL.md` for Claude Code)

### Requirement: Global tool path reference

The system SHALL use the following global root paths per tool and platform.

#### Scenario: Claude Code global root

- **WHEN** resolving the global root for Claude Code
- **THEN** on macOS and Linux it SHALL be `~/.claude/`
- **AND** on Windows it SHALL be `%APPDATA%\Claude\`

#### Scenario: OpenCode global root

- **WHEN** resolving the global root for OpenCode
- **THEN** it SHALL respect `$XDG_CONFIG_HOME` if set, defaulting to `~/.config/opencode/`
- **AND** on Windows it SHALL be `%APPDATA%\opencode\`

#### Scenario: Codex global root

- **WHEN** resolving the global root for Codex
- **THEN** it SHALL respect `$CODEX_HOME` if set, defaulting to `~/.codex/`
- **AND** on Windows it SHALL be `%USERPROFILE%\.codex\`

### Requirement: Global and local coexistence

Global and project-local installations SHALL coexist without conflict.

#### Scenario: Both global and local installed

- **WHEN** a tool has both global and project-local OpenSpec files
- **THEN** the project-local files SHALL take precedence per each tool's own resolution order
- **AND** global files serve as a fallback for projects without local installation

#### Scenario: Update scoping

- **WHEN** `openspec update` is run without `--global`
- **THEN** the system SHALL only update project-local files
- **AND** SHALL NOT modify globally-installed files
