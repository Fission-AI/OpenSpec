## Configuration

- **Agent count**: 3
- **Total tasks**: 22
- **Tasks per agent**: ~7

## Token Cost Warning

> **Multi-agent execution scales token costs.** Each agent maintains its own context window.
> With 3 agents, expect roughly 3× the token usage of a single-agent run.
> Estimated cost multiplier: **3×**

## Feasibility Assessment

3 agents is feasible. The dependency graph shows three natural clusters:

1. **New skill creation** (tasks 1.x, 2.x) — all centered on the new `multiagent-apply.ts` file and its registration
2. **Existing template fixes** (tasks 3.x, 4.x, 5.x, 6.x) — edits to existing files, fully independent of cluster 1
3. **Tests** (tasks 7.x) — depends on both clusters completing first

With 3 agents, cross-agent dependencies are minimal: only the test agent needs to wait for the other two.

## Agent Assignments

### Agent 1: new-skill

**Focus:** Create the new `/opsx:multiagent-apply` skill template and register it in the system.

**Tasks:**
- 1.1 Create `multiagent-apply.ts` file
- 1.2 Write skill instructions prompt
- 1.3 Write command template content
- 2.1 Export from `skill-templates.ts`
- 2.2 Register in `getSkillTemplates()`
- 2.3 Register in `getCommandTemplates()`
- 2.4 Add `'multiagent-apply'` to `ALL_WORKFLOWS`

**File ownership:**
- `src/core/templates/workflows/multiagent-apply.ts` (create)
- `src/core/templates/skill-templates.ts` (edit)
- `src/core/shared/skill-generation.ts` (edit)
- `src/core/profiles.ts` (edit)

**Execution order:**
1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 2.4

**Cross-agent dependencies:**
- None. This agent works independently.

### Agent 2: template-fixes

**Focus:** Fix the existing multiagent skill, distribution template, schema instructions, and tool detection.

**Tasks:**
- 3.1 Fix TodoWrite in skill template
- 3.2 Fix TodoWrite in command template
- 3.3 Update output section to reference `/opsx:multiagent-apply`
- 4.1 Update distribution.md template team setup section
- 5.1 Update distribution artifact instruction in schema.yaml
- 5.2 Update apply.instruction in schema.yaml
- 6.1 Add to tool-detection.ts
- 6.2 Add to init.ts

**File ownership:**
- `src/core/templates/workflows/multiagent.ts` (edit)
- `schemas/dispec-driven/templates/distribution.md` (edit)
- `schemas/dispec-driven/schema.yaml` (edit)
- `src/core/shared/tool-detection.ts` (edit)
- `src/core/init.ts` (edit)

**Execution order:**
3.1 → 3.2 → 3.3 → 4.1 → 5.1 → 5.2 → 6.1 → 6.2

**Cross-agent dependencies:**
- None. This agent works independently.

### Agent 3: tests

**Focus:** Write and update all tests, verify integration.

**Tasks:**
- 7.1 Test `getOpsxMultiagentApplySkillTemplate()`
- 7.2 Test `getOpsxMultiagentApplyCommandTemplate()`
- 7.3 Update parity test
- 7.4 Test ALL_WORKFLOWS includes `'multiagent-apply'`
- 7.5 Update skill-generation test counts
- 7.6 Regression check dispec-driven tests
- 7.7 Verify TodoWrite removal

**File ownership:**
- `test/core/templates/multiagent-apply.test.ts` (create)
- `test/core/templates/skill-templates-parity.test.ts` (edit)
- `test/core/profiles.test.ts` (edit)
- `test/core/shared/skill-generation.test.ts` (edit)
- `test/core/artifact-graph/dispec-driven.test.ts` (read-only)

**Execution order:**
7.6 (can start immediately) → wait for Agent 1 and Agent 2 → 7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.7

**Cross-agent dependencies:**
- 7.1, 7.2 blocked by Agent 1 completing tasks 1.1–1.3
- 7.3, 7.5 blocked by Agent 1 completing tasks 2.1–2.3
- 7.4 blocked by Agent 1 completing task 2.4
- 7.7 blocked by Agent 2 completing tasks 3.1–3.2

