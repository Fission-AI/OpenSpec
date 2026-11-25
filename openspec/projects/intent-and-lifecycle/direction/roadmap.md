# Lifecycle hooks roadmap

**Status:** Proposed delivery plan, revised November 2026. Nothing here is implemented. No dates committed.

This plan replaces the earlier Git-first pilot sequence. The [pilot proposal](../lifecycle/pilot-proposal.md) has the design, and the [guide draft](../lifecycle/guide-draft.md) shows the experience from the user's side.

## The principle

OpenSpec resolves which actions are configured for a hook. The calling agent or orchestrator handles them.

OpenSpec owns the hook names and action discovery. Users define what actions do. The caller executes them with the context, tools, and permissions it already has.

## The model

- **Hook:** a named, repeatable checkpoint in a change's lifecycle, such as `change.apply.before` or `change.apply.completed`.
- **Action:** named instructions for an agent.
- **Trigger:** config that attaches an action (`action:`) to a hook (`on:`) and sets its `mode:`.

Actions and triggers are the core abstraction. Nothing happens in a project with no configured triggers. Hooks are repeatable checkpoints, not one-time state-transition events: they fire per invocation and can run more than once (for example, when Apply resumes or re-runs), so actions should be safe to repeat.

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

## Where things go in `openspec/config.yaml`

| Config key | Purpose |
| --- | --- |
| `context` | Project background facts injected into instructions |
| `rules.<artifact>` | How to write or format a specific planning artifact |
| `operations.*.guidance` | Ongoing advice while doing an operation (`apply`, `archive`) |
| `lifecycle` | Discrete named jobs triggered at specific change checkpoints |

**Rule of thumb:** guidance shapes how the agent works throughout an operation; a lifecycle action is a discrete job done at one checkpoint (with `suggest` / `auto` mode, usable by built-in skills and external callers alike).

## The interface

Lifecycle uses **one strict resolver** exposed through **two entry points**—so built-in skills incur zero lookup tax for the 90% of projects without hooks, while custom callers and humans have a direct lookup command:

### 1. Dynamic delivery for built-in skills (`openspec instructions <operation>`)

Built-in skills do **not** make extra `openspec lifecycle actions` calls at each checkpoint. Instead, each operation's initial instruction read (`openspec instructions create --json`, `openspec instructions apply --json`, `openspec instructions archive --json`) dynamically attaches an optional `lifecycle` field **only when matching triggers are configured** (omitted completely when none exist, just like `operationGuidance`):

```json
"lifecycle": {
  "before": [
    {
      "id": "requirements-review",
      "mode": "suggest",
      "title": "Review requirements against the plan",
      "instructions": "..."
    }
  ],
  "completed": [
    {
      "id": "upstream-feedback",
      "mode": "suggest",
      "title": "Review implementation feedback",
      "instructions": "..."
    }
  ],
  "handling": "..."
}
```

