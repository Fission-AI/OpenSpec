## ADDED Requirements

### Requirement: Multiagent apply skill reads distribution plan

The system SHALL provide an `/opsx:multiagent-apply` skill that reads a completed `distribution.md` artifact from a `dispec-driven` change and uses it to orchestrate a Claude Code agent team.

#### Scenario: Successful team orchestration from distribution plan

- **WHEN** the user invokes `/opsx:multiagent-apply` on a change with all `dispec-driven` artifacts complete
- **THEN** the skill SHALL read `distribution.md` to extract agent count, agent assignments, file ownership, and cross-agent dependencies
- **AND** the skill SHALL create a Claude Code team using `TeamCreate` with `team_name` derived from the change name
- **AND** the skill SHALL create tasks in the shared task list using `TaskCreate` for each task from `tasks.md`, preserving dependency relationships via `addBlockedBy`/`addBlocks`
- **AND** the skill SHALL spawn one teammate per agent assignment using the `Agent` tool with `team_name` and `name` parameters

#### Scenario: Change missing required artifacts

- **WHEN** the user invokes `/opsx:multiagent-apply` on a change where `distribution.md` does not exist
- **THEN** the skill SHALL report which artifacts are missing
- **AND** the skill SHALL suggest running `/opsx:multiagent` to complete the planning phase

#### Scenario: Change uses non-dispec schema

- **WHEN** the user invokes `/opsx:multiagent-apply` on a change that uses `spec-driven` or another schema without a `distribution` artifact
- **THEN** the skill SHALL inform the user that multi-agent apply requires the `dispec-driven` schema
- **AND** the skill SHALL suggest using `/opsx:apply` for single-agent execution instead

### Requirement: Team creation from distribution plan

The system SHALL create a Claude Code team with teammates mapped from the distribution plan's agent assignment cards.

#### Scenario: Team and teammates created correctly

- **WHEN** the distribution plan specifies 3 agents named "schema-updates", "skill-templates", and "tests"
- **THEN** the skill SHALL call `TeamCreate` with `team_name` set to the change name (e.g., `"add-multiagent-apply-workflow"`)
- **AND** the skill SHALL spawn 3 teammates using the `Agent` tool, each with `name` matching the agent name from the distribution plan, `team_name` set to the team name, and `subagent_type` set to `"general-purpose"`

#### Scenario: Teammate prompt includes agent context

- **WHEN** spawning a teammate for an agent assignment
- **THEN** the teammate's `prompt` SHALL include: the agent's assigned task IDs, file ownership list, execution order, cross-agent dependency descriptions, and a reference to the change directory path
- **AND** the prompt SHALL instruct the teammate to use `TaskList` to find available work and `TaskUpdate` to claim and complete tasks

### Requirement: Task list population from tasks.md

The system SHALL parse `tasks.md` and create entries in the Claude Code shared task list that teammates can claim.

#### Scenario: Tasks created with correct metadata

- **WHEN** populating the task list from a `tasks.md` containing 20 checkbox tasks
- **THEN** the skill SHALL call `TaskCreate` once per task with `subject` set to the task description and `description` including the `Files:` annotation content
- **AND** each task SHALL have an `activeForm` derived from the task description (present continuous form)

#### Scenario: Task dependencies preserved

- **WHEN** `dependencies.md` specifies that task 2.1 has a Finish-to-Start dependency on task 1.3
- **THEN** the skill SHALL use `TaskUpdate` with `addBlockedBy` to link task 2.1 to task 1.3 after both are created

#### Scenario: Tasks pre-assigned to agents

- **WHEN** `distribution.md` assigns tasks 1.1, 1.2, and 2.1 to agent "schema-updates"
- **THEN** the skill SHALL use `TaskUpdate` with `owner` set to `"schema-updates"` for those tasks after creation

### Requirement: Teammate isolation with worktrees

The system SHALL spawn teammates with `isolation: "worktree"` to prevent file conflicts between agents working in parallel.

#### Scenario: Agents work in isolated worktrees

- **WHEN** spawning teammates for parallel execution
- **THEN** each teammate Agent call SHALL include `isolation: "worktree"` so that each agent operates on an isolated copy of the repository

#### Scenario: File ownership conflict detected

- **WHEN** the distribution plan shows two agents writing to the same file
- **THEN** the skill SHALL warn the user about the conflict before spawning teammates
- **AND** the skill SHALL suggest reordering or reassigning tasks to eliminate the conflict

### Requirement: Cross-agent dependency monitoring

The system SHALL handle sync points where one agent must wait for another agent's output.

#### Scenario: Agent blocked by cross-agent dependency

- **WHEN** agent "tests" has tasks blocked by agent "schema-updates" completing task 1.3
- **THEN** the task list SHALL reflect this via `blockedBy` relationships
- **AND** when agent "schema-updates" marks task 1.3 as completed via `TaskUpdate`, the blocked tasks for agent "tests" SHALL become unblocked automatically

#### Scenario: Team lead monitors progress

- **WHEN** the multi-agent execution is running
- **THEN** the skill (acting as team lead) SHALL periodically check `TaskList` to monitor overall progress
- **AND** the skill SHALL report completion status to the user when all tasks are done
- **AND** the skill SHALL send `shutdown_request` messages to all teammates when all tasks are completed

### Requirement: Token cost warning before execution

The system SHALL warn the user about token cost scaling before spawning agents.

#### Scenario: Cost warning displayed

- **WHEN** the user confirms multi-agent execution with N agents
- **THEN** the skill SHALL display a warning stating that N agents will consume approximately N× the token usage of a single-agent run
- **AND** the skill SHALL ask the user to confirm before proceeding with team creation
