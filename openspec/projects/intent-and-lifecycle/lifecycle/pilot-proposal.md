# Lifecycle pilot proposal

**Status:** Draft proposal. The commands and configuration below are not implemented.

A project defines named actions and attaches them to points in a workflow. When an agent reaches one of those points, it asks OpenSpec which actions apply and handles them itself.

OpenSpec resolves which actions are configured for a hook. The calling agent or orchestrator handles them. The [roadmap](../direction/roadmap.md) has the delivery sequence, and the [guide](guide-draft.md) shows the experience from the user's side.

## One change, from start to finish

A team's product requirements live in another repository. An engineer creates an OpenSpec change for the iOS checkout flow with their existing workflow. The proposal links to the requirements it was planned from.

When the Apply skill is ready to start, and before it edits anything, it asks which actions apply:

```bash
openspec lifecycle actions --at apply.before --json
```

OpenSpec returns one action in `suggest` mode. The agent offers it:

> Before I start, want me to reread the linked requirements and check that they still match this plan?

If the developer accepts, the agent follows the action's instructions in the current session. It reports any conflict between the current requirements and the plan, and the developer decides what to do. If the developer declines, nothing runs.

The skill then works through its tasks as usual. When every task is complete, it asks again:

```bash
openspec lifecycle actions --at apply.completed --json
```

OpenSpec returns a feedback action, and the agent offers it:

> Tasks are complete. Want me to review the work for anything worth sending to the product team?

An accepted review drafts feedback in the current session. It does not submit anything or change the upstream requirements.

## Configure actions and triggers

An **action** is named instructions for an agent. A **trigger** attaches an action to a hook and sets its mode. Both live in the project's `openspec/config.yaml`. This shape is illustrative and gets fixed in the first PR:

```yaml
# openspec/config.yaml (proposed)
actions:
  requirements-review:
    title: Review requirements against the plan
    description: Reread linked requirements and compare them with this change.
    instructions: |
      Read the sources linked from this change's planning artifacts.
      Compare what they say now with the accepted plan.
      Report conflicts, the work they affect, and anything you could not read.
      Do not edit the plan or the sources.
  upstream-feedback:
    title: Review implementation feedback
    description: Find decisions or evidence worth sharing upstream.
    instructions: |
      Review this change's requirements, implementation decisions,
      and verification evidence. Draft feedback with source references
      and mark uncertainty. Do not submit feedback or change upstream
      requirements without separate approval.

triggers:
  - on: apply.before
    run: requirements-review
    mode: suggest
  - on: apply.completed
    run: upstream-feedback
    mode: suggest
```

A trigger has one of two modes:

- **`suggest`:** the agent offers the action and follows it only if the developer accepts.
- **`auto`:** the agent follows the instructions without an extra prompt for that action.

`auto` does not guarantee execution and does not bypass the agent's existing permissions. It means the agent does not ask first.

Config validation rejects duplicate action ids, triggers that reference a missing action, unsupported modes, and unknown hook names with no namespace. A project with no actions behaves as it does today.

Lookup reuses OpenSpec's existing root and config resolution, including Stores.

## What callers receive

The response is the contract between OpenSpec and every caller. It returns the hook and an ordered list of actions with their instructions inline. This shape is illustrative and gets fixed in the second PR:

```json
{
  "hook": "apply.before",
  "actions": [
    {
      "id": "requirements-review",
      "mode": "suggest",
      "title": "Review requirements against the plan",
      "description": "Reread linked requirements and compare them with this change.",
      "instructions": "Read the sources linked from this change's planning artifacts. ..."
    }
  ]
}
```

- Order follows the trigger configuration, and callers preserve it.
- A hook with no triggers returns an empty list.
- Invalid configuration produces a visible error, never an empty list.
- The command is read-only. It runs nothing and launches no agent.

There is no separate instruction lookup. There is no result or findings schema, because OpenSpec never sees what an action produced.

OpenSpec passes nothing into an action. The agent already knows which change it is working on, where the files are, and what tools it has.

## Hook names

- OpenSpec defines built-in hooks. The pilot uses `apply.before` and `apply.completed`.
- Users can invoke their own namespaced hooks, such as `team.security-review.completed`.
- An unknown name with no namespace is rejected, which catches typos.

