## Tasks

### Core Implementation

- [x] Extract spec application logic from `ArchiveCommand` into `src/core/specs-apply.ts`
  - Move `buildUpdatedSpec()`, `findSpecUpdates()`, `writeUpdatedSpec()` to shared module
  - Keep `ArchiveCommand` importing from the new module
  - Ensure all validation logic is preserved

### Skill Template

- [x] Add `getSyncSpecsSkillTemplate()` function in `src/core/templates/skill-templates.ts`
  - Skill name: `openspec-sync-specs`
  - Description: Sync delta specs to main specs
  - **Agent-driven**: Instructions for agent to read deltas and edit main specs directly

- [x] Add `/opsx:sync` slash command template in `skill-templates.ts`
  - Mirror the skill template for slash command format
  - **Agent-driven**: No CLI command, agent does the merge

### Registration

- [x] Register skill in managed skills (via `artifact-experimental-setup`)
  - Add to skill list with appropriate metadata
  - Ensure it appears in setup output

### Design Decision

**Why agent-driven instead of CLI-driven?**

The programmatic merge operates at requirement-level granularity:
- MODIFIED requires copying ALL scenarios, not just the changed ones
- If agent forgets a scenario, it gets deleted
- Delta specs become bloated with copied content

Agent-driven approach:
- Agent can apply partial updates (add a scenario without copying others)
- Delta represents *intent*, not wholesale replacement
- More flexible and natural editing workflow
- Archive still uses programmatic merge (for finalized changes)
