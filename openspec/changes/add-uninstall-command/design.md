# Uninstall Command Design

## Architecture Overview

The uninstall command will mirror the structure of `InitCommand` to maintain consistency and leverage existing patterns.

## Core Components

### 1. UninstallCommand Class (`src/core/uninstall.ts`)

```typescript
class UninstallCommand {
  async execute(targetPath: string, options?: UninstallOptions): Promise<void>
  private async validate(projectPath: string): Promise<void>
  private async confirmUninstallation(summary: UninstallSummary): Promise<boolean>
  private async removeOpenSpecDirectory(openspecPath: string): Promise<void>
  private async cleanAIToolConfigs(projectPath: string): Promise<void>
  private async removeSlashCommands(projectPath: string): Promise<void>
  private async cleanupEmptyParentDirectories(deletedPath: string, projectPath: string): Promise<void>
}
```

### 2. Cleanup Strategy

**Phase 1: Discovery**
- Detect if `openspec/` directory exists
- Scan for AI tool config files with OpenSpec markers
- Identify slash command directories using registries

**Phase 2: Confirmation**
- Display summary of what will be deleted/modified
- Show preserved content warnings
- Wait for user confirmation (unless `--yes` flag)

**Phase 3: Cleanup**
1. Remove `openspec/` directory entirely
2. For each AI tool config file:
   - Read file content
   - Strip content between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->`
   - If file is empty or whitespace-only after stripping, delete it
   - Otherwise, write back preserved content
3. Delete slash command directories/files
4. Clean up empty parent directories:
   - After deleting a slash command directory, walk up the directory tree
   - Remove any empty parent directories until reaching a non-empty directory or project root
   - Example: After deleting `.claude/commands/openspec/`, also remove `.claude/commands/` and `.claude/` if they become empty
   - Skip cleanup for global paths (e.g., `~/.codex/prompts/`)

## Data Flow

```
User runs `openspec uninstall`
  ↓
Validate: Check if openspec/ exists
  ↓
Discover: Find all OpenSpec-managed files
  ↓
Confirm: Show summary and ask for confirmation
  ↓
Clean: Remove directory, strip markers, delete slash commands
  ↓
Report: Display success summary
```

## File Detection Logic

### AI Tool Config Files
Leverage existing `ToolRegistry` and `SlashCommandRegistry`:
- Iterate through all registered tools
- Check if config file exists and contains markers
- Check if slash command directories exist

### Marker Stripping Algorithm
```typescript
function stripManagedBlock(content: string): string {
  const startMarker = '<!-- OPENSPEC:START -->';
  const endMarker = '<!-- OPENSPEC:END -->';

  // Find and remove everything between markers (inclusive)
  const pattern = new RegExp(
    `${escapeRegex(startMarker)}.*?${escapeRegex(endMarker)}`,
    'gs'
  );

  return content.replace(pattern, '').trim();
}
```

### Empty Directory Cleanup Algorithm
```typescript
async function cleanupEmptyParentDirectories(
  deletedPath: string,
  projectPath: string
): Promise<void> {
  let currentDir = path.dirname(deletedPath);

  // Walk up the directory tree, removing empty directories
  while (currentDir !== projectPath && currentDir !== path.dirname(currentDir)) {
    const isEmpty = await FileSystemUtils.isDirectoryEmpty(currentDir);

    if (isEmpty) {
      await FileSystemUtils.deleteDirectory(currentDir);
      currentDir = path.dirname(currentDir);
    } else {
      break; // Stop when we find a non-empty directory
    }
  }
}
```

This algorithm:
1. Starts from the parent directory of the deleted path
2. Checks if the directory is empty using `FileSystemUtils.isDirectoryEmpty()`
3. If empty, deletes it and moves up to the parent
4. Stops when it finds a non-empty directory or reaches the project root
5. Only runs for project-relative paths (skips global paths like `~/.codex/`)

## Reuse from Existing Code

**From `InitCommand`:**
- `ToolRegistry` and `SlashCommandRegistry` for discovering configured tools
- `FileSystemUtils` for file operations
- `OPENSPEC_MARKERS` constant for marker patterns

**From `UpdateCommand`:**
- Marker detection logic (already handles finding managed blocks)

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `openspec/` doesn't exist | Exit with error: "OpenSpec is not initialized in this project" |
| User cancels confirmation | Exit gracefully with code 0, no changes made |
| Permission errors | Exit with error message, list failed operations |
| Partial failure | Complete what's possible, report failures at end |

## Options/Flags

- `[path]` - Target directory (default: current directory)
- `--yes` / `-y` - Skip confirmation prompts
- `--dry-run` - Show what would be deleted without actually deleting (future enhancement)

## Exit Codes

- `0` - Success or user cancelled
- `1` - Error (not initialized, permission issues, etc.)

## Testing Strategy

**Unit Tests:**
- Marker stripping logic
- Discovery of configured tools
- File content preservation

**Integration Tests:**
- Full uninstall after `init`
- Partial uninstall (some tools configured)
- User content preservation
- Permission handling

## Documentation

**README.md Updates:**
- Add `uninstall` command to Command Reference section
  - Command syntax with flags
  - What gets removed (openspec/ directory, config files, slash commands)
  - Note about preserving user content
- New "Uninstalling OpenSpec" section after "Updating OpenSpec"
  - Step-by-step uninstallation guide
  - Warning about data loss
  - Recommendation to commit changes before uninstalling
  - Example usage with `--yes` flag

## Trade-offs

### Chosen: Delete entire `openspec/` directory
**Pros:** Simple, complete cleanup
**Cons:** Loses all specs, changes, and proposals
**Rationale:** Aligns with user's intent to "reverse init" - users should commit work to git before uninstalling

### Chosen: Preserve content outside markers
**Pros:** Safer, respects user customization
**Cons:** More complex logic, files may not be fully removed
**Rationale:** Users may have added custom instructions to CLAUDE.md or AGENTS.md

### Chosen: Interactive confirmation by default
**Pros:** Prevents accidental data loss
**Cons:** Requires user interaction
**Rationale:** Destructive operations should require explicit confirmation; `--yes` flag addresses automation needs

## Future Enhancements

- `--backup` flag to create backup before uninstalling
- `--dry-run` flag to preview changes
- Selective uninstallation (e.g., `--tools claude,cursor` to remove specific tools only)
