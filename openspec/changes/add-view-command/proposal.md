# Add View Command for Rich Change Display

## Why
Viewing changes through an editor requires opening multiple files and manually piecing together context, making it hard to understand what behaviors the system will have after the change.

## What Changes
- Add `openspec view [change-name]` command for behavioral-focused change display
- Extract and display WHEN/THEN patterns from spec files
- Show concise summary with emphasis on behavioral requirements
- Provide tree-structured view pointing to files for full details

## Impact
- Affected specs: cli-view (new), cli-core (modified)
- Affected code: src/cli/index.ts, new src/cli/commands/view.ts
- Breaking changes: None - purely additive functionality