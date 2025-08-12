# Add View Command for Rich Change Display

## Why
Viewing changes through an editor requires opening multiple files and manually piecing together context, making it hard to understand what requirements the system will fulfill after the change.

## What Changes
- Add `openspec view [change-name]` command for requirement-focused change display
- Extract and display requirements using @requirement markers from spec files
- Show concise summary with requirement identifiers and descriptions
- Provide tree-structured view pointing to files for full details

## Impact
- Affected specs: cli-view (new), cli-core (modified)
- Affected code: src/cli/index.ts, new src/cli/commands/view.ts
- Breaking changes: None - purely additive functionality
- Dependencies: Requires @requirement markers convention (add-requirement-markers change)