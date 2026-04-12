## Why

The `dispec-driven` schema produces a full distribution plan (dependencies.md, distribution.md) with agent assignments, file ownership, and cross-agent sync points. But the workflow stops at planning — there is no apply phase that actually sets up and runs a Claude Code agent team. Users must manually translate the distribution document into `TeamCreate`, `Agent`, and `TaskCreate` calls, which defeats the purpose of automated multi-agent execution.

Additionally, the current `/opsx:multiagent` skill references `TodoWrite` (deprecated) and shows pseudo-bash comments instead of real Claude Code team primitives.

## What Changes

- **Add `/opsx:multiagent-apply` workflow**: A new skill/command that reads `distribution.md` and orchestrates a Claude Code agent team — creating the team, spawning teammates, populating the shared task list, and monitoring execution.
- **Update `/opsx:multiagent` skill**: Replace `TodoWrite` references with `TaskCreate`/`TaskUpdate`. Fix the "Claude Code Team Setup" section in `distribution.md` template to produce actionable instructions using real team primitives (`TeamCreate`, `Agent` with `team_name`, `SendMessage`).
- **Add team-aware apply instruction**: The `dispec-driven` schema's `apply.instruction` needs to describe multi-agent execution: how to create a team, spawn agents with isolated worktrees, assign tasks via `TaskUpdate`, and handle cross-agent dependencies.

## Capabilities

### New Capabilities

- **multiagent-apply**: The `/opsx:multiagent-apply` skill that reads a completed distribution plan and orchestrates a Claude Code agent team for parallel implementation.

### Modified Capabilities

- **command-generation**: Update the distribution.md template to produce real Claude Code team setup instructions instead of pseudo-bash comments.

## Impact

- `src/core/templates/workflows/multiagent.ts` — update skill/command template text
- `schemas/dispec-driven/schema.yaml` — update apply instruction and distribution artifact instruction
- `schemas/dispec-driven/templates/distribution.md` — update team setup section
- New workflow module for the multiagent-apply skill
- Tests for the new workflow
