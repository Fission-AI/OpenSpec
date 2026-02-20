# Spaceline Output Format Design

## Context

The `openspec list` command currently outputs simple tabular data. Users (particularly AI assistants) need a more compact, information-dense format that shows:
- Visual progress indicators
- Git change statistics

This format is inspired by "spaceline" prompts used in AI coding workflows.

## Goals / Non-Goals

**Goals:**
- Compact, visually rich output format for change listings
- Git statistics integration (files added/removed)
- Graceful degradation when data is unavailable

**Non-Goals:**
- Complex Git history analysis (simple diff stats only)
- Persistent configuration for spaceline format

## Decisions

### Decision 1: Git stats via `git diff --numstat`

**What:** Use `git diff --numstat` to count file additions/removals.

**Why:**
- Simple, reliable command available in all Git installations
- Machine-readable output format
- No additional dependencies

**Format interpretation:**
```
123  45  path/to/file.ts    # 123 additions, 45 deletions → counts as "added" (↑)
10   50  another/file.ts    # 10 additions, 50 deletions → counts as "removed" (↓)
```

### Decision 2: Emoji constants in separate module

**What:** Create `src/utils/spaceline-formatter.ts` with emoji constants.

**Why:**
- Centralized emoji management
- Easy to update/disable if needed
- Testable in isolation

**Emojis used:**
- `📝` - Change icon
- `󱃖` - Progress (Nerd Font icon, fallback to `░`)
- `󰷫` - Implementation status
- `✎` - Delta count
- `📋` - Open items
- `󰘬` - Git branch

### Decision 3: Spaceline mutually exclusive with JSON

**What:** `--spaceline` and `--json` flags cannot be used together.

**Why:**
- Spaceline is a human-readable format
- JSON is for machine parsing
- Mixing them doesn't make sense

**Behavior:** Exit with error code 2 and clear message.

## Risks / Trade-offs

### Risk: Emoji/Nerd Font rendering

**Issue:** Some terminals don't support Nerd Font icons (󱃖, 󰷫, 󰘬).

**Mitigation:**
- Use standard emoji fallbacks where possible
- Consider `--no-emoji` flag in future if needed
- Terminal font issues are user's responsibility

### Risk: Git command availability

**Issue:** `git diff` may fail if not in a Git repo or Git not installed.

**Mitigation:**
- Wrap in try-catch, show `(?)` on failure
- Don't fail the entire command
- Document this behavior

### Risk: Performance with many changes

**Issue:** Computing Git stats for each change could be slow.

**Mitigation:**
- Only run Git commands when `--spaceline` is used
- Consider caching in future if needed
- Expected usage is small number of active changes (<20)

## Implementation Structure

```
src/utils/
├── git-stats.ts          # Git diff statistics
└── spaceline-formatter.ts # Format assembly

src/core/list.ts          # Add spaceline mode
src/cli/index.ts          # Add --spaceline flag
```

## Migration Plan

No migration needed - this is a new feature flag.

## Open Questions

1. **Git base:** What should we diff against? Main branch? HEAD?
   - **Answer:** Diff against `main` or `origin/main` if available, otherwise `HEAD~1`
   - **Implementation detail:** Use `git diff --numstat main` or similar

2. **Category detection:** How to map change ID to category (e.g., "add" → "Implementation")?
   - **Answer:** Simple prefix mapping: `add-*` → Implementation, `update-*` → Refactor, `remove-*` → Deprecation
