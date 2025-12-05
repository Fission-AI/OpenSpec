# Add Uninstall Command

## Problem

Users who initialize OpenSpec in a project may later decide to remove it, either to clean up a test environment or when migrating away from OpenSpec. Currently, there is no built-in way to reverse what `openspec init` does, forcing users to manually:
- Delete the `openspec/` directory
- Remove OpenSpec-managed blocks from AI tool configuration files (AGENTS.md, CLAUDE.md, etc.)
- Delete slash command directories (.claude/, .cline/, etc.)
- Track down all tool-specific configuration files across multiple locations

This manual process is error-prone and leaves artifacts behind.

## Solution

Introduce an `openspec uninstall` command that reverses the initialization:
1. Removes the `openspec/` directory entirely
2. Strips OpenSpec-managed blocks (between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers) from AI tool config files
3. Deletes slash command directories and files created by OpenSpec
4. Cleans up empty parent directories after removing slash commands (e.g., if `.claude/commands/openspec` is removed and `.claude/commands` becomes empty, it removes `.claude/commands` and `.claude` as well)
5. Preserves any user-added content outside managed blocks in config files
6. Requires confirmation before deletion (with `--yes` flag to skip for automation)

## Impact

### Users
- **Developers testing OpenSpec**: Can cleanly remove OpenSpec from test projects
- **Teams migrating away**: Can properly uninstall without leaving artifacts
- **CI/CD automation**: Can use `--yes` flag for scripted uninstallation

### System
- New CLI command: `openspec uninstall [path]`
- Reuses existing utilities from `FileSystemUtils` and marker detection logic
- Mirrors the structure of `InitCommand` for consistency

## Scope

This change introduces:
1. **New spec**: `cli-uninstall` - defines the behavior of the uninstall command
2. **Implementation**: New `UninstallCommand` class in `src/core/uninstall.ts`
3. **CLI integration**: Register command in `src/cli/index.ts`
4. **Utility additions**: New methods in `FileSystemUtils` (`stripManagedBlock`, `deleteFile`, `deleteDirectory`, `isDirectoryEmpty`)
5. **Tests**: Coverage for uninstall scenarios and new utility methods
6. **Documentation**: Updates to README.md with command reference and uninstallation guide

## Out of Scope

- Backing up files before deletion (users should use version control)
- Selective uninstallation (e.g., removing only specific AI tool configs)
- Undo functionality after uninstallation

## Dependencies

None - this is a standalone feature.

## Risks

- **Data loss**: Users might unintentionally delete important content
  - *Mitigation*: Require confirmation, preserve content outside markers
- **Incomplete cleanup**: Some files might not be detected
  - *Mitigation*: Use the same registry patterns as `init` to ensure symmetry
