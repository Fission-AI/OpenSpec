## Why

Spec application is currently bundled with archive - users must run `openspec archive` to apply delta specs to main specs. This couples two distinct concerns (applying specs vs. archiving the change) and forces users to wait until they're "done" to see main specs updated. Users want the flexibility to apply specs earlier in the workflow while iterating.

## What Changes

- Add `/opsx:specs` skill that applies delta specs to main specs as a standalone action
- The operation is idempotent - safe to run multiple times, agent reconciles main specs to match deltas
- Archive continues to work as today (applies specs if not already reconciled, then moves to archive)
- No new state tracking - the agent reads delta and main specs, reconciles on each run

**Workflow becomes:**
```
/opsx:new → /opsx:continue → /opsx:apply → archive
                                  │
                                  └── /opsx:specs (optional, anytime)
```

## Capabilities

### New Capabilities
- `specs-apply-skill`: Skill template for `/opsx:specs` command that reconciles main specs with delta specs

### Modified Capabilities
- `cli-artifact-workflow`: Add `openspec specs apply --change <name>` CLI command to support the skill

## Impact

- **Skills**: New `openspec-specs-apply` skill in `skill-templates.ts`
- **CLI**: New `specs apply` subcommand in artifact workflow commands
- **Archive**: No changes needed - already does reconciliation, will continue to work
- **Agent workflow**: Users gain flexibility to apply specs before archive
