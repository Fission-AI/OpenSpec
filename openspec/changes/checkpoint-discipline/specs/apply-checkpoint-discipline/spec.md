# apply-checkpoint-discipline Specification

## Purpose
Define the checkpoint contract for the apply-change implementation loop, ensuring task progress is durable and recoverable after session crashes while allowing pragmatic grouping of tightly-coupled tasks.

## ADDED Requirements

### Requirement: Checkpoint after each task
The apply-change skill SHALL checkpoint after completing each task (or small group of tightly-coupled tasks) before starting the next. A checkpoint consists of marking the task complete in the tasks file and committing the changes to git.

#### Scenario: Single task completion
- **WHEN** an agent completes a single pending task
- **THEN** it SHALL mark the task `[x]` in the tasks file
- **AND** run `git add -A && git commit` with a message referencing the task number and a short description
- **AND** output a confirmation (e.g., "Task N complete") before starting the next task

#### Scenario: Session crash after checkpoint
- **WHEN** a session crashes after a task has been checkpointed (marked `[x]` and committed)
- **THEN** the completed task's changes SHALL be recoverable from the git history
- **AND** the tasks file SHALL accurately reflect which tasks were completed

#### Scenario: Session crash before checkpoint
- **WHEN** a session crashes while a task is in progress but before the checkpoint
- **THEN** only the current in-progress task's changes are lost
- **AND** all previously checkpointed tasks remain recoverable

### Requirement: Recovery rationale in instructions
The apply-change skill instructions SHALL explain that the tasks file serves as a recovery log and that progress is only durable once marked complete and committed. This rationale SHALL appear in the implementation step, not only in guardrails.

#### Scenario: Agent reads implementation step
- **WHEN** an agent processes the apply-change skill's implementation step
- **THEN** the step SHALL state that the tasks file is a recovery log
- **AND** SHALL state that progress is only durable once tasks are marked complete and committed

### Requirement: Tightly-coupled task grouping
The apply-change skill SHALL allow tightly-coupled tasks to be checkpointed together in a single commit, but SHALL prohibit batching unrelated tasks.

#### Scenario: Grouping a class change and its test
- **WHEN** two tasks are tightly coupled (e.g., a class modification and its corresponding unit test)
- **THEN** the agent MAY implement both before checkpointing
- **AND** SHALL commit them together in a single checkpoint

#### Scenario: Unrelated tasks
- **WHEN** two tasks are not tightly coupled (their changes would be coherent if split)
- **THEN** the agent SHALL checkpoint each task separately
- **AND** SHALL NOT batch them into a single commit

#### Scenario: Maximum batch size
- **WHEN** an agent groups tightly-coupled tasks
- **THEN** no more than 2–3 tasks SHALL accumulate without a checkpoint

### Requirement: Checkpoint guardrail prominence
The checkpoint rule SHALL appear as the first guardrail in the apply-change skill and SHALL include an explicit anti-batching statement.

#### Scenario: Guardrail ordering
- **WHEN** the apply-change skill's guardrails are rendered
- **THEN** the checkpoint guardrail SHALL be the first item in the list

#### Scenario: Anti-batching statement
- **WHEN** the checkpoint guardrail is rendered
- **THEN** it SHALL explicitly state that large numbers of task completions MUST NOT be batched together

### Requirement: Per-task commits bundled in merge requests
Per-task commits SHALL be bundled into a single merge request per change by default. The agent SHALL prompt the user for confirmation before creating the merge request.

#### Scenario: Creating a merge request after implementation
- **WHEN** all tasks for a change are complete and the user requests a merge request
- **THEN** the agent SHALL include all per-task commits for that change in a single merge request by default
- **AND** SHALL prompt the user to confirm before submitting

#### Scenario: User opts for separate merge requests
- **WHEN** the user declines the default bundling and requests separate merge requests
- **THEN** the agent SHALL accommodate the user's preference
