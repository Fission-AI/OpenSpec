# Lifecycle pilot proposal

**Status:** Draft proposal. The commands and configuration below are not implemented.

A project defines named actions and attaches them to points in a workflow. When an agent reaches one of those points, it asks OpenSpec which actions apply and handles them itself.

OpenSpec resolves which actions are configured for a hook. The calling agent or orchestrator handles them. The [roadmap](../direction/roadmap.md) has the delivery sequence, and the [guide](guide-draft.md) shows the experience from the user's side.

## One change, from start to finish

A team's product requirements live in another repository. An engineer creates an OpenSpec change for the iOS checkout flow with their existing workflow. The proposal links to the requirements it was planned from.

When the Apply skill is ready to start, and before it edits anything, it asks which actions apply:

```bash
openspec lifecycle actions --at change.before-apply --json
```

OpenSpec returns one action in `suggest` mode. The agent offers it:

> Before I start, want me to reread the linked requirements and check that they still match this plan?

If the developer accepts, the agent follows the action's instructions in the current session. It reports any conflict between the current requirements and the plan, and the developer decides what to do. If the developer declines, nothing runs.

The skill then works through its tasks as usual. When every task is complete, it asks again:

```bash
openspec lifecycle actions --at change.applied --json
```

OpenSpec returns a feedback action, and the agent offers it:

> Tasks are complete. Want me to review the work for anything worth sending to the product team?

An accepted review drafts feedback in the current session. It does not submit anything or change the upstream requirements.

## Configure actions and triggers

An **action** is named instructions for an agent. A **trigger** attaches an action to a hook and sets its mode. Both live under `lifecycle:` in the project's `openspec/config.yaml`:

```yaml
# openspec/config.yaml (proposed)
lifecycle:
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
    - on: change.before-apply
      action: requirements-review
      mode: suggest
    - on: change.applied
      action: upstream-feedback
      mode: suggest
```

A trigger has one of two modes:

- **`suggest`:** the agent offers the action and follows it only if the developer accepts.
- **`auto`:** the agent follows the instructions without an extra prompt for that action.

`auto` does not guarantee execution and does not bypass the agent's existing permissions. It means the agent does not ask first.

### Mode and policy

Mode and policy are separate settings, and neither implies the other.

- **Mode** says whether an action is followed without asking or offered first. Its values are `auto` and `suggest`.
- **Policy** says how an action's outcome affects the workflow. Its values are `warn` and `block`.

The pilot supports mode only. Policy needs OpenSpec to see an action's outcome, and the pilot collects no results and enforces nothing. Policy stays in the longer-term model.

Until policy is supported, a trigger that sets `policy` fails validation with an unsupported error. It is never silently accepted.

Lifecycle config uses a dedicated strict reader (`readLifecycleConfig()`) called by `openspec lifecycle actions` and full-project `openspec validate --all` (never by `--specs` or single-item validation, so a lifecycle typo never blocks archiving specs). `readProjectConfig()` stays forgiving so unrelated commands (`status`, `list`, `archive`) keep working.

