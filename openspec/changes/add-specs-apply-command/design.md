## Context

Currently, delta specs are only applied to main specs when running `openspec archive`. This bundles two concerns:
1. Applying spec changes (delta → main)
2. Archiving the change (move to archive folder)

Users want flexibility to apply specs earlier, especially when iterating. The archive command already contains the reconciliation logic in `buildUpdatedSpec()`.

## Goals / Non-Goals

**Goals:**
- Decouple spec application from archiving
- Provide `/opsx:specs` skill for agents to apply specs on demand
- Add `openspec specs apply` CLI command for direct invocation
- Keep operation idempotent (safe to run multiple times)

**Non-Goals:**
- Tracking whether specs have been applied (no state)
- Changing archive behavior (it will continue to apply specs)
- Supporting partial application (all deltas apply together)

## Decisions

### 1. Reuse existing reconciliation logic

**Decision**: Extract `buildUpdatedSpec()` logic from `ArchiveCommand` into a shared module.

**Rationale**: The archive command already implements delta parsing and application. Rather than duplicate, we extract and reuse.

**Alternatives considered**:
- Duplicate logic in new command (rejected: maintenance burden)
- Have specs apply call archive with flags (rejected: coupling)

### 2. No state tracking

**Decision**: Don't track whether specs have been applied. Each invocation reads delta and main specs, reconciles.

**Rationale**:
- Idempotent operations don't need state
- Avoids sync issues between flag and reality
- Simpler implementation and mental model

**Alternatives considered**:
- Track `specsApplied: true` in `.openspec.yaml` (rejected: unnecessary complexity)
- Store snapshot of applied deltas (rejected: over-engineering)

### 3. Agent-driven for skill, CLI for direct use

**Decision**:
- Skill (`/opsx:specs`) instructs agent to use CLI command
- CLI command (`openspec specs apply`) does the actual work

**Rationale**: Consistent with other opsx skills. CLI provides the capability, skill provides the agent workflow.

### 4. Archive behavior unchanged

**Decision**: Archive continues to apply specs as part of its flow. If specs are already reconciled, the operation is a no-op.

**Rationale**: Backward compatibility. Users who don't use `/opsx:specs` get the same experience.

## Risks / Trade-offs

**[Risk] Multiple changes modify same spec**
→ Last to apply wins. Same as today with archive. Users should coordinate or use sequential archives.

**[Risk] User applies specs then continues editing deltas**
→ Running `/opsx:specs` again reconciles. Idempotent design handles this.

**[Trade-off] No undo mechanism**
→ Users can `git checkout` main specs if needed. Explicit undo command is out of scope.

## Implementation Approach

1. Extract spec application logic from `ArchiveCommand.buildUpdatedSpec()` into `src/core/specs-apply.ts`
2. Create `openspec specs apply` command that uses extracted logic
3. Add skill template for `/opsx:specs` in `skill-templates.ts`
4. Register skill in managed skills
