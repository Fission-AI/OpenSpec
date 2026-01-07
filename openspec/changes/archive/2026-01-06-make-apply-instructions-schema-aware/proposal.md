## Why

The `generateApplyInstructions` function is hardcoded to check for `spec-driven` artifacts (`proposal.md`, `specs/`, `design.md`, `tasks.md`). If a user selects a different schema like `tdd`, the apply instructions are meaningless - they check for files that don't exist in that schema.

This blocks the experimental workflow from supporting multiple schemas properly.

## What Changes

**Scope: Experimental artifact workflow** (`openspec instructions apply`)

**Depends on:** `add-per-change-schema-metadata` (to know which schema a change uses)

- Make `generateApplyInstructions` read artifact definitions from the schema
- Dynamically determine which artifacts exist based on schema
- Define when a change becomes "implementable" (see Design Decision below)
- Generate schema-appropriate context files and instructions

## Design Decision: When is a change implementable?

This is the key question. Different approaches:

### Option A: Explicit `apply` artifact in schema

Add a field to mark which artifact is the "implementation gate":

```yaml
artifacts:
  - id: tasks
    generates: tasks.md
    apply: true  # ← This artifact triggers apply mode
```

**Pros:** Explicit, flexible
**Cons:** Another field to maintain, what if multiple artifacts are `apply: true`?

### Option B: Leaf artifacts are implementable

The artifact(s) with no dependents (nothing depends on them) are the apply target.

- `spec-driven`: `tasks` is a leaf → apply = execute tasks
- `tdd`: `docs` is a leaf → but that doesn't make sense for TDD...

**Pros:** No extra schema field, derived from graph
**Cons:** Doesn't match TDD semantics (implementation is the action, not docs)

### Option C: Schema-level `apply_phase` definition

Add a top-level field to the schema:

```yaml
name: spec-driven
apply_phase:
  requires: [tasks]  # Must exist before apply
  tracks: tasks.md   # File with checkboxes to track
  instruction: "Work through tasks, mark complete as you go"
```

```yaml
name: tdd
apply_phase:
  requires: [tests]  # Must have tests before implementing
  tracks: null       # No checkbox tracking - just make tests pass
  instruction: "Run tests, implement until green, refactor"
```

**Pros:** Full flexibility, schema controls its own apply semantics
**Cons:** More complex schema format

### Option D: Convention-based (artifact ID matching)

If artifact ID is `tasks` or `implementation`, it's the apply target.

**Pros:** Simple, no schema changes
**Cons:** Brittle, doesn't work for custom schemas

### Option E: All artifacts complete → apply available

Apply becomes available when ALL schema artifacts exist. Implementation is whatever the user does after planning.

**Pros:** Simple, no schema changes
**Cons:** Doesn't guide what "apply" means for different workflows

---

## Decision: Add `apply` block to schema.yaml

Add a top-level `apply` field to schema definitions:

```yaml
name: spec-driven
version: 1
description: Default OpenSpec workflow

artifacts:
  # ... existing artifacts ...

apply:
  requires: [tasks]           # Artifacts that must exist before apply
  tracks: tasks.md            # File with checkboxes for progress (optional)
  instruction: |              # Guidance shown to agent
    Read context files, work through pending tasks, mark complete as you go.
    Pause if you hit blockers or need clarification.
```

```yaml
name: tdd
version: 1
description: Test-driven development workflow

artifacts:
  # ... existing artifacts ...

apply:
  requires: [tests]           # Must have tests before implementing
  tracks: null                # No checkbox tracking
  instruction: |
    Run tests to see failures. Implement minimal code to pass each test.
    Refactor while keeping tests green.
```

**Key properties:**
- `requires`: Array of artifact IDs that must exist before apply is available
- `tracks`: Path to file with checkboxes (relative to change dir), or `null` if no tracking
- `instruction`: Custom guidance for the apply phase

**Fallback behavior:** Schemas without `apply` block default to "all artifacts must exist"

## Capabilities

### Modified Capabilities
- `cli-artifact-workflow`: Apply instructions become schema-aware

## Impact

- **Affected code**: `src/commands/artifact-workflow.ts` (generateApplyInstructions)
- **Schema format**: May need new `apply_phase` field
- **Existing schemas**: Need to add apply_phase to `spec-driven` and `tdd`
- **Backward compatible**: Schemas without apply_phase can use default behavior
