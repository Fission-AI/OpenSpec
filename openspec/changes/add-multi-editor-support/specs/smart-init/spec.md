<rules>
- Include scenarios for Windows path handling when dealing with file paths
- Requirements involving paths must specify cross-platform behavior
</rules>

## ADDED Requirements

### Requirement: Init detects existing editor configurations
The system SHALL scan for existing editor configuration directories to inform setup recommendations. Detection targets:
- `.claude/` - Claude Code
- `.cursor/` - Cursor
- `.windsurf/` - Windsurf
- `.cline/` - Cline

#### Scenario: Detect Claude Code configuration
- **WHEN** user runs `openspec init` in a project with `.claude/` directory
- **THEN** system detects Claude Code as a configured editor
- **AND** system pre-selects Claude Code in the editor selection

#### Scenario: Detect multiple editor configurations
- **WHEN** user runs `openspec init` in a project with both `.claude/` and `.cursor/` directories
- **THEN** system detects both Claude Code and Cursor as configured editors
- **AND** system pre-selects both in the editor selection

#### Scenario: No editor configurations detected
- **WHEN** user runs `openspec init` in a project with no editor config directories
- **THEN** system shows all available editors without pre-selection
- **AND** system informs user that no existing editor configs were detected

### Requirement: Init detects existing OpenSpec state
The system SHALL detect the current OpenSpec setup state to provide appropriate recommendations:
- Not initialized: No `openspec/` directory
- Old system: `openspec/AGENTS.md` exists
- New system: `.claude/skills/openspec-*` exists
- Mixed: Both old and new artifacts present

#### Scenario: Detect uninitialized project
- **WHEN** user runs `openspec init` in a project without `openspec/` directory
- **THEN** system detects project as uninitialized
- **AND** system offers full initialization

#### Scenario: Detect old system
- **WHEN** user runs `openspec init` in a project with `openspec/AGENTS.md` but no skills
- **THEN** system detects old OpenSpec system
- **AND** system recommends migration to new skills-based system

#### Scenario: Detect new system already in place
- **WHEN** user runs `openspec init` in a project with `.claude/skills/openspec-*`
- **THEN** system detects new system is already set up
- **AND** system informs user that OpenSpec is already configured

#### Scenario: Detect mixed state (both old and new artifacts)
- **WHEN** user runs `openspec init` in a project with both `openspec/AGENTS.md` and `.claude/skills/openspec-*`
- **THEN** system detects mixed state
- **AND** system informs user that both old and new systems exist
- **AND** system recommends running `openspec cleanup` to remove old artifacts

### Requirement: Init shows detection results to user
The system SHALL display detection results before proceeding with setup.

#### Scenario: Display detection summary
- **WHEN** user runs `openspec init` in interactive mode
- **THEN** system displays detected editor configurations
- **AND** system displays detected OpenSpec state
- **AND** system shows recommendations based on detection

### Requirement: Init allows user to override detected selections
The system SHALL allow users to modify the pre-selected editors based on detection.

#### Scenario: User deselects detected editor
- **WHEN** Claude Code is detected and pre-selected
- **AND** user deselects Claude Code during init
- **THEN** system does not generate Claude Code files

#### Scenario: User selects non-detected editor
- **WHEN** Cursor is not detected (no .cursor/ directory)
- **AND** user selects Cursor during init
- **THEN** system generates Cursor files anyway

### Requirement: Init uses detected editors with --yes flag
The system SHALL use detected editors as defaults when running with --yes flag.

#### Scenario: Non-interactive init with detection
- **WHEN** user runs `openspec init --yes` in a project with .claude/ and .cursor/
- **THEN** system initializes for Claude Code and Cursor automatically
- **AND** system does not prompt for editor selection
