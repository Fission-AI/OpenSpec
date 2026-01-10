# Implementation Tasks

## 1. Create marker stripping utility
- [x] Add `stripManagedBlock(content: string): string` function to `FileSystemUtils`
- [x] Implement regex pattern to find and remove content between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers
- [x] Handle multiple managed blocks in a single file
- [x] Add unit tests for various marker patterns

## 2. Implement UninstallCommand class
- [x] Create `src/core/uninstall.ts` with `UninstallCommand` class
- [x] Implement `execute(targetPath: string, options?: UninstallOptions): Promise<void>` method
- [x] Add validation to check if `openspec/` directory exists
- [x] Return early with error if not initialized

## 3. Add file discovery logic
- [x] Use `ToolRegistry.getAll()` to iterate through all registered AI tools
- [x] For each tool, check if config file exists using `FileSystemUtils.fileExists()`
- [x] Read file content and verify it contains OpenSpec markers
- [x] Use `SlashCommandRegistry.getAll()` to find configured slash commands
- [x] Build a summary object with files to delete/modify

## 4. Implement confirmation prompt
- [x] Create interactive prompt using `@inquirer/prompts`
- [x] Display summary of operations (delete directory, modify files, remove slash commands)
- [x] Show which files will preserve user content
- [x] Accept `--yes`/`-y` flag to skip confirmation
- [x] Return user's decision (proceed or cancel)

## 5. Implement directory removal
- [x] Use `FileSystemUtils.deleteDirectory()` to remove `openspec/` directory
- [x] Wrap in try-catch and handle permission errors gracefully
- [x] Display progress using ora spinner

## 6. Implement config file cleanup
- [x] For each discovered config file:
  - [x] Read content using `FileSystemUtils.readFile()`
  - [x] Strip managed blocks using new utility function
  - [x] Trim whitespace from result
  - [x] If empty, delete file using `FileSystemUtils.deleteFile()`
  - [x] Otherwise, write back using `FileSystemUtils.writeFile()`
- [x] Track which files were modified vs deleted
- [x] Handle errors and continue with remaining files

## 7. Implement slash command removal
- [x] For each discovered slash command configurator:
  - [x] Get all target files/directories
  - [x] Delete slash command directories (e.g., `.claude/commands/openspec/`)
  - [x] Check if parent directories are empty and remove them
  - [x] Handle global commands (e.g., Codex in `~/.codex/prompts/`)
- [x] Use `FileSystemUtils.deleteDirectory()` for directory removal
- [x] Track deleted paths for summary
- [x] Fixed bug: Distinguish between project-relative and global paths correctly

## 8. Add success/error reporting
- [x] Display success message with summary of operations
- [x] List removed directories
- [x] List modified config files (markers removed, content preserved)
- [x] List deleted config files (empty after marker removal)
- [x] List deleted slash command paths
- [x] On partial failure, show what succeeded and what failed
- [x] Set appropriate exit codes (0 for success/cancel, 1 for errors)

## 9. Register command in CLI
- [x] Update `src/cli/index.ts` to add `uninstall` command
- [x] Wire up to `UninstallCommand`
- [x] Add `--yes` / `-y` option for skipping confirmation
- [x] Add command description and help text
- [x] Handle errors and exit codes properly

## 10. Write unit tests
- [x] Test marker stripping with various input patterns
  - [x] Single managed block
  - [x] Multiple managed blocks
  - [x] Content before/after markers
  - [x] No markers present
- [x] Test file discovery logic
- [x] Test confirmation prompt logic
- [x] Mock file system operations for testing
- [x] Add unit tests for new FileSystemUtils methods in `test/utils/file-system.test.ts`:
  - [x] `deleteFile` - test deleting existing file, handling non-existent file errors
  - [x] `deleteDirectory` - test deleting directory with contents, empty directory, non-existent directory
  - [x] `isDirectoryEmpty` - test empty directory returns true, directory with files returns false, non-existent directory returns true

## 11. Write integration tests
- [x] Create test fixture with initialized OpenSpec
- [x] Run `uninstall` command
- [x] Verify `openspec/` directory is deleted
- [x] Verify config files have markers removed but preserve user content
- [x] Verify slash commands are deleted
- [x] Test with `--yes` flag
- [x] Test error cases (not initialized, permission errors)

## 12. Update documentation
- [x] Add `uninstall` command to Command Reference section in README.md
  - [x] Include command syntax: `openspec uninstall [path] [-y|--yes]`
  - [x] Describe what the command does (removes openspec/ directory, cleans config files, removes slash commands)
  - [x] Explain the `--yes` flag for non-interactive mode
  - [x] Note that user content outside OpenSpec markers is preserved
- [x] Add "Uninstalling OpenSpec" section to README.md
  - [x] Place after "Updating OpenSpec" section
  - [x] Provide step-by-step instructions for uninstalling
  - [x] Add warning about data loss and recommendation to commit changes first
  - [x] Include example command usage

## Validation Points

- [x] `openspec uninstall` shows error when not initialized
- [x] Confirmation prompt displays accurate summary
- [x] `--yes` flag skips confirmation
- [x] `openspec/` directory is completely removed
- [x] Config files preserve user content outside markers
- [x] Empty config files are deleted
- [x] Slash commands are removed from all configured tools
- [x] Success message shows accurate summary
- [x] Exit codes are correct
- [x] Works in CI/CD with `--yes` flag

## Dependencies

None - can be implemented independently.

## Parallel Work Opportunities

- Tasks 1-3 can be worked on in parallel (marker utility, command class, discovery)
- Tasks 10-11 can be written in parallel with implementation
