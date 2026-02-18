## ADDED Requirements

### Requirement: Profile definitions
The system SHALL support two workflow profiles: `core` and `custom`.

#### Scenario: Core profile contents
- **WHEN** profile is set to `core`
- **THEN** the profile SHALL include workflows: `propose`, `explore`, `apply`, `archive`

#### Scenario: Custom profile contents
- **WHEN** profile is set to `custom`
- **THEN** the profile SHALL include only the workflows specified in global config `workflows` array

### Requirement: Delivery is independent of profile
The delivery setting controls HOW workflows are installed, separate from WHICH workflows are installed.

#### Scenario: Core profile with custom delivery
- **WHEN** profile is set to `core`
- **AND** delivery is set to `skills`
- **THEN** the system SHALL install core workflows as skills only (no commands)

#### Scenario: Delivery defaults
- **WHEN** delivery is not set in global config
- **THEN** the system SHALL default to `both`

### Requirement: Profile configuration via interactive picker
The system SHALL provide an interactive picker for configuring profiles.

#### Scenario: Interactive profile configuration
- **WHEN** user runs `openspec config profile`
- **THEN** the system SHALL display an interactive picker with:
  - Delivery selection: `skills`, `commands`, `both`
  - Workflow toggles for all available workflows
- **THEN** the system SHALL pre-select current config values
- **THEN** on confirmation, the system SHALL update global config
- **THEN** the system SHALL set profile to `custom` if user changes from core defaults
- **THEN** the system SHALL NOT modify any project files
- **THEN** the system SHALL display: "Config updated. Run `openspec update` in your projects to apply."

#### Scenario: Core preset shortcut
- **WHEN** user runs `openspec config profile core`
- **THEN** the system SHALL set profile to `core`
- **THEN** the system SHALL set workflows to `['propose', 'explore', 'apply', 'archive']`
- **THEN** the system SHALL NOT change the delivery setting (preserves user preference)
- **THEN** the system SHALL NOT modify any project files
- **THEN** the system SHALL display: "Config updated. Run `openspec update` in your projects to apply."

#### Scenario: Config profile run inside a project
- **WHEN** user runs `openspec config profile` inside an OpenSpec project directory
- **THEN** after updating global config, the system SHALL prompt: "Apply to this project now? (y/n)"
- **WHEN** user confirms
- **THEN** the system SHALL run `openspec update` automatically
- **THEN** the system SHALL still display: "Run `openspec update` in your other projects to apply."

#### Scenario: Config profile - user declines apply
- **WHEN** user runs `openspec config profile` inside an OpenSpec project directory
- **AND** user declines the "Apply to this project now?" prompt
- **THEN** the system SHALL display: "Config updated. Run `openspec update` in your projects to apply."
- **THEN** the system SHALL exit successfully without modifying project files

#### Scenario: Config profile non-interactive
- **WHEN** user runs `openspec config profile` non-interactively (e.g., in CI, no TTY)
- **THEN** the system SHALL display an error: "Interactive mode required. Use `openspec config profile core` or set config via environment/flags."
- **THEN** the system SHALL exit with code 1

### Requirement: Config is global, projects are explicit
Config changes do NOT automatically propagate to projects.

#### Scenario: Config update does not modify projects
- **WHEN** user updates config via `openspec config profile`
- **THEN** the system SHALL only update global config (`~/.config/openspec/config.json`)
- **THEN** the system SHALL NOT modify any project skill/command files
- **THEN** existing projects retain their current workflow files until user runs `openspec update`

### Requirement: Config changes applied via update command
The existing `openspec update` command applies the current global config to a project. See `specs/cli-update/spec.md` for detailed update behavior.

### Requirement: Profile defaults
The system SHALL use `core` as the default profile for new users.

#### Scenario: No global config exists
- **WHEN** global config file does not exist
- **THEN** the system SHALL behave as if profile is `core`

#### Scenario: Global config exists but profile field absent
- **WHEN** global config file exists but does not contain a `profile` field
- **THEN** the system SHALL behave as if profile is `core`
