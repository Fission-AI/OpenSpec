# Add List Command to Pastelsdd CLI

## Why

Developers need visibility into available changes and their status to understand the project's evolution and pending work.

## What Changes

- Add `pastelsdd list` command that displays all changes in the changes/ directory
- Show each change name with task completion count (e.g., "add-auth: 3/5 tasks")
- Display completion status indicator (✓ for fully complete, progress for partial)
- Skip the archive/ subdirectory to focus on active changes
- Simple table output for easy scanning

## Impact

- Affected specs: New capability `cli-list` will be added
- Affected code:
  - `src/cli/index.ts` - Add list command
  - `src/core/list.ts` - New file with directory scanning and task parsing (~60 lines)