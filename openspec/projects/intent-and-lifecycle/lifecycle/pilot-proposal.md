# Lifecycle pilot proposal

**Status:** Draft proposal. The commands and configuration below are not implemented.

A project defines named actions and attaches them to points in a workflow. When an agent reaches one of those points, it asks OpenSpec which actions apply and handles them itself.

OpenSpec resolves which actions are configured for a hook. The calling agent or orchestrator handles them. The [roadmap](../direction/roadmap.md) has the delivery sequence, and the [guide](guide-draft.md) shows the experience from the user's side.

## One change, from start to finish

A team's product requirements live in another repository. An engineer creates an OpenSpec change for the iOS checkout flow with their existing workflow. The proposal links to the requirements it was planned from.

When the Apply skill starts, it runs its normal `openspec instructions apply --change "<name>" --json` read. Because the project configured lifecycle triggers for Apply, OpenSpec dynamically attaches `lifecycle` (`before` and `completed`) to that response—without any extra CLI call. Projects with no hooks see no `lifecycle` field at all.

After reading the change's context files and before editing anything, the agent offers the `change.apply.before` action (`suggest` mode):

> Before I start, want me to reread the linked requirements and check that they still match this plan?

If the developer accepts, the agent follows the action's instructions in the current session. It reports any conflict between the current requirements and the plan, and the developer decides what to do. If the developer declines, nothing runs.

The skill then works through its tasks as usual. When every task is complete, the agent offers the `change.apply.completed` action:

> Tasks are complete. Want me to review the work for anything worth sending to the product team?

An accepted review drafts feedback in the current session. It does not submit anything or change the upstream requirements.

Custom skills and external orchestrators use the same underlying resolver directly via `openspec lifecycle actions --at <hook> --json`.

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
    - on: change.apply.before
      action: requirements-review
      mode: suggest
    - on: change.apply.completed
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

OpenSpec resolves lifecycle config through **one strict resolver** and exposes it in two ways—eliminating extra CLI calls for the ~90% of projects without hooks while keeping a direct lookup interface for external callers and humans:

### 1. Dynamic delivery in built-in operation reads (`openspec instructions create|apply|archive`)

Each built-in operation's initial `openspec instructions <operation> --json` call returns an optional `lifecycle` field grouped by checkpoint (`before` and `completed`) plus concise dynamic `handling` guidance—**omitted completely when no triggers match**:

```json
"lifecycle": {
  "before": [
    {
      "id": "requirements-review",
      "mode": "suggest",
      "title": "Review requirements against the plan",
      "instructions": "Read the sources linked from this change's planning artifacts. ..."
    }
  ],
  "completed": [
    {
      "id": "upstream-feedback",
      "mode": "suggest",
      "title": "Review implementation feedback",
      "instructions": "Review this change's requirements, implementation decisions, ..."
    }
  ],
  "handling": "..."
}
```

- When `lifecycle:` is absent or has no matching triggers, the field is omitted—zero extra tool calls and near-zero static prompt overhead in globally installed skills.
- When `lifecycle:` is configured but invalid, the operation read includes `lifecycleError` (never silently omitted) so the skill surfaces the error loudly.
- Discovery is separated from invocation: the operation read resolves actions once at startup, and the skill acts at the exact checkpoint moment (ignoring `lifecycle` on per-task refreshes and in read-only `openspec-verify-change`). `openspec list` and `openspec status` never return lifecycle actions.

### 2. Direct lookup for external callers and humans (`openspec lifecycle actions`)

Bare `openspec lifecycle actions` prints a human-readable summary of all configured hooks and triggers so developers can inspect their setup without invoking an agent.

With `--at <hook> --json`, custom skills and external orchestrators query any hook (built-in or `custom.*`) directly. It returns the hook, the resolved `root`, and an ordered list of actions with their instructions inline. On failure, `--json` returns `{ "hook": "...", "status": [...] }` with no `actions` key so an error never looks like an empty match. This shape is illustrative and gets fixed in the second PR:

