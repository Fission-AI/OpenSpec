## Configuration

- **Agent count**: <!-- number of agents -->
- **Total tasks**: <!-- total task count -->
- **Tasks per agent**: <!-- ratio -->

## Token Cost Warning

> **Multi-agent execution scales token costs.** Each agent maintains its own context window.
> With <!-- N --> agents, expect roughly <!-- N -->× the token usage of a single-agent run.
> Estimated cost multiplier: **<!-- N -->×**

## Feasibility Assessment

<!-- Is the requested agent count feasible given the dependency structure?
     Can tasks be distributed without excessive cross-agent dependencies?
     If not, recommend a lower agent count. -->

## Agent Assignments

### Agent 1: <!-- agent name/focus area -->

**Tasks:**
<!-- List assigned task IDs -->

**File ownership:**
<!-- Files this agent is responsible for -->

**Execution order:**
<!-- Order respecting dependencies -->

**Cross-agent dependencies:**
<!-- Tasks from other agents this agent must wait for -->

### Agent 2: <!-- agent name/focus area -->

**Tasks:**
<!-- List assigned task IDs -->

**File ownership:**
<!-- Files this agent is responsible for -->

**Execution order:**
<!-- Order respecting dependencies -->

**Cross-agent dependencies:**
<!-- Tasks from other agents this agent must wait for -->

## File Ownership Isolation

| File | Owner Agent | Notes |
|------|-------------|-------|
| <!-- file path --> | <!-- agent --> | <!-- any conflicts or shared access notes --> |

## Cross-Agent Dependencies

| Waiting Agent | Blocked Task | Depends On | Owning Agent |
|---------------|-------------|------------|--------------|
| <!-- agent --> | <!-- task --> | <!-- dependency task --> | <!-- agent --> |

## Claude Code Team Setup

To execute this plan, run `/opsx:multiagent-apply` on this change. It will automate the steps below.

Alternatively, set up the team manually:

**1. Create the team** using `TeamCreate`:
- `team_name`: the change name (kebab-case)
- `description`: brief description from the proposal

**2. Populate the shared task list** using `TaskCreate` for each task:
- `subject`: task description (e.g., "1.1 Create module structure")
- `description`: include the `Files:` annotation and relevant context
- `activeForm`: present-continuous form (e.g., "Creating module structure")

Then use `TaskUpdate` with `addBlockedBy` to set dependency relationships, and `TaskUpdate` with `owner` to pre-assign tasks per the agent assignments above.

**3. Spawn teammates** using the `Agent` tool for each agent:
- `name`: agent name from assignments above
- `team_name`: the change name
- `subagent_type`: "general-purpose"
- `isolation`: "worktree"
- `prompt`: include assigned tasks, file ownership, execution order, and cross-agent dependencies

**4. Monitor and shutdown:** Use `TaskList` to track progress. Send `shutdown_request` via `SendMessage` when all tasks are complete.