## File Ownership Isolation

| File | Owner Agent | Notes |
|------|-------------|-------|
| `src/core/templates/workflows/multiagent-apply.ts` | new-skill | New file, exclusive |
| `src/core/templates/skill-templates.ts` | new-skill | Add export line |
| `src/core/shared/skill-generation.ts` | new-skill | Add entries to arrays |
| `src/core/profiles.ts` | new-skill | Add to ALL_WORKFLOWS |
| `src/core/templates/workflows/multiagent.ts` | template-fixes | Edit existing content |
| `schemas/dispec-driven/templates/distribution.md` | template-fixes | Edit template |
| `schemas/dispec-driven/schema.yaml` | template-fixes | Edit instructions |
| `src/core/shared/tool-detection.ts` | template-fixes | Add workflow entry |
| `src/core/init.ts` | template-fixes | Add workflow entry |
| `test/core/templates/multiagent-apply.test.ts` | tests | New file, exclusive |
| `test/core/templates/skill-templates-parity.test.ts` | tests | Edit assertions |
| `test/core/profiles.test.ts` | tests | Edit assertions |
| `test/core/shared/skill-generation.test.ts` | tests | Edit assertions |

No file ownership conflicts detected. Each file is owned by exactly one agent.

## Cross-Agent Dependencies

| Waiting Agent | Blocked Task | Depends On | Owning Agent |
|---------------|-------------|------------|--------------|
| tests | 7.1 | 1.1, 1.2, 1.3 | new-skill |
| tests | 7.2 | 1.1, 1.2, 1.3 | new-skill |
| tests | 7.3 | 2.1, 2.2, 2.3 | new-skill |
| tests | 7.4 | 2.4 | new-skill |
| tests | 7.5 | 2.2, 2.3 | new-skill |
| tests | 7.7 | 3.1, 3.2 | template-fixes |

The tests agent is the only one with cross-agent dependencies. Agents "new-skill" and "template-fixes" are fully independent of each other.

## Claude Code Team Setup

To execute this plan, use `/opsx:multiagent-apply` on the `add-multiagent-apply-workflow` change.

Alternatively, set up the team manually:

**1. Create the team:**

Use `TeamCreate` with:
- `team_name`: `"add-multiagent-apply-workflow"`
- `description`: `"Add /opsx:multiagent-apply skill and fix existing multiagent workflow"`

**2. Create tasks in the shared task list:**

Use `TaskCreate` for each of the 22 tasks from `tasks.md`. Include the task description as `subject`, the `Files:` annotation as `description`, and a present-continuous `activeForm` (e.g., "Creating multiagent-apply.ts").

After all tasks are created, use `TaskUpdate` with `addBlockedBy` to set up dependency relationships, and `TaskUpdate` with `owner` to pre-assign tasks to agents per the assignment cards above.

**3. Spawn teammates:**

Use the `Agent` tool three times, once per agent:

- Agent: `name: "new-skill"`, `team_name: "add-multiagent-apply-workflow"`, `subagent_type: "general-purpose"`, `isolation: "worktree"`
  - Prompt: Assign tasks 1.1–1.3, 2.1–2.4. Include file ownership list and execution order.

- Agent: `name: "template-fixes"`, `team_name: "add-multiagent-apply-workflow"`, `subagent_type: "general-purpose"`, `isolation: "worktree"`
  - Prompt: Assign tasks 3.1–3.3, 4.1, 5.1–5.2, 6.1–6.2. Include file ownership list and execution order.

- Agent: `name: "tests"`, `team_name: "add-multiagent-apply-workflow"`, `subagent_type: "general-purpose"`, `isolation: "worktree"`
  - Prompt: Assign tasks 7.1–7.7. Note cross-agent dependencies: start with 7.6 (no deps), then wait for new-skill and template-fixes to complete before running remaining tests.

**4. Monitor and shutdown:**

Use `TaskList` to monitor progress. When all tasks are completed, send `shutdown_request` to each teammate via `SendMessage`.
