# Lifecycle hooks roadmap

**Status:** Proposed delivery plan, revised November 2026. Nothing here is implemented. No dates committed.

This plan replaces the earlier Git-first pilot sequence. The [pilot proposal](../lifecycle/pilot-proposal.md) has the design, and the [guide draft](../lifecycle/guide-draft.md) shows the experience from the user's side.

## The principle

OpenSpec resolves which actions are configured for a hook. The calling agent or orchestrator handles them.

OpenSpec owns the hook names and action discovery. Users define what actions do. The caller executes them with the context, tools, and permissions it already has.

## The model

- **Hook:** a named moment in a change's lifecycle, such as `change.before-apply` or `change.applied`.
- **Action:** named instructions for an agent.
- **Trigger:** config that attaches an action (`action:`) to a hook (`on:`) and sets its `mode:`.

Actions and triggers are the core abstraction. Nothing happens in a project with no configured triggers. Hooks fire per invocation and can run more than once (for example, when Apply resumes or re-runs), so actions should be safe to repeat.

### Mode and policy

Mode and policy are separate settings, and neither implies the other.

- **Mode** says whether an action is followed without asking or offered first. Its values are `auto` and `suggest`.
- **Policy** says how an action's outcome affects the workflow. Its values are `warn` and `block`.

The pilot supports mode only. Policy needs OpenSpec to see an action's outcome, and the pilot collects no results and enforces nothing. Policy stays in the longer-term model.

Until policy is supported, a trigger that sets `policy` fails validation as unsupported. It is never silently accepted.

In the pilot, the two modes mean:

- **`suggest`:** the agent offers the action and follows it only if the developer accepts.
- **`auto`:** the agent follows the instructions without an extra prompt for that action.

`auto` does not guarantee execution and does not bypass the agent's existing permissions.

## How this differs from operation guidance

`openspec/config.yaml` already supports `operations.apply.guidance` and `operations.archive.guidance`. **Guidance shapes how the agent works throughout an operation; an action is a discrete job done at one moment.** Lifecycle hooks also differ in three practical ways:

1. A hook can be invoked without an active change or an OpenSpec operation in progress (`custom.*`).
2. A hook returns named, discrete actions that a caller can handle one at a time.
3. Each trigger carries a `mode` (`suggest` or `auto`).

A custom skill or external orchestrator can use hooks without adopting the built-in workflows.

## The interface

A caller asks which actions apply at a hook:

```bash
openspec lifecycle actions --at change.before-apply --json
```

Pass `--store <id>` to target a registered Store, matching OpenSpec's other root-aware commands.