Validation rules:
- **Actions:** `instructions` is required (non-empty string); `title` is optional (defaults to the action id); `description` is optional. Action ids must be kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`). No `kind` field is required today; strict unknown-key rejection ensures older CLIs fail closed on future action fields such as `command:`.
- **Triggers:** `on`, `action`, and `mode` are all required (no implicit default for `mode`).
- **Errors:** Reject unknown keys (with a tailored unsupported error for `policy`), duplicate action ids, duplicate `(on, action)` triggers, triggers that reference a missing action, unsupported modes, invalid hook names, and `lifecycle:` inside a pointer-only repo config (`store: <id>`). A project with no `lifecycle:` block behaves as it does today.

For v1, lookup reuses OpenSpec's existing root and config resolution, including Stores (`--store <id>`), with no repo-plus-store merging: when a Store is the resolved root, the Store's configuration decides which actions are returned, and putting `lifecycle:` in a pointer-only repo config (`store: <id>`) fails loudly instead of being silently ignored. Whether code repositories sharing a Store should later support repo-local hooks is left open. Shared store-selection guidance is updated so built-in skills forward `--store <id>` to `openspec lifecycle`.

## What callers receive

The response is the contract between OpenSpec and every caller. It returns the hook, the resolved `root`, and an ordered list of actions with their instructions inline. On failure, `--json` returns `{ "hook": "...", "status": [...] }` with no `actions` key so an error never looks like an empty match. This shape is illustrative and gets fixed in the second PR:

```json
{
  "hook": "change.before-apply",
  "root": { "source": "nearest", "path": "/path/to/repo" },
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
- Invalid configuration produces a visible error (no `actions` key in JSON), never an empty list.
- The command is read-only. It runs nothing and launches no agent.

There is no separate instruction lookup. There is no result or findings schema, because OpenSpec never sees what an action produced.

OpenSpec passes nothing into an action. The agent already knows which change it is working on, where the files are, and what tools it has.

## Hook names

Built-in hooks use the **`change.*`** namespace and represent **repeatable checkpoints** in a change's lifecycle (not one-time state-transition events), keeping them independent of which skill or orchestrator ran while artifact generation stays fluid:

- **Pilot hooks (wired first):** `change.before-apply` and `change.applied`.
- **Future hooks:** additional `change.*` checkpoints are left undecided until real usage drives them. Verify and review remain optional actions/checks, not mandatory stages.
- **Custom hooks:** start with `custom.` followed by dot-separated kebab-case segments, such as `custom.security-review.completed` (empty or malformed names like `custom.` or `custom..foo` are rejected).
- **Unknown names:** any other name (such as a typo like `change.before-aply` or an unwired built-in hook) is rejected.

A hook is only a name that a caller invokes. There is no registration step and no event declaration.

## Who calls, and when

Built-in skills, custom skills, and external orchestrators all make the same call (passing `--store <id>` when targeting a registered Store). Hooks are **repeatable checkpoints** invoked per call and can run more than once (for example, when Apply resumes or re-runs), so actions should be safe to repeat.

- **`change.before-apply`:** the Apply skill calls it once when Apply is ready to implement (after reading context files and before any edits), on begin or resume. It is skipped when `state` is `blocked` or `all_done`.
- **`change.applied`:** the Apply skill calls it when its state is `all_done`—at Step 3 if the change was already complete (reading `contextFiles` before running an accepted or `auto` action, since Step 3 precedes Step 4) or at Step 7 after tasks finish (never mid-loop during Step 6 instruction refreshes). Custom schemas without tracked tasks never reach `all_done`, so `change.applied` does not fire there.
- **Blocked changes:** a `blocked` change does not reach `change.before-apply` or `change.applied`.
- **Config errors & CLI/skill version skew:** skip hooks only when the installed CLI is known not to support `openspec lifecycle` (unrecognized `lifecycle` command); never swallow unexpected runtime failures as an older CLI. On a structured JSON config error or unexpected failure, Apply reports it and stops before editing on `change.before-apply`, or reports it and finishes normally on `change.applied`. Projects with older installed skills must update their skills before hooks will fire.
- **Action behavior:** what an action does—including whether it pauses for developer input—belongs in the action's own `instructions`, not in Apply.
- **Instruction and status reads:** these never return or fire actions. Apply refreshes its instructions during the task loop, and attaching actions to those reads would repeat every offer.
- **Wrappers:** if a custom skill delegates to the built-in skill, one of them makes the call.

Hooks fire only when a caller asks. Running `openspec archive` by hand fires none. OpenSpec cannot observe an agent that never calls the interface.

## How this differs from operation guidance

`openspec/config.yaml` already supports `operations.apply.guidance` and `operations.archive.guidance`. **Guidance shapes how the agent works throughout an operation; an action is a discrete job done at one moment.** Lifecycle hooks also differ in three practical ways:

1. A hook can be invoked without an active change or an OpenSpec operation in progress (`custom.*`).
2. A hook returns named, discrete actions that a caller can handle one at a time.
3. Each trigger carries a `mode` (`suggest` or `auto`).

## The two actions the pilot proves

The pilot ships two user-defined actions as tested recipes. Neither needs special handling inside OpenSpec.

**Action A: review requirements against the plan.** This is `requirements-review` above. The agent rereads the sources linked from the change and compares what they say now with the accepted plan.

**Action B: run the project's own drift script.** The agent runs a script the team maintains and reports what it prints:

```yaml
lifecycle:
  actions:
    requirements-drift:
      title: Check requirements for changes
      description: Run the team's drift script and report the result.
      instructions: |
        Run scripts/check-requirements-drift.sh and report its output.

  triggers:
    - on: change.before-apply
      action: requirements-drift
      mode: auto
```

The script owns its own baseline and comparison logic. OpenSpec knows nothing about Git, revisions, or sources. Because the agent runs the script, the agent's own permission prompts apply.

Actions do not invoke one another. Action B reports what the script found and stops there. A project that wants both lists two triggers on `change.before-apply`, with the drift script first, and the agent handles them in that order.

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
- `change.before-apply` fires once before edits on begin and resume, and is skipped on `blocked` and `all_done`.
- `change.applied` fires on `all_done` (Step 3 or Step 7, never mid-loop) and never on `blocked`.
- Instruction and status refreshes repeat no offers.
- A trigger that sets `policy`, uses an unknown key, or duplicates an `(on, action)` pair fails validation in `openspec lifecycle actions` and `openspec validate --all`, while unrelated commands (`status`, `list`, `validate --specs`, `archive`) still work.
- Putting `lifecycle:` inside a pointer-only repo config (`store: <id>`) fails loudly instead of being silently ignored.
- A `custom.` hook works from a custom caller, and malformed or mistyped names such as `custom.` or `change.before-aply` are rejected.
- Actions A and B both run through `change.before-apply` with no OpenSpec code specific to either.
- An unreachable source is reported as unread.
- Lookup resolves the right configuration (and reports `root`) when the change lives in a Store (`--store <id>`).

The CLI and config have unit and integration tests. The skill behavior is shown by a recorded end-to-end run on the fixture.

## Out of scope

- Built-in drift detection, or source-version tracking in core.
- A `sources:` or `references:` schema.
- A native runtime for executable actions.
- Policy enforcement, result collection, or blocking. `policy` stays in the longer-term model.
- A findings or result schema.
- Persistent action state, background jobs, or observers.
- Plugin packaging, installation, or profiles.

Detecting and managing drift remains a goal. The pilot serves it through user-defined actions, and Git is one way to implement one.

Generalized references, a provider-agnostic way for a change to reference what it depends on, are a separate exploration. The pilot examples use ordinary Markdown links for now, which is not the permanent answer. Hooks do not depend on references.

These are decided separately: policy, native executable actions and their trust model, additional `change.*` hooks, repo-local hooks alongside a shared Store, plugins, and agent orchestration. See the [roadmap](../direction/roadmap.md).

Mapping how external or custom skills make these calls is part of verifying the custom-caller path.

External-contract generation and verification remain [separate exploration](../direction/external-context-for-changes.md). The [enterprise requirements inventory](../research/enterprise-requirements.md) records the wider needs.
