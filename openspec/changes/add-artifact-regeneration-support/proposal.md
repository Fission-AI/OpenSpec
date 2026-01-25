# Add Artifact Regeneration Support

## Problem

Currently, there is **no way to regenerate artifacts** in the OPSX workflow:

- `/opsx:apply` just reads whatever's on disk
- `/opsx:continue` only creates the NEXT artifact - won't touch existing ones

If you edit `design.md` after `tasks.md` exists, your only options are:
1. Delete tasks.md manually, then run `/opsx:continue`
2. Edit tasks.md manually

The documentation claims you can "update artifacts mid-flight and continue" but there's no mechanism that actually supports this.

## Proposed Solution

Two parts:

### Part 1: Staleness Detection
Add artifact staleness detection to `/opsx:apply`:

1. **Track modification times**: When generating an artifact, record the mtime of its dependencies
2. **Detect staleness**: When `/opsx:apply` runs, check if upstream artifacts (design.md, specs) have been modified since tasks.md was generated
3. **Prompt user**: If stale, ask: "Design was modified after tasks were generated. Would you like to regenerate tasks with `/opsx:continue`?"

## User Experience

### Vision: Seamless Mid-Flight Correction

This is the workflow we want to enable (currently documented but not supported):

```
You: /opsx:apply

AI:  Working through tasks...
     ✓ Task 1.1: Created caching layer
     ✓ Task 1.2: Added cache invalidation

     Working on 1.3: Implement TTL...
     I noticed the design assumes Redis, but your project uses
     in-memory caching. Should I update the design?

You: Yes, update it to use the existing cache module.

AI:  Updated design.md to use CacheManager from src/cache/
     Updated tasks.md with revised implementation steps
     Continuing implementation...
     ✓ Task 1.3: Implemented TTL using CacheManager
     ...
```

**No restart needed.** Just update the artifact and continue.

### Staleness Warning UX

When user manually edits an upstream artifact:

```
$ /opsx:apply

⚠️  Detected changes to upstream artifacts:
    - design.md modified 5 minutes ago (after tasks.md was generated)

Options:
1. Regenerate tasks (recommended)
2. Continue anyway with current tasks
3. Cancel

>
```

### Part 2: Regeneration Capability

Add a way to regenerate specific artifacts:

```bash
# Option A: Flag on continue
/opsx:continue --regenerate tasks

# Option B: Separate command
/opsx:regenerate tasks

# Option C: Interactive prompt when staleness detected
/opsx:apply
# "Design changed. Regenerate tasks? [y/N]"
```

## Technical Approach

### Option A: Metadata File
Store `.openspec-meta.json` in change directory:
```json
{
  "tasks.md": {
    "generated_at": "2025-01-24T10:00:00Z",
    "dependencies": {
      "design.md": "2025-01-24T09:55:00Z",
      "specs/feature/spec.md": "2025-01-24T09:50:00Z"
    }
  }
}
```

### Option B: Frontmatter
Add YAML frontmatter to generated artifacts:
```markdown
---
generated_at: 2025-01-24T10:00:00Z
depends_on:
  - design.md@2025-01-24T09:55:00Z
---
# Tasks
...
```

### Option C: Git-based
Use git to detect if upstream files changed since downstream was last modified. No extra metadata needed but requires git.

## Non-Goals

- Automatic regeneration (user should always choose)
- Blocking apply entirely (just warn)
- Tracking code file changes (only artifact dependencies)

## Dependencies

- Should be implemented after `fix-midflight-update-docs` so docs are accurate first
- Could be combined with that change if desired

## Success Criteria

- User is warned when applying with stale artifacts
- Clear path to regenerate if needed
- No false positives (only warn when genuinely stale)
- Documentation claims become actually true
