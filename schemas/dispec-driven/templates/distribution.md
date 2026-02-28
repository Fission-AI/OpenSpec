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

```bash
# Create the team
# TeamCreate: team_name="<change-name>", description="<change description>"

# Spawn teammates (one per agent above)
# Agent: name="agent-1", prompt="<task assignment for agent 1>"
# Agent: name="agent-2", prompt="<task assignment for agent 2>"

# Review the distribution plan before executing
```
