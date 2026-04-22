## Context

The `dispec-driven` schema produces six artifacts: proposal → specs → design → tasks → dependencies → distribution. The first four are shared with `spec-driven`; the last two (`dependencies.md`, `distribution.md`) are unique to multi-agent execution. The existing `/opsx:apply` skill reads `tasks.md` and works through tasks sequentially with a single agent. There is no apply variant that leverages the distribution plan to orchestrate a Claude Code agent team.

Claude Code provides team coordination primitives: `TeamCreate` (creates a team + shared task list), `Agent` (spawns teammates with `team_name`), `TaskCreate`/`TaskUpdate`/`TaskList` (shared task list), and `SendMessage` (inter-agent communication). Teammates can be isolated via `isolation: "worktree"` on the Agent tool call.

The `/opsx:multiagent` skill currently references `TodoWrite` (deprecated) and the distribution template's "Claude Code Team Setup" section uses pseudo-bash comments instead of describing real tool calls.

## Goals / Non-Goals

**Goals:**
- Create an `/opsx:multiagent-apply` skill that bridges the distribution plan to Claude Code team execution
- Update `/opsx:multiagent` to use correct Claude Code primitives (`TaskCreate`/`TaskUpdate` instead of `TodoWrite`)
- Update the `distribution.md` template to produce actionable team setup instructions
- Update the `dispec-driven` schema's `apply.instruction` to describe multi-agent execution

**Non-Goals:**
- Changing the `spec-driven` schema or its apply workflow
- Adding a programmatic API for team orchestration (this is skill/prompt-level orchestration)
- Auto-merging worktree branches (agents produce branches; the user merges)
- Supporting non-Claude-Code agent runtimes

## Decisions

### 1. Skill-level orchestration, not programmatic

**Decision:** The multiagent-apply workflow is implemented as a skill template (prompt instructions) that guides the AI agent through team setup, not as TypeScript code that calls Claude Code APIs directly.

**Rationale:** OpenSpec skills are prompt-driven — they instruct the AI agent what tools to call. This matches the existing pattern (`/opsx:apply`, `/opsx:propose`, etc.) and doesn't require OpenSpec to have a programmatic dependency on Claude Code's internal APIs. The skill text tells the agent: "call TeamCreate with these params, then call Agent for each teammate."

**Alternative considered:** A TypeScript orchestrator that programmatically calls Claude Code APIs. Rejected because OpenSpec is tool-agnostic and should not couple to Claude Code's runtime.

### 2. One skill per concern: multiagent-apply is separate from apply

**Decision:** Create `/opsx:multiagent-apply` as a new skill rather than adding multi-agent logic to the existing `/opsx:apply`.

**Rationale:** The apply skill is already complex. Multi-agent adds team creation, task list population, teammate spawning, progress monitoring, and shutdown — fundamentally different from sequential task execution. Keeping them separate avoids conditional branching in the apply prompt and lets each skill be focused.

**Alternative considered:** Adding a `--multiagent` flag to `/opsx:apply`. Rejected because it would make the apply prompt too long and hard to maintain.

### 3. Worktree isolation for all teammates

**Decision:** All spawned teammates use `isolation: "worktree"` to get an isolated copy of the repository.

**Rationale:** Multiple agents writing to the same repo simultaneously causes conflicts. Worktrees give each agent a private branch. After completion, the user (or the team lead agent) can merge branches. This aligns with how Claude Code's Agent tool is designed to work in team scenarios.

### 4. Task list as the coordination mechanism

**Decision:** Use Claude Code's `TaskCreate`/`TaskUpdate`/`TaskList` tools as the shared coordination layer between agents, not file-based coordination.

**Rationale:** Claude Code's task list is purpose-built for multi-agent coordination — it supports ownership, status tracking, and dependency relationships (`blockedBy`/`addBlocks`). Writing a custom file-based tracker would duplicate this functionality.

### 5. Distribution template uses descriptive instructions, not tool-call JSON

**Decision:** The "Claude Code Team Setup" section in `distribution.md` describes team setup in natural language with parameter listings, not raw JSON tool calls.

**Rationale:** The distribution.md is a planning document read by both humans and AI. Raw JSON would be harder for humans to review. The `/opsx:multiagent-apply` skill is responsible for translating the plan into actual tool calls.

## Risks / Trade-offs

**[Worktree merge conflicts]** → Agents work on isolated branches, but merging may produce conflicts. Mitigation: the distribution plan enforces file ownership isolation (one agent per file). The skill warns if isolation is violated.

**[Token cost scaling]** → N agents ≈ N× token cost. Mitigation: the skill displays an explicit cost warning and asks for confirmation before spawning. The distribution artifact already includes a cost warning section.

**[Cross-agent sync latency]** → If agent A blocks agent B, B idles until A completes the blocking task. Mitigation: the dependency analysis minimizes cross-agent dependencies; the distribution plan groups dependent tasks into the same agent where possible.

**[Skill prompt length]** → The multiagent-apply skill prompt is necessarily longer than simpler skills. Mitigation: structure the prompt with clear numbered steps and keep orchestration logic in the skill, not in the schema instruction.

## Migration Plan

No migration needed — this adds new capabilities without changing existing ones. The `/opsx:apply` skill continues to work unchanged for single-agent and `spec-driven` workflows. Users opt into multi-agent execution by using `/opsx:multiagent` (planning) followed by `/opsx:multiagent-apply` (execution).

The `TodoWrite` → `TaskCreate`/`TaskUpdate` fix in `/opsx:multiagent` is backward-compatible since `TodoWrite` was already non-functional in current Claude Code.

## Parallelism Considerations

Three independent workstreams:

1. **New skill template** (`multiagent-apply.ts`): The new `/opsx:multiagent-apply` skill and command templates. No dependencies on the other two workstreams — can be built first or in parallel.

2. **Template fixes** (`multiagent.ts` + `distribution.md`): Update the existing `/opsx:multiagent` skill to fix `TodoWrite` references and update the distribution template's team setup section. Independent of workstream 1.

3. **Schema instruction update** (`schema.yaml`): Update `dispec-driven`'s `apply.instruction` and `distribution` artifact instruction. Depends on workstream 1 being defined (needs to reference the new skill name) but can be written in parallel once the skill name is agreed (`/opsx:multiagent-apply`).

**Serialization point:** Tests should be written after all three workstreams are complete, as they may need to verify the integration between the skill, template, and schema.

## Open Questions

1. **Should the team lead agent remain active for monitoring, or hand off to the user?** Current design: the skill acts as team lead, monitors progress via `TaskList`, and sends `shutdown_request` when done. Alternative: create the team and return immediately, letting the user monitor.

2. **Should multiagent-apply automatically merge worktree branches?** Current design: no — agents produce branches, user merges. This is safer but adds a manual step.
