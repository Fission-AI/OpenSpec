# Proposal: Unify Change State Model

## Problem Statement

Two bugs create inconsistent behavior when working with changes:

### Bug 1: Empty changes shown as "Completed" in view

```typescript
// view.ts line 90
if (progress.total === 0 || progress.completed === progress.total) {
  completed.push({ name: entry.name });  // BUG: total === 0 ≠ completed
}
```

Result: `openspec new change foo && openspec view` shows `foo` as "Completed" when it has no content.

### Bug 2: Artifact workflow commands can't find scaffolded changes

```typescript
// item-discovery.ts - getActiveChangeIds()
const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
await fs.access(proposalPath);  // Only returns changes WITH proposal.md
```

Result: `openspec status --change foo` says "not found" even though the directory exists.

## Root Cause

The system conflates two different concepts:

| Concept | Question | Source of Truth |
|---------|----------|-----------------|
| **Planning Progress** | Are all spec documents created? | File existence (ArtifactGraph) |
| **Implementation Progress** | Is the coding work done? | Task checkboxes (tasks.md) |

## Proposed Solution

### Fix 1: Add "Draft" state to view command

Keep Active/Completed with their existing meanings, but fix the bug:

| State | Criteria | Meaning |
|-------|----------|---------|
| **Draft** | No tasks.md OR `tasks.total === 0` | Still planning |
| **Active** | `tasks.total > 0` AND `completed < total` | Implementing |
| **Completed** | `tasks.total > 0` AND `completed === total` | Done |

### Fix 2: Artifact workflow uses directory existence

Update `validateChangeExists()` to check if the directory exists, not if `proposal.md` exists. This allows the artifact workflow to guide users through creating their first artifact.

### Keep existing discovery functions

`getActiveChangeIds()` continues to require `proposal.md` for backward compatibility with validation and other commands.

## What Changes

| Command | Before | After |
|---------|--------|-------|
| `openspec view` | Empty = "Completed" | Empty = "Draft" |
| `openspec status --change X` | Requires proposal.md | Works on any directory |
| `openspec validate X` | Requires proposal.md | Unchanged (still requires it) |

## Breaking Changes

### Minimal Breaking Change

1. **`openspec view` output**: Empty changes move from "Completed" section to new "Draft" section

### Non-Breaking

- Active/Completed semantics unchanged (still task-based)
- `getActiveChangeIds()` unchanged
- `openspec validate` unchanged
- Archived changes unaffected

## Out of Scope

- Merging task-based and artifact-based progress (they serve different purposes)
- Changing what "Completed" means (it stays = all tasks done)
- Adding artifact progress to view command (separate enhancement)
- Shell tab completions for artifact workflow commands (not yet registered)

## Related Commands Analysis

| Command | Uses `getActiveChangeIds()` | Should include scaffolded? | Change needed? |
|---------|-----------------------------|-----------------------------|----------------|
| `openspec view` | No (reads dirs directly) | Yes → Draft section | **Yes** |
| `openspec list` | No (reads dirs directly) | Yes (shows "No tasks") | No |
| `openspec status/next/instructions` | Yes | Yes | **Yes** |
| `openspec validate` | Yes | No (can't validate empty) | No |
| `openspec show` | Yes | No (nothing to show) | No |
| Tab completions | Yes | Future enhancement | No |

## Success Criteria

1. `openspec new change foo && openspec view` shows `foo` in "Draft" section
2. `openspec new change foo && openspec status --change foo` works
3. Changes with all tasks done still show as "Completed"
4. All existing tests pass
