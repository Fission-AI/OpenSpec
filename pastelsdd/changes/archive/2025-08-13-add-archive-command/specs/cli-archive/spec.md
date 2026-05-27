# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following Pastelsdd conventions.

## Command Syntax
```bash
pastelsdd archive [change-name] [--yes|-y]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)

## Behavior

### Change Selection
WHEN no change-name is provided
THEN display interactive list of available changes (excluding archive/)
AND allow user to select one

WHEN change-name is provided
THEN use that change directly
AND validate it exists

### Task Completion Check
The command SHALL scan the change's tasks.md file for incomplete tasks (marked with `- [ ]`)

WHEN incomplete tasks are found
THEN display all incomplete tasks to the user
AND prompt for confirmation to continue
AND default to "No" for safety

WHEN all tasks are complete OR no tasks.md exists
THEN proceed with archiving without prompting

### Archive Process
The archive operation SHALL:
1. Create archive/ directory if it doesn't exist
2. Generate target name as `YYYY-MM-DD-[change-name]` using current date
3. Check if target directory already exists
4. Update main specs from the change's future state specs (see Spec Update Process below)
5. Move the entire change directory to the archive location

WHEN target archive already exists
THEN fail with error message
AND do not overwrite existing archive

WHEN move succeeds
THEN display success message with archived name and list of updated specs

### Spec Update Process
Before moving the change to archive, the command SHALL update main specs to reflect the deployed reality:

WHEN the change contains specs in `changes/[name]/specs/`
THEN:
1. Analyze which specs will be affected by comparing with existing specs
2. Display a summary of spec updates to the user (see Confirmation Behavior below)
3. Prompt for confirmation unless `--yes` flag is provided
4. If confirmed, for each capability spec in the change directory:
   - Copy the spec from `changes/[name]/specs/[capability]/spec.md` to `pastelsdd/specs/[capability]/spec.md`
   - Create the target directory structure if it doesn't exist
   - Overwrite existing spec files (specs represent current reality, change specs are the new reality)
   - Track which specs were updated for the success message

WHEN no specs exist in the change
THEN skip the spec update step
AND proceed with archiving

### Confirmation Behavior
The spec update confirmation SHALL:
- Display a clear summary showing:
  - Which specs will be created (new capabilities)
  - Which specs will be updated (existing capabilities)
  - The source path for each spec
- Format the confirmation prompt as:
  ```
  The following specs will be updated:
  
  NEW specs to be created:
    - cli-archive (from changes/add-archive-command/specs/cli-archive/spec.md)
  
  EXISTING specs to be updated:
    - cli-init (from changes/update-init-command/specs/cli-init/spec.md)
  
  Update 2 specs and archive 'add-archive-command'? [y/N]:
  ```
- Default to "No" for safety (require explicit "y" or "yes")
- Skip confirmation when `--yes` or `-y` flag is provided

WHEN user declines the confirmation
THEN abort the entire archive operation
AND display message: "Archive cancelled. No changes were made."
AND exit with non-zero status code

## Error Handling

SHALL handle the following error conditions:
- Missing pastelsdd/changes/ directory
- Change not found
- Archive target already exists
- File system permissions issues

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use