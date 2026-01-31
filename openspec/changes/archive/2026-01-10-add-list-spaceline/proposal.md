# Add Spaceline Output Format to List Command

## Why

Developers need a visually compact, information-dense way to view active changes with key metrics at a glance. The current `openspec list` output shows basic information but lacks:
1. Visual progress indicators
2. Git change statistics

This is particularly useful for AI coding assistants that need to quickly assess project state during development sessions.

## What Changes

- Add `--spaceline` flag to `openspec list` command
- Display changes in a compact, emoji-rich horizontal format:
  - Change ID and title
  - Visual progress bar with percentage
  - Task completion status
  - Git diff statistics (files added/modified)
- Sort output by change ID (alphabetical)

Example output:
```
📝 add-api-versioning | 󱃖 █████████░ 92.5%
󰷫  Implementation (4/7) | ✎ 12 | 📋 5 open | 󰘬 feature/add-api-versioning (↑5 ↓2)
```

## Impact

- Affected specs: `cli-list`
- Affected code:
  - `src/core/list.ts` - Add spaceline format output
  - `src/cli/index.ts` - Add `--spaceline` option
  - New utility modules for Git statistics and spaceline formatting
