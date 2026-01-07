## Context

Currently, delta specs are only applied to main specs when running `openspec archive`. This bundles two concerns:
1. Applying spec changes (delta → main)
2. Archiving the change (move to archive folder)

Users want flexibility to sync specs earlier, especially when iterating. The archive command already contains the reconciliation logic in `buildUpdatedSpec()`.

## Goals / Non-Goals

**Goals:**
- Decouple spec syncing from archiving
- Provide `/opsx:sync` skill for agents to sync specs on demand
- Keep operation idempotent (safe to run multiple times)

**Non-Goals:**
- Tracking whether specs have been synced (no state)
- Changing archive behavior (it will continue to apply specs)
- Supporting partial application (all deltas sync together)

## Decisions

### 1. Reuse existing reconciliation logic

**Decision**: Extract `buildUpdatedSpec()` logic from `ArchiveCommand` into a shared module.

**Rationale**: The archive command already implements delta parsing and application. Rather than duplicate, we extract and reuse.

**Alternatives considered**:
- Duplicate logic in new command (rejected: maintenance burden)
- Have sync call archive with flags (rejected: coupling)

### 2. No state tracking

**Decision**: Don't track whether specs have been synced. Each invocation reads delta and main specs, reconciles.

**Rationale**:
- Idempotent operations don't need state
- Avoids sync issues between flag and reality
- Simpler implementation and mental model

**Alternatives considered**:
- Track `specsSynced: true` in `.openspec.yaml` (rejected: unnecessary complexity)
- Store snapshot of synced deltas (rejected: over-engineering)

### 3. Agent-driven approach (no CLI command)

**Decision**: The `/opsx:sync` skill is fully agent-driven - the agent reads delta specs and directly edits main specs.

**Rationale**:
- Allows intelligent merging (add scenarios without copying entire requirements)
- Delta represents *intent*, not wholesale replacement
- More flexible and natural editing workflow
- Archive still uses programmatic merge (for finalized changes)

### 4. Archive behavior unchanged

**Decision**: Archive continues to apply specs as part of its flow. If specs are already reconciled, the operation is a no-op.

**Rationale**: Backward compatibility. Users who don't use `/opsx:sync` get the same experience.

## Risks / Trade-offs

**[Risk] Multiple changes modify same spec**
→ Last to sync wins. Same as today with archive. Users should coordinate or use sequential archives.

**[Risk] User syncs specs then continues editing deltas**
→ Running `/opsx:sync` again reconciles. Idempotent design handles this.

**[Trade-off] No undo mechanism**
→ Users can `git checkout` main specs if needed. Explicit undo command is out of scope.

## Implementation Approach

1. Extract spec application logic from `ArchiveCommand.buildUpdatedSpec()` into `src/core/specs-apply.ts`
2. Add skill template for `/opsx:sync` in `skill-templates.ts`
3. Register skill in managed skills