```json
{
  "hook": "change.apply.before",
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

Built-in hooks follow **`change.<operation>.<checkpoint>`** (`change` = object, `<operation>` = operation being performed, `<checkpoint>` = repeatable checkpoint within that operation, not a one-time state-transition event), keeping them independent of which skill or orchestrator ran while artifact generation stays fluid:

- **Initial built-in checkpoints (5):**
  - `change.create.before` — before creating a new change (`create` covers both `propose` and `new`)
  - `change.apply.before` — once per Apply start or resume, before any code edits (`apply`)
  - `change.apply.completed` — when all tracked tasks are complete (`apply`)
  - `change.archive.before` — once per change before syncing specs & archiving (`archive`, `bulk-archive`)
  - `change.archive.completed` — once per change after its folder has moved to the archive, whether or not spec sync ran (`archive`, `bulk-archive`)
- **Future hooks:** additional `change.*` checkpoints are left undecided until real usage drives them. Verify and review remain optional actions/checks, not mandatory stages.
- **Custom hooks:** start with `custom.` followed by dot-separated kebab-case segments, such as `custom.security-review.completed` (empty or malformed names like `custom.` or `custom..foo` are rejected).
- **Unknown names:** any other name (such as a typo like `change.aply.before` or an unwired built-in hook) is rejected.

A hook is only a name that a caller invokes. There is no registration step and no event declaration.

## Who invokes checkpoints, and when

Built-in skills receive their operation's actions once via their initial `openspec instructions <operation> --json` read (which already handles `--store <id>`), while custom skills and external orchestrators query `openspec lifecycle actions --at <hook> [--store <id>] --json` directly. Hooks are **repeatable checkpoints** invoked per operation run and can run more than once (for example, when Apply resumes or re-runs), so actions should be safe to repeat.

- **`change.create.before`:** delivered by `openspec instructions create --json` in `openspec-propose` and `openspec-new-change`, handled before scaffolding or drafting a new change (`create` covers both entry points).
- **`change.apply.before`:** delivered by the initial `openspec instructions apply --json` read in `openspec-apply-change`, handled once per Apply start or resume when ready to implement (after reading context files and before any edits). Skipped when `state` is `blocked` or `all_done`, and ignored by `openspec-verify-change`.
- **`change.apply.completed`:** delivered by the same initial `openspec instructions apply --json` read in `openspec-apply-change`, handled only when `state` is `all_done`—at Step 3 if the change was already complete (reading `contextFiles` before running an accepted or `auto` action, since Step 3 precedes Step 4) or at Step 7 after tasks finish (never mid-loop during Step 6 instruction refreshes). Custom schemas without tracked tasks never reach `all_done`, so `change.apply.completed` does not fire there.
- **`change.archive.before` / `change.archive.completed`:** delivered by the existing per-change `openspec instructions archive --json` read in `openspec-archive-change` and `openspec-bulk-archive-change`, handled once per change—`change.archive.before` before syncing specs & moving the change, and `change.archive.completed` after the change folder moves to the archive (whether or not spec sync ran).
- **Blocked changes:** a `blocked` change does not reach `change.apply.before` or `change.apply.completed`.
- **Config errors & CLI/skill version skew:** older CLIs simply omit `lifecycle` from `instructions apply` / `instructions archive` (and `instructions create` falls back gracefully if unsupported), so newer global skills continue cleanly with zero `unknown command` failures. When `lifecycleError` is present on an operation read, before-hooks (`change.create.before`, `change.apply.before`, `change.archive.before`) report the error and stop before mutating files, while completed-hooks (`change.apply.completed`, `change.archive.completed`) report the error and finish normally. Projects with older installed skills must run `openspec update` before hooks will fire.
- **Action behavior:** what an action does—including whether it pauses for developer input—belongs in the action's own `instructions`, not in the skill.
- **Task-loop refreshes, `list`, and `status`:** Apply ignores `lifecycle` during Step 6 task-loop refreshes so offers never repeat; `openspec list` and `openspec status` never return lifecycle actions.
- **Wrappers:** if a custom skill delegates to a built-in skill, one of them handles the checkpoint.

Hooks are **skill- and orchestrator-invoked only**. Deprecated direct CLI commands such as `openspec archive` fire no hooks. OpenSpec cannot observe an agent that never calls the interface.

## Where things go in `openspec/config.yaml`

| Config key | Purpose |
| --- | --- |
| `context` | Project background facts injected into instructions |
| `rules.<artifact>` | How to write or format a specific planning artifact |
| `operations.*.guidance` | Ongoing advice while doing an operation (`apply`, `archive`) |
| `lifecycle` | Discrete named jobs triggered at specific change checkpoints |

**Rule of thumb:** guidance shapes how the agent works throughout an operation; a lifecycle action is a discrete job done at one checkpoint (with `suggest` / `auto` mode, usable by built-in skills and external callers alike).

## Recipes the pilot proves

The pilot leads with **agent-native recipes** where an LLM adds real judgment, with no special handling inside OpenSpec:

**Recipe A: review requirements against the plan (`change.apply.before`).** This is `requirements-review` above. The agent rereads the sources linked from the change and compares what they say now with the accepted plan.

**Recipe B: draft upstream feedback (`change.apply.completed`).** This is `upstream-feedback` above. Once tasks complete, the agent summarizes decisions and verification evidence worth sharing back with the requirements owners.

**Secondary note — invoking a team script:** Until native `command:` execution exists, an action's instructions can also ask the agent to run a script the team maintains (such as a Git drift script) and report its output:

```yaml
lifecycle:
  actions:
    requirements-drift:
      title: Check requirements for changes
      description: Run the team's drift script and report the result.
      instructions: |
        Run scripts/check-requirements-drift.sh and report its output.

  triggers:
    - on: change.apply.before
      action: requirements-drift
      mode: auto
