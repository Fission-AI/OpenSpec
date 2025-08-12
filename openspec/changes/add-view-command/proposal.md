# Add View Command for Rich Change Display

## Why
Viewing changes through an editor requires opening multiple files and manually piecing together context, making it hard to understand the complete picture of a change at a glance.

## What Changes
- Add `openspec view [change-name]` command for unified change display
- Show progress visualization with task completion percentages
- Display all change components (proposal, tasks, design, specs) in one view
- Provide clear formatting and visual hierarchy for easy scanning

## Impact
- Affected specs: cli-view (new), cli-core (modified)
- Affected code: src/cli/index.ts, new src/cli/commands/view.ts
- Breaking changes: None - purely additive functionality