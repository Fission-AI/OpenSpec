## Purpose

Available tools detection SHALL enable smart defaults init by auto-discovering which AI tools the user has installed, reducing setup friction while maintaining user control.

## ADDED Requirements

### Requirement: Detect tools from directories
The system SHALL detect installed AI tools by scanning for their configuration directories.

#### Scenario: Detect Claude Code
- **WHEN** `.claude/` directory exists in project root
- **THEN** the system SHALL detect Claude Code as an installed tool

#### Scenario: Detect Cursor
- **WHEN** `.cursor/` directory exists in project root
- **THEN** the system SHALL detect Cursor as an installed tool

#### Scenario: Detect Windsurf
- **WHEN** `.windsurf/` directory exists in project root
- **THEN** the system SHALL detect Windsurf as an installed tool

#### Scenario: Detect multiple tools
- **WHEN** multiple tool directories exist (e.g., `.claude/`, `.cursor/`)
- **THEN** the system SHALL detect all matching tools

#### Scenario: No tools detected
- **WHEN** no tool directories exist in project root
- **THEN** the system SHALL return an empty list of detected tools

### Requirement: Detection covers all supported tools
The system SHALL check for all tools defined in `AI_TOOLS` that have a `skillsDir` property.

#### Scenario: Detection mapping
- **WHEN** scanning for tools
- **THEN** the system SHALL check for each tool's `skillsDir` value (e.g., `.claude`, `.cursor`, `.windsurf`)

### Requirement: Cross-platform directory detection
The system SHALL use cross-platform path handling for directory detection.

#### Scenario: Path construction
- **WHEN** checking for tool directories
- **THEN** the system SHALL use `path.join()` to construct paths

#### Scenario: Case sensitivity on different platforms
- **WHEN** checking for directories on any filesystem
- **THEN** the system SHALL use `fs.existsSync()` with exact directory names from AI_TOOLS
- **THEN** the operating system's filesystem SHALL handle case sensitivity natively
- **THEN** the system SHALL NOT perform manual case normalization