```

The script owns its own baseline and comparison logic. OpenSpec knows nothing about Git, revisions, or sources. Because the agent runs the script, the agent's own permission prompts apply.

Actions do not invoke one another. Action B reports what the script found and stops there. A project that wants both lists two triggers on `change.apply.before`, with the drift script first, and the agent handles them in that order.

### What a review can and cannot claim

Action A compares the **current** source with the **current** plan. It can report that they conflict. It cannot report what changed since planning, because that needs a recorded earlier version.

A team that wants "changed since planning" supplies that history itself, as Action B's script does. An agent that cannot read a source says so and never counts it as checked.

### Acting on a finding

When a review finds a conflict, the developer chooses what happens next. They can keep the plan, ask upstream for clarification, or revise the plan through the existing `openspec-update-change` skill, which confirms before it edits. The review should call out completed tasks that may need another look.

Nothing is edited silently. A conflict with the source does not prove the implementation is wrong.

## What proves it works

Run one fixture project through the built-in Apply skill and through a custom caller:

- A project with no actions keeps its existing behavior and makes zero extra CLI calls.
- A `suggest` action is offered, and both accepting and skipping work in the current session.
- An `auto` action is followed without an extra prompt.
- Two actions on one hook are handled in configuration order.
- `change.apply.before` fires once per start/resume before edits, is skipped on `blocked` and `all_done`, and is ignored by `openspec-verify-change`.
- `change.apply.completed` fires on `all_done` (Step 3 reading `contextFiles` first, or Step 7—never mid-loop) and never on `blocked`.
- `change.create.before` runs before creating a change (`propose`, `new`), and `change.archive.before` / `change.archive.completed` run once per change in `archive` and `bulk-archive`.
- Task-loop instruction refreshes repeat no offers.
- A trigger that sets `policy`, uses an unknown key, or duplicates an `(on, action)` pair fails validation in `openspec lifecycle actions` and `openspec validate --all`, while unrelated commands (`status`, `list`, `validate --specs`, `archive`) still work.
- Putting `lifecycle:` inside a pointer-only repo config (`store: <id>`) fails loudly instead of being silently ignored.
- A `custom.` hook works from a custom caller, and malformed or mistyped names such as `custom.` or `change.aply.before` are rejected.
- Actions A and B both run through `change.apply.before` with no OpenSpec code specific to either.
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
