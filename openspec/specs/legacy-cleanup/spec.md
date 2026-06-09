# legacy-cleanup Specification

## Purpose
Define detection and cleanup behavior for legacy ClearSpec artifacts during initialization and update workflows.
## Requirements
### Requirement: Legacy artifact detection

The system SHALL detect legacy ClearSpec artifacts from previous init versions. The system SHALL only detect artifacts it can attribute to ClearSpec via ClearSpec markers, and SHALL NOT treat any `openspec`-named file or directory as a legacy artifact, since such artifacts may belong to a separately installed OpenSpec.

#### Scenario: Detecting legacy config files

- **WHEN** running `clearspec init` on an existing project
- **THEN** the system SHALL check for config files with ClearSpec markers:
  - `CLAUDE.md`
  - `.cursorrules`
  - `.windsurfrules`
  - `.clinerules`
  - `.kilocode_rules`
  - `.github/copilot-instructions.md`
  - `.amazonq/instructions.md`
  - `CODEBUDDY.md`
  - `IFLOW.md`
  - And all other tool config files from the legacy ToolRegistry

#### Scenario: Detecting legacy ClearSpec structure files

- **WHEN** running `clearspec init` on an existing project
- **THEN** the system SHALL check only for a root `AGENTS.md` that contains ClearSpec markers
- **AND** the system SHALL NOT inspect any `openspec` directory or its contents

### Requirement: Legacy cleanup confirmation

The system SHALL prompt for confirmation before removing legacy artifacts.

#### Scenario: Prompting for cleanup when legacy detected

- **WHEN** legacy artifacts are detected
- **THEN** the system SHALL display what was found
- **AND** prompt: "Legacy files detected. Upgrade and clean up? [Y/n]"
- **AND** default to Yes if user presses Enter

#### Scenario: User confirms cleanup

- **WHEN** user responds Y or presses Enter
- **THEN** the system SHALL remove legacy artifacts
- **AND** proceed with skill-based setup

#### Scenario: User declines cleanup

- **WHEN** user responds N
- **THEN** the system SHALL abort initialization
- **AND** display message suggesting manual cleanup or using `--force` flag

#### Scenario: Non-interactive mode

- **WHEN** running with `--no-interactive` or in CI environment
- **AND** legacy artifacts are detected
- **THEN** the system SHALL abort with exit code 1
- **AND** display detected legacy artifacts
- **AND** suggest running interactively or using `--force` flag

### Requirement: Surgical removal of config file content

The system SHALL preserve user content when removing ClearSpec markers from config files. The system SHALL only remove blocks delimited by ClearSpec markers and SHALL NOT remove blocks delimited by OpenSpec markers, which may belong to a separately installed OpenSpec.

#### Scenario: Config file with only ClearSpec content

- **WHEN** a config file contains only a ClearSpec marker block (whitespace outside is acceptable)
- **THEN** the system SHALL remove the ClearSpec marker block
- **AND** preserve the file (even if empty or whitespace-only)
- **AND** NOT delete the file (config files belong to the user's project root)

#### Scenario: Config file with mixed content

- **WHEN** a config file contains content outside ClearSpec markers
- **THEN** the system SHALL remove only the `<!-- CLEARSPEC:START -->` to `<!-- CLEARSPEC:END -->` block
- **AND** preserve all content before and after the markers
- **AND** clean up any resulting double blank lines
- **AND** never remove an `<!-- OPENSPEC:START -->` to `<!-- OPENSPEC:END -->` block

#### Scenario: Root AGENTS.md with mixed content

- **WHEN** root `AGENTS.md` contains ClearSpec markers AND other content
- **THEN** the system SHALL remove only the ClearSpec marker block
- **AND** preserve the rest of the file

### Requirement: Cleanup reporting

The system SHALL report what was cleaned up.

#### Scenario: Displaying cleanup summary

- **WHEN** legacy cleanup completes
- **THEN** the system SHALL display a summary section:
  ```
  Cleaned up legacy files:
    ✓ Removed ClearSpec markers from CLAUDE.md
    ✓ Removed .claude/commands/openspec/ (replaced by /clsx:*)
    ✓ Removed openspec/AGENTS.md (no longer needed)
  ```
- **AND IF** `openspec/project.md` exists
- **THEN** the system SHALL display a separate migration section:
  ```
  Manual migration needed:
    → openspec/project.md still exists
      Move useful content to config.yaml's "context:" field, then delete
  ```

#### Scenario: No legacy detected

- **WHEN** no legacy artifacts are found
- **THEN** the system SHALL NOT display the cleanup section
- **AND** proceed directly with skill setup

