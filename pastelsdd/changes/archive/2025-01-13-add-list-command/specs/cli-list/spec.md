# List Command Specification

## Purpose

The `pastelsdd list` command SHALL provide developers with a quick overview of all active changes in the project, showing their names and task completion status.

## Behavior

### Command Execution

WHEN `pastelsdd list` is executed
THEN scan the `pastelsdd/changes/` directory for change directories
AND exclude the `archive/` subdirectory from results
AND parse each change's `tasks.md` file to count task completion

### Task Counting

WHEN parsing a `tasks.md` file
THEN count tasks matching these patterns:
- Completed: Lines containing `- [x]`
- Incomplete: Lines containing `- [ ]`
AND calculate total tasks as the sum of completed and incomplete

### Output Format

WHEN displaying the list
THEN show a table with columns:
- Change name (directory name)
- Task progress (e.g., "3/5 tasks" or "✓ Complete")
- Status indicator:
  - `✓` for fully completed changes (all tasks done)
  - Progress fraction for partial completion

Example output:
```
Changes:
  add-auth-feature     3/5 tasks
  update-api-docs      ✓ Complete
  fix-validation       0/2 tasks
  add-list-command     1/4 tasks
```

### Empty State

WHEN no active changes exist (only archive/ or empty changes/)
THEN display: "No active changes found."

### Error Handling

IF a change directory has no `tasks.md` file
THEN display the change with "No tasks" status

IF `pastelsdd/changes/` directory doesn't exist
THEN display error: "No Pastelsdd changes directory found. Run 'pastelsdd init' first."
AND exit with code 1

### Sorting

Changes SHALL be displayed in alphabetical order by change name for consistency.

## Why

Developers need a quick way to:
- See what changes are in progress
- Identify which changes are ready to archive
- Understand the overall project evolution status
- Get a bird's-eye view without opening multiple files

This command provides that visibility with minimal effort, following Pastelsdd's philosophy of simplicity and clarity.