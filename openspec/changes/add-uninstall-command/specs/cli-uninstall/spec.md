# CLI Uninstall Specification

## Purpose

The `openspec uninstall` command SHALL cleanly remove OpenSpec from a project by reversing what `openspec init` creates, while preserving user-added content outside OpenSpec-managed blocks.

## ADDED Requirements

### Requirement: Directory Removal

The command SHALL remove the `openspec/` directory and all its contents.

#### Scenario: Removing OpenSpec directory

- **WHEN** `openspec uninstall` is executed
- **THEN** delete the entire `openspec/` directory including:
  - `openspec/project.md`
  - `openspec/AGENTS.md`
  - `openspec/specs/` and all subdirectories
  - `openspec/changes/` and all subdirectories
- **AND** do not create a backup

### Requirement: Managed Block Removal

The command SHALL remove OpenSpec-managed content blocks from AI tool configuration files while preserving user-added content.

#### Scenario: Stripping managed blocks from config files

- **WHEN** uninstalling OpenSpec
- **THEN** for each AI tool config file (AGENTS.md, CLAUDE.md, CLINE.md, etc.):
  - Read the file content
  - Remove all content between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers (inclusive)
  - If the file becomes empty or contains only whitespace after removal, delete the file
  - Otherwise, write back the preserved content
- **AND** preserve all content outside the managed markers

#### Scenario: Handling files with multiple managed blocks

- **WHEN** a config file contains multiple OpenSpec-managed blocks
- **THEN** remove all blocks between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers
- **AND** preserve all content outside all managed blocks

### Requirement: Slash Command Cleanup

The command SHALL remove all slash command files and directories created by OpenSpec for configured AI tools.

#### Scenario: Removing slash commands

- **WHEN** uninstalling OpenSpec
- **THEN** for each configured AI tool with slash commands:
  - Delete the slash command directory (e.g., `.claude/commands/openspec/`)
  - Walk up the directory tree from the deleted path
  - For each parent directory (e.g., `.claude/commands/`, then `.claude/`):
    - Check if the directory is empty
    - If empty, delete it and continue to the next parent
    - If not empty, stop the cleanup process
  - Stop when reaching the project root or a non-empty directory
- **AND** use the `SlashCommandRegistry` to identify all configured tools

#### Scenario: Removing global slash commands

- **WHEN** uninstalling OpenSpec and Codex was configured
- **THEN** delete the global Codex prompt files:
  - `~/.codex/prompts/openspec-proposal.md`
  - `~/.codex/prompts/openspec-apply.md`
  - `~/.codex/prompts/openspec-archive.md`
