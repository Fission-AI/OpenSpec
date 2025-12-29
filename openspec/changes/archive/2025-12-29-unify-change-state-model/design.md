# Design: Unify Change State Model

## Overview

This change fixes two bugs with minimal disruption to the existing system:

1. **View bug**: Empty changes incorrectly shown as "Completed"
2. **Artifact workflow bug**: Commands fail on scaffolded changes

## Key Design Decision: Two Systems, Two Purposes

The task-based and artifact-based systems serve **different purposes** and should coexist:

| System | Purpose | Used By |
|--------|---------|---------|
| **Task Progress** | Track implementation work | `openspec view`, `openspec list` |
| **Artifact Progress** | Track planning/spec work | `openspec status`, `openspec next` |

We do NOT merge these systems. Instead, we fix each to work correctly in its domain.

## Change 1: Fix View Command

### Current Logic (Buggy)

```typescript
// view.ts line 90
if (progress.total === 0 || progress.completed === progress.total) {
  completed.push({ name: entry.name });
}
```

Problem: `total === 0` means "no tasks defined yet", not "all tasks done".

### New Logic

```typescript
if (progress.total === 0) {
  draft.push({ name: entry.name });
} else if (progress.completed === progress.total) {
  completed.push({ name: entry.name });
} else {
  active.push({ name: entry.name, progress });
}
```

### View Output Change

**Before:**
```
Completed Changes
─────────────────
  ✓ add-feature        (all tasks done - correct)
  ✓ test-workflow      (no tasks - WRONG)
```

**After:**
```
Draft Changes
─────────────────
  ○ test-workflow      (no tasks yet)

Active Changes
─────────────────
  ◉ add-scaffold       [████░░░░] 3/7 tasks

Completed Changes
─────────────────
  ✓ add-feature        (all tasks done)
```

## Change 2: Fix Artifact Workflow Discovery

### Current Logic (Buggy)

```typescript
// artifact-workflow.ts - validateChangeExists()
const activeChanges = await getActiveChangeIds(projectRoot);
if (!activeChanges.includes(changeName)) {
  throw new Error(`Change '${changeName}' not found...`);
}
```

Problem: `getActiveChangeIds()` requires `proposal.md`, but artifact workflow should work on empty directories to help create the first artifact.

### New Logic

```typescript
async function validateChangeExists(changeName: string, projectRoot: string): Promise<string> {
  const changePath = path.join(projectRoot, 'openspec', 'changes', changeName);

  // Check directory existence directly, not proposal.md
  if (!fs.existsSync(changePath) || !fs.statSync(changePath).isDirectory()) {
    // List available changes for helpful error message
    const entries = await fs.promises.readdir(
      path.join(projectRoot, 'openspec', 'changes'),
      { withFileTypes: true }
    );
    const available = entries
      .filter(e => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
      .map(e => e.name);

    if (available.length === 0) {
      throw new Error('No changes found. Create one with: openspec new change <name>');
    }
    throw new Error(`Change '${changeName}' not found. Available:\n  ${available.join('\n  ')}`);
  }

  return changeName;
}
```

### Behavior Change

```bash
# Before
$ openspec new change foo
$ openspec status --change foo
Error: Change 'foo' not found.

# After
$ openspec new change foo
$ openspec status --change foo
Change: foo
Progress: 0/4 artifacts complete

[ ] proposal
[-] specs (blocked by: proposal)
[-] design (blocked by: proposal)
[-] tasks (blocked by: specs, design)
```

## What Stays the Same

1. **`getActiveChangeIds()`** - Still requires `proposal.md` (used by validate, show)
2. **`getArchivedChangeIds()`** - Unchanged
3. **Active/Completed semantics** - Still based on task checkboxes
4. **Validation** - Still requires `proposal.md` to have something to validate

## File Changes

| File | Change |
|------|--------|
| `src/core/view.ts` | Add draft category, fix completion logic |
| `src/commands/artifact-workflow.ts` | Update `validateChangeExists()` to use directory existence |
| `test/commands/artifact-workflow.test.ts` | Add tests for scaffolded changes |

## Testing Strategy

1. **Unit test**: `validateChangeExists()` with scaffolded change
2. **View test**: Verify three categories render correctly
3. **Manual test**: Full workflow from `new change` → `status` → `view`
