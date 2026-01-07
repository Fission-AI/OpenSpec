## Why

Spec application is currently bundled with archive - users must run `openspec archive` to apply delta specs to main specs. This couples two distinct concerns (applying specs vs. archiving the change) and forces users to wait until they're "done" to see main specs updated. Users want the flexibility to sync specs earlier in the workflow while iterating.

## What Changes

- Add `/opsx:sync` skill that syncs delta specs to main specs as a standalone action
- The operation is idempotent - safe to run multiple times, agent reconciles main specs to match deltas
- Archive continues to work as today (applies specs if not already reconciled, then moves to archive)
- No new state tracking - the agent reads delta and main specs, reconciles on each run
- Agent-driven approach allows intelligent merging (partial updates, adding scenarios)

**Workflow becomes:**
```
/opsx:new → /opsx:continue → /opsx:apply → archive
                                  │
                                  └── /opsx:sync (optional, anytime)
```

## Capabilities

### New Capabilities
- `specs-sync-skill`: Skill template for `/opsx:sync` command that reconciles main specs with delta specs

### Modified Capabilities
- None (agent-driven, no CLI command needed)

## Impact

- **Skills**: New `openspec-sync-specs` skill in `skill-templates.ts`
- **Archive**: No changes needed - already does reconciliation, will continue to work
- **Agent workflow**: Users gain flexibility to sync specs before archive