- **AND** do not delete other files in the Codex prompts directory
- **AND** do not clean up empty parent directories for global paths (skip the empty directory cleanup algorithm for paths in the user's home directory)

### Requirement: Empty Directory Cleanup

The command SHALL remove empty parent directories after deleting slash commands to avoid leaving orphaned directory structures.

#### Scenario: Cleaning up empty parent directories

- **WHEN** a slash command directory is deleted (e.g., `.claude/commands/openspec/`)
- **THEN** check the parent directory (e.g., `.claude/commands/`)
- **AND** if the parent directory is empty:
  - Delete the parent directory
  - Move up to the next parent directory (e.g., `.claude/`)
  - Repeat the check and delete process
- **AND** stop when:
  - A non-empty directory is found, OR
  - The project root directory is reached
- **AND** use `FileSystemUtils.isDirectoryEmpty()` to determine if a directory is empty

#### Scenario: Skipping cleanup for global paths

- **WHEN** a slash command file in a global path is deleted (e.g., `~/.codex/prompts/openspec-proposal.md`)
- **THEN** do not perform empty directory cleanup
- **AND** only delete the specific file, not its parent directories

#### Scenario: Stopping at non-empty directories

- **GIVEN** the following directory structure:
  - `.claude/`
    - `commands/`
      - `openspec/` (contains OpenSpec slash commands)
      - `custom-command.md` (user's custom command)
- **WHEN** uninstalling OpenSpec
- **THEN** delete `.claude/commands/openspec/`
- **AND** check if `.claude/commands/` is empty
- **AND** find that it contains `custom-command.md`
- **AND** stop the cleanup process without deleting `.claude/commands/` or `.claude/`

### Requirement: Validation

The command SHALL validate that OpenSpec is initialized before attempting uninstallation.

#### Scenario: Detecting uninitialized project

- **WHEN** the `openspec/` directory does not exist
- **THEN** exit with code 1 and display error: "OpenSpec is not initialized in this project"
- **AND** do not attempt to clean AI tool configuration files

#### Scenario: Detecting initialized project

- **WHEN** the `openspec/` directory exists
- **THEN** proceed with discovery phase
- **AND** identify all configured AI tools using `ToolRegistry` and `SlashCommandRegistry`

### Requirement: Confirmation

The command SHALL require user confirmation before performing destructive operations.

#### Scenario: Displaying uninstallation summary

- **WHEN** uninstallation is initiated without `--yes` flag
- **THEN** display a summary showing:
  - "The following will be deleted:"
  - Path to `openspec/` directory
  - List of slash command directories that will be deleted
  - List of config files that will be modified (markers removed)
  - List of config files that will be deleted (empty after marker removal)
- **AND** prompt: "Are you sure you want to continue? [y/N]"
- **AND** wait for user input

#### Scenario: User confirms uninstallation

- **WHEN** user enters "y" or "yes" (case-insensitive)
- **THEN** proceed with cleanup operations
- **AND** display progress indicators using ora spinners

#### Scenario: User cancels uninstallation

- **WHEN** user enters "n", "no", or any other input
- **THEN** exit with code 0 and message: "Uninstallation cancelled"
- **AND** do not modify any files

### Requirement: Non-Interactive Mode

The command SHALL support non-interactive uninstallation for automation and CI/CD use cases.

#### Scenario: Skipping confirmation with flag

- **WHEN** run with `--yes` or `-y` flag
- **THEN** skip the confirmation prompt
- **AND** proceed directly to cleanup operations
- **AND** display the summary but do not wait for input

### Requirement: Progress Indicators

The command SHALL display progress indicators during uninstallation to provide clear feedback.

#### Scenario: Displaying uninstallation progress

- **WHEN** performing cleanup operations
- **THEN** display progress with ora spinners:
  - Show spinner: "⠋ Removing OpenSpec directory..."
  - Then success: "✔ OpenSpec directory removed"
  - Show spinner: "⠋ Cleaning AI tool configurations..."
  - Then success: "✔ AI tool configurations cleaned"
  - Show spinner: "⠋ Removing slash commands..."
  - Then success: "✔ Slash commands removed"

### Requirement: Success Output

The command SHALL provide clear feedback upon successful uninstallation.

#### Scenario: Displaying success message

- **WHEN** uninstallation completes successfully
- **THEN** display summary:
  - "OpenSpec uninstalled successfully!"
  - "Removed: openspec/ directory"
  - "Modified: [list of config files with markers removed]"
  - "Deleted: [list of slash command directories]"
- **AND** if any config files were modified but not deleted:
  - "Preserved user content in: [list of files]"

#### Scenario: Handling partial failures

- **WHEN** some operations fail during uninstallation
- **THEN** complete all possible operations
- **AND** display summary of successful operations
- **AND** display errors for failed operations
- **AND** exit with code 1

### Requirement: Exit Codes

The command SHALL use consistent exit codes to indicate different outcomes.

#### Scenario: Returning exit codes

- **WHEN** the command completes
- **THEN** return appropriate exit code:
  - 0: Success or user cancelled
  - 1: Error (not initialized, permission issues, partial failure)

### Requirement: Tool Discovery

The command SHALL accurately discover all OpenSpec-managed files using existing registries.

#### Scenario: Using registries for discovery

- **WHEN** discovering configured tools
- **THEN** iterate through all tools in `ToolRegistry`
- **AND** for each tool, check if its config file exists and contains OpenSpec markers
- **AND** iterate through all tools in `SlashCommandRegistry`
- **AND** for each tool, check if its slash command files exist

#### Scenario: Detecting markers in config files

- **WHEN** checking if a file is OpenSpec-managed
- **THEN** read file content
- **AND** verify it contains both `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers
- **AND** only consider it managed if both markers are present

## Why

Users need a clean way to remove OpenSpec from projects without manually tracking down and deleting files. This command ensures:
- Complete cleanup of OpenSpec-managed content
- Preservation of user customizations
- Safety through confirmation prompts
- Consistency with the initialization process
