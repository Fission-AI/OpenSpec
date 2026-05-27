## Why

Users frequently need to view changes and specs but must know in advance whether they're looking at a change or spec. The current subcommand structure (`change show`, `spec show`) creates friction when:
- Users want to quickly view an item without remembering its type
- Exploring the codebase requires switching between different show commands
- Show commands without arguments return errors instead of helpful guidance

## What Changes

- Add new top-level `show` command for displaying changes or specs with intelligent selection
- Support direct item display: `pastelsdd show <item>` with automatic type detection
- Interactive selection when no arguments provided
- Enhance existing `change show` and `spec show` to support interactive selection (backwards compatibility)
- Maintain all existing format options (--json, --deltas-only, --requirements, etc.)

## Impact

- New specs to create: cli-show
- Specs to enhance: cli-change, cli-spec (for backwards compatibility)
- Affected code: src/cli/index.ts, src/commands/show.ts (new), src/commands/spec.ts, src/commands/change.ts