- When no triggers match, `lifecycle` is omitted—so unconfigured projects make **zero extra CLI calls** and pay almost zero prompt tokens (static skills only carry a short conditional line; handling instructions arrive dynamically with `lifecycle`).
- When `lifecycle:` is configured but invalid, the operation read returns a `lifecycleError` field instead of silently omitting `lifecycle`, so `before` checkpoints stop and surface the error while `completed` checkpoints report it and finish.
- Discovery happens once at operation start; the skill controls **when** each checkpoint runs (e.g., `apply` acts on `before` once on start/resume and ignores `lifecycle` on per-task refreshes; `verify` ignores Apply's `lifecycle`). `openspec list` and `openspec status` stay completely lifecycle-free.

### 2. Direct lookup for external callers and humans (`openspec lifecycle actions`)

Humans can inspect all configured hooks and triggers with:

```bash
openspec lifecycle actions
```

A custom skill or external orchestrator queries any hook (built-in or `custom.*`) directly:

```bash
openspec lifecycle actions --at change.apply.before --json
```

Pass `--store <id>` to target a registered Store, matching OpenSpec's other root-aware commands.

The direct lookup response stays small: it returns the hook, the resolved root, and an ordered list of actions with each action's instructions inline. On failure, `--json` returns `{ "hook": "...", "status": [...] }` with no `actions` field so an error never looks like an empty match. This shape is illustrative and gets fixed in PR 2:

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
      "instructions": "..."
    }
  ]
}
```

Order follows the trigger configuration, and callers preserve it. There is no result or findings schema. Both entry points are read-only.

### Hook names

Built-in hooks follow **`change.<operation>.<checkpoint>`** (`change` = object, `<operation>` = operation being performed, `<checkpoint>` = repeatable checkpoint within that operation)—independent of which skill or orchestrator ran—while keeping artifact generation fluid:

- **Initial built-in checkpoints (5):**
  - `change.create.before` — before creating a new change (`create` covers both `propose` and `new`)
  - `change.apply.before` — once per Apply start or resume, before any code edits (`apply`)
  - `change.apply.completed` — when all tracked tasks are complete (`apply`)
  - `change.archive.before` — once per change before syncing specs & archiving (`archive`, `bulk-archive`)
  - `change.archive.completed` — once per change after its folder has moved to the archive, whether or not spec sync ran (`archive`, `bulk-archive`)
- **Future hooks:** additional `change.*` checkpoints (such as a post-planning checkpoint) are left undecided until real usage shows what is needed. Verify and review remain optional checks/actions attached to checkpoints (or run on demand), not mandatory stages.
- **Custom hooks:** users can invoke their own hooks starting with `custom.` followed by dot-separated kebab-case segments, such as `custom.security-review.completed` (names like `custom.` or `custom..foo` are rejected).
- **Unknown names:** any other name (including typos such as `change.aply.before` or unwired built-in hooks) is rejected.

A hook is only a name that a caller invokes. There is no registration step and no event declaration.

### Where config comes from

Actions and triggers live under `lifecycle:` in `openspec/config.yaml`. Lifecycle parsing uses a dedicated strict reader (`readLifecycleConfig()`) used by `openspec lifecycle actions` and full-project `openspec validate --all` (never by `--specs` or single-item validation, so a lifecycle typo never blocks archiving specs). `readProjectConfig()` stays forgiving so unrelated commands (`status`, `list`, `archive`) keep working.

For v1, lookup reuses OpenSpec's existing root and config resolution, including Stores (`--store <id>`), with no repo-plus-store merging: when a Store is the resolved root, the Store's configuration decides which actions are returned, and putting `lifecycle:` in a pointer-only repo config (`store: <id>`) fails loudly instead of being silently ignored. Whether code repositories sharing a Store should later support repo-local hooks is left open. Shared store-selection guidance is updated so built-in skills forward `--store <id>` to `openspec lifecycle`.

## PR sequence

Each PR adds one verifiable behavior. Not every PR needs to deliver user value alone. All of them reuse one fixture project.

1. **Lifecycle config under `lifecycle:`.** Parse and strictly validate `lifecycle.actions` and `lifecycle.triggers` via a dedicated reader, wired into `openspec validate --all` (not `--specs` / single-item validation) while keeping `readProjectConfig()` forgiving for unrelated commands. Require non-empty `instructions` on actions (`title` defaults to the action id; `description` is optional) and require `on`, `action`, and `mode` on triggers. Enforce kebab-case action ids, valid `custom.<segment>` hook names, and strict unknown-key rejection (with a tailored unsupported error for `policy`). Reject duplicate action ids, duplicate `(on, action)` triggers, triggers referencing a missing action, unsupported modes, invalid hook names, and `lifecycle:` inside a pointer-only repo config (`store: <id>`). A project with no `lifecycle:` block behaves as it does today.
2. **CLI lookup & dynamic operation delivery (`lifecycle actions` + `instructions create|apply|archive`).** Add `openspec lifecycle actions [--at <hook>] [--store <id>] [--json]` (bare command lists all configured hooks for humans; `--at <hook>` returns resolved `root` + matching actions, or `{ hook, status }` with no `actions` on error). Add `openspec instructions create --json` (returning `root`, `context`, and optional `lifecycle.before`) and attach optional `lifecycle` / `lifecycleError` payloads to `openspec instructions apply` and `openspec instructions archive` using the same strict resolver—omitted when no triggers match so unconfigured projects pay zero overhead.
3. **Apply skill hooks (`change.apply.before` + `change.apply.completed`).** Update `openspec-apply-change` to act on `lifecycle` returned by its initial `openspec instructions apply` call (zero extra CLI calls): run `before` once per Apply start or resume after reading context files and before any edits (skipped on `blocked` and `all_done`), and run `completed` only when state is `all_done` (at Step 3 if already complete—reading `contextFiles` first—or at Step 7 after tasks finish, never on Step 6 refreshes). Keep `openspec-verify-change` ignoring `lifecycle`. Older CLIs simply omit `lifecycle`; on `lifecycleError`, stop before edits (`before`) or report and finish (`completed`).
4. **Create & Archive skill hooks (`change.create.before`, `change.archive.before`, `change.archive.completed`).** Update `openspec-propose` and `openspec-new-change` to use `openspec instructions create --json` (replacing Propose's manual `config.yaml` read and New's root guard) and act on `lifecycle.before` before creating the change. Update `openspec-archive-change` and `openspec-bulk-archive-change` to act on `lifecycle.before` and `lifecycle.completed` returned by their existing per-change `openspec instructions archive --json` read (firing `change.archive.completed` once per change after its folder moves to archive, even if spec sync was skipped or absent). Hooks are skill/orchestrator-invoked only (raw `openspec archive` is being deprecated and fires no hooks).

   **Release checkpoint A.** Run the full lifecycle (Create → Apply → Archive) with offered, accepted, and skipped actions. Run a custom caller against a `custom.` hook. Confirm a project with no config is unchanged and makes the exact same number of CLI calls as before.

5. **Agent-native recipes (plus team-script note), end to end.** Lead with tested, documented agent-native recipes where LLMs add real judgment:
   - **Recipe A (`change.apply.before`):** reread requirements linked from the change and compare them with the current plan.
   - **Recipe B (`change.apply.completed`):** review implementation decisions and verification evidence to draft upstream feedback.
   - **Secondary note (team scripts):** document briefly that an action's instructions can also ask the agent to run a project-maintained script (such as a Git drift script) as a stopgap until native `command:` execution lands.

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
- **Additional `change.*` hooks.** Leave further built-in checkpoints undecided until pilot usage shows which ones teams actually need.
- **Repo-local hooks with a shared Store.** v1 resolves `lifecycle:` from the Store root only; revisit repo-specific overrides later if multi-repo Store teams need them.
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