The response is the contract between OpenSpec and every caller, so it stays small. It returns the hook, the resolved root, and an ordered list of actions, with each action's instructions inline. On failure, `--json` returns `{ "hook": "...", "status": [...] }` with no `actions` field so an error never looks like an empty match. This shape is illustrative and gets fixed in PR 2:

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
      "instructions": "..."
    }
  ]
}
```

Order follows the trigger configuration, and callers preserve it. There is no separate instruction lookup and no result or findings schema. The command is read-only.

### Hook names

Built-in hooks follow the **`change.<event>`** object lifecycle so they stay independent of which skill a user ran (`propose`, `new` + `continue`, `ff`, or an external orchestrator), while keeping individual artifact generation fluid:

- **Pilot hooks (wired first):** `change.before-apply` and `change.applied`.
- **Planned lifecycle family (future, decided separately):** `change.before-create`, `change.ready` (all apply-required artifacts done), `change.before-archive`, and `change.archived`. Verify and review remain optional checks/actions attached to these moments (or run on demand), not stages.
- **Custom hooks:** users can invoke their own hooks starting with `custom.` followed by dot-separated kebab-case segments, such as `custom.security-review.completed` (names like `custom.` or `custom..foo` are rejected).
- **Unknown names:** any other name (including typos such as `change.before-aply` or unwired built-in hooks) is rejected.

A hook is only a name that a caller invokes. There is no registration step and no event declaration.

### Where config comes from

Actions and triggers live under `lifecycle:` in `openspec/config.yaml`. Lifecycle parsing uses a dedicated strict reader (`readLifecycleConfig()`) used by `openspec lifecycle actions` and full-project `openspec validate --all` (never by `--specs` or single-item validation, so a lifecycle typo never blocks archiving specs). `readProjectConfig()` stays forgiving so unrelated commands (`status`, `list`, `archive`) keep working.

Lookup reuses OpenSpec's existing root and config resolution, including Stores (`--store <id>`). Because hooks belong to the `change` object, the resolved root where changes live owns `lifecycle:`—when a Store is the resolved root, the Store's configuration decides which actions are returned (no repo-plus-store merging; putting `lifecycle:` in a pointer-only repo config that delegates to `store: <id>` fails loudly instead of being silently ignored). Shared store-selection guidance is updated so built-in skills forward `--store <id>` to `openspec lifecycle`.

## PR sequence

Each PR adds one verifiable behavior. Not every PR needs to deliver user value alone. All of them reuse one fixture project.

1. **Lifecycle config under `lifecycle:`.** Parse and strictly validate `lifecycle.actions` and `lifecycle.triggers` via a dedicated reader, wired into `openspec validate --all` (not `--specs` / single-item validation) while keeping `readProjectConfig()` forgiving for unrelated commands. Require non-empty `instructions` on actions (`title` defaults to the action id; `description` is optional) and require `on`, `action`, and `mode` on triggers. Enforce kebab-case action ids, valid `custom.<segment>` hook names, and strict unknown-key rejection (with a tailored unsupported error for `policy`). Reject duplicate action ids, duplicate `(on, action)` triggers, triggers referencing a missing action, unsupported modes, invalid hook names, and `lifecycle:` inside a pointer-only repo config (`store: <id>`). A project with no `lifecycle:` block behaves as it does today.
2. **`openspec lifecycle actions --at <hook>`.** Return resolved `root` and matching actions in order with instructions inline, supporting `--store <id>` and `--json` (errors return `{ hook, status }` with no `actions` key). Cover one match, several matches, no match, invalid config, a `custom.` hook, a rejected mistyped name, a pointer-only repo error, and a Store as the resolved root.
3. **Apply calls `change.applied`.** The Apply skill asks for actions when its state is `all_done`—at Step 3 if already complete or at Step 7 after tasks finish (never mid-loop during Step 6 refreshes)—forwarding `--store <id>` when a Store is selected. `suggest` actions can be accepted or skipped in the current session. A `blocked` change does not reach this hook; custom schemas without task tracking never reach `all_done`. If the CLI is older and lacks `lifecycle` (non-JSON error), skip hooks and continue; on a structured JSON config error at `change.applied`, report the error and finish normally.
4. **Apply calls `change.before-apply`.** The Apply skill asks for actions once when it is ready to implement (after reading context files and before any edits), skipping `change.before-apply` when state is `blocked` or `all_done`. On a structured JSON config error, report it and stop before editing; if an older CLI lacks `lifecycle`, skip hooks and continue. Verify both hooks in one run with different actions on each.

   **Release checkpoint A.** Run the full path from CLI to Apply to an offered, accepted, and skipped action. Run a custom caller against a `custom.` hook. Confirm a project with no config is unchanged.

5. **Two user-defined actions, end to end.** Ship both as tested, documented recipes:
   - **Action A:** the agent rereads the requirements linked from the change and compares them with the current plan.
   - **Action B:** the agent runs a project-provided Git drift script and reports what it prints. The script owns its own baseline and comparison logic.

   Actions do not invoke one another. Each is attached to a hook by its own trigger.

   Neither action needs special handling inside OpenSpec. When a review finds a conflict, the developer keeps the plan or revises it through the existing `openspec-update-change` skill.

   **Release checkpoint B.** Run plan, review, approved update, Apply, and optional feedback as one journey. Include an unreachable source and a custom schema.

## How each PR is verified

- PRs 1 and 2 use unit and integration tests for config and the CLI.
- PRs 3 to 5 depend on agent behavior. The evidence is a recorded end-to-end run on the shared fixture.
- Both release checkpoints test the built-in skills and a custom caller.

## What we are not building

- Built-in drift detection. Detecting and managing drift remains a goal, and the pilot serves it through user-defined actions.
- Source-version tracking in core, or a `sources:` or `references:` schema.
- A native runtime for executable actions.
- Policy enforcement, result collection, or blocking.
- Inputs passed from OpenSpec into actions, or a formal execution context.
- Persistent action state, background jobs, or observers.
- Plugin packaging, installation, or profiles.

Running `openspec archive` by hand fires no hooks, because hooks fire only when a skill or caller asks for them.

## Decide separately

- **Executable actions.** Running a team's check natively needs a trust model (including what happens when the script changes), timeouts, a result contract, and authorization. This is not a dependency of the sequence above.
- **Policy.** `warn` and `block` depend on native execution and result collection. In the pilot, setting `policy` in config is a hard validation error.
- **More `change.*` hooks (`change.before-create`, `change.ready`, `change.before-archive`, `change.archived`).** Decide which additional object-lifecycle moments to wire after Checkpoint B.
- **Plugins and shared profiles.** Named actions are the unit a plugin would ship. Revisit once the action shape has held up through checkpoint B.
- **Agent orchestration.** Launching agents, tracking an action across sessions, and chaining actions remain future work.

## Keep separate

### Drift detection

The enterprise need is detecting and managing drift between a change and the information it was planned from. Git is one way to do that, not the requirement itself. The pilot's two example actions both serve it through the same hook, with no drift-specific support in OpenSpec.

### Generalized references

Generalized references are a separate exploration. We want a provider-agnostic way for a change to reference the information it depends on. That could include local Markdown files, documents in other repositories, Git-hosted documents, tools such as Linear, Jira, and Notion, and user-defined reference types.

Nothing about it is decided. That includes the name, the schema, and whether it needs integrations, resolvers, or structured metadata, or can start with the tools agents already have. `references` is a possible name, but project-level `references` in `openspec/config.yaml` already means something else.

For now no `sources:` or `references:` schema is introduced. The pilot examples use ordinary Markdown links, which is a starting point and not the permanent answer. Lifecycle hooks do not depend on references, and references do not depend on lifecycle hooks.

### External contracts

External-contract generation and verification remain [broader exploration](external-context-for-changes.md). They are not delivered by lifecycle hooks.

## Superseded

The November 5 plan started with a built-in Git source-drift check, a `sources` list in each change's `.openspec.yaml`, and the command `openspec lifecycle check`. That sequence is replaced by this one. The actions and triggers model carries over.
