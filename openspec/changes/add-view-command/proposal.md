# Add View Command for Rich Change Display

## Why
Viewing changes through an editor requires opening multiple files and manually piecing together context, making it hard to understand progress, impact, and relationships at a glance.

## What Changes
- Add `openspec view [change-name]` command for unified change display
- Show progress visualization with task completion percentages
- Display spec changes with smart diffing and impact analysis
- Include timeline and relationship views for change context
- Support multiple output formats (terminal, json, ai-friendly)
- Add interactive mode for navigation and quick actions

## Impact
- Affected specs: cli-view (new), cli-core (modified)
- Affected code: src/cli/index.ts, new src/cli/commands/view.ts
- Breaking changes: None - purely additive functionality