A hook is only a name that a caller invokes. There is no registration step and no event declaration.

## Who calls, and when

Built-in skills, custom skills, and external orchestrators all make the same call.

- **`apply.before`:** the Apply skill calls it when it begins or resumes, before any edits.
- **`apply.completed`:** the Apply skill calls it when its state is `all_done`, including for a change that was already complete.
- **Blocked changes:** a `blocked` change does not reach `apply.completed`.
- **Instruction and status reads:** these never return or fire actions. Apply refreshes its instructions during the task loop, and attaching actions to those reads would repeat every offer.
- **Wrappers:** if a custom skill delegates to the built-in skill, one of them makes the call.

Hooks fire only when a caller asks. Running `openspec archive` by hand fires none. OpenSpec cannot observe an agent that never calls the interface.

## How this differs from operation guidance

`openspec/config.yaml` already supports `operations.apply.guidance` and `operations.archive.guidance`. That guidance is standing advice for a whole operation. Lifecycle hooks differ in three ways:

1. A hook can be invoked without an active change or an OpenSpec operation in progress.
2. A hook returns named, discrete actions that a caller can handle one at a time.
3. Each trigger carries a mode.

## The two actions the pilot proves

The pilot ships two user-defined actions as tested recipes. Neither needs special handling inside OpenSpec.

**Action A: review requirements against the plan.** This is `requirements-review` above. The agent rereads the sources linked from the change and compares what they say now with the accepted plan.

**Action B: run the project's own drift script.** The agent runs a script the team maintains and reports what it prints:

```yaml
actions:
  requirements-drift:
    title: Check requirements for changes
    description: Run the team's drift script and report the result.
    instructions: |
      Run scripts/check-requirements-drift.sh and report its output.
      If it reports changes, offer the requirements-review action.

triggers:
  - on: apply.before
    run: requirements-drift
    mode: auto
```

The script owns its own baseline and comparison logic. OpenSpec knows nothing about Git, revisions, or sources. Because the agent runs the script, the agent's own permission prompts apply.

### What a review can and cannot claim

Action A compares the **current** source with the **current** plan. It can report that they conflict. It cannot report what changed since planning, because that needs a recorded earlier version.

A team that wants "changed since planning" supplies that history itself, as Action B's script does. An agent that cannot read a source says so and never counts it as checked.

### Acting on a finding

When a review finds a conflict, the developer chooses what happens next. They can keep the plan, ask upstream for clarification, or revise the plan through the existing `openspec-update-change` skill, which confirms before it edits. The review should call out completed tasks that may need another look.

Nothing is edited silently. A conflict with the source does not prove the implementation is wrong.

## What proves it works

Run one fixture project through the built-in Apply skill and through a custom caller:

- A project with no actions keeps its existing behavior.
- A `suggest` action is offered, and both accepting and skipping work in the current session.
- An `auto` action is followed without an extra prompt.
- Two actions on one hook are handled in configuration order.
- `apply.before` fires before edits, on begin and on resume.
- `apply.completed` fires on `all_done` and never on `blocked`.
- Instruction and status refreshes repeat no offers.
- A namespaced hook works from a custom caller, and a mistyped built-in name is rejected.
- Actions A and B both run through `apply.before` with no OpenSpec code specific to either.
- An unreachable source is reported as unread.
- Lookup resolves the right configuration when the change lives in a Store.

The CLI and config have unit and integration tests. The skill behavior is shown by a recorded end-to-end run on the fixture.

## Out of scope

- A built-in drift check, source metadata on changes, recorded revisions, or snapshots.
- A native runtime for executable actions.
- Policy enforcement or blocking.
- A findings or result schema.
- Persistent action state, background jobs, or observers.
- Plugin packaging, installation, or profiles.

Three questions are decided separately: native executable actions and their trust model, whether Archive calls an `archive.before` hook, and plugins. See the [roadmap](../direction/roadmap.md).

We have not inspected the private integration skills. Mapping where they would make these calls is part of checking the custom-caller path.

External-contract generation and verification remain [separate exploration](../direction/external-context-for-changes.md). The [enterprise requirements inventory](../research/enterprise-requirements.md) records the wider needs.
