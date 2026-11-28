# Lifecycle actions

> Have your agent offer a review, or run a check, at set points in a change.

A lifecycle action is a named set of instructions in `openspec/config.yaml`. You attach it to a point in the workflow, such as the moment before Apply starts editing code, and your agent offers it or follows it there.

New to the workflow? Start with the [Quickstart](../start/quickstart.md).

## Add an action

**1. Add the action and its trigger to `openspec/config.yaml`.**

```yaml
# openspec/config.yaml
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

  triggers:
    - on: change.apply.before
      action: requirements-review
      mode: suggest
```

The action under `actions` is a name plus the instructions your agent follows. The trigger under `triggers` attaches it to a [hook](#hooks) with a [mode](#modes). OpenSpec doesn't interpret the instructions. Your agent follows them with the tools and access it already has.

**2. Check the config.**

```bash
# In your terminal
openspec lifecycle actions
```

```text
Lifecycle actions (/Users/you/projects/my-app)

change.apply.before
  1. requirements-review (suggest): Review requirements against the plan
     Reread linked requirements and compare them with this change.

Show one hook with its instructions: openspec lifecycle actions --at <hook>
```

A mistake in `lifecycle:` makes this command exit 1 and name each problem. `openspec validate --all` reports the same problems on a `config/lifecycle` line.

**3. Update your installed skills.**

```bash
# In your terminal
openspec update
```

Skills installed before lifecycle actions existed never read them.

**4. Start Apply.**

Ask your agent to apply the change. Before it edits anything, your agent offers the review, for example:

```text
Before I start: want me to review requirements against the plan?
```

Accept, and your agent follows the instructions and reports what it found. Skip, and your agent carries on with the tasks.

## Hooks

A hook is a named point in a change's workflow. OpenSpec's skills invoke five built-in hooks:

| Hook | When it runs | Skills |
| --- | --- | --- |
| `change.create.before` | Before creating a new change | [`openspec-propose`](../reference/skills.md#openspec-propose), [`openspec-new-change`](../reference/skills.md#openspec-new-change) |
| `change.apply.before` | Once per Apply start or resume, before any code edits | [`openspec-apply-change`](../reference/skills.md#openspec-apply-change) |
| `change.apply.completed` | When Apply finishes implementing (tracked tasks reach `all_done`, or freeform implementation finishes without pausing) | [`openspec-apply-change`](../reference/skills.md#openspec-apply-change) |
| `change.archive.before` | Once per change, before syncing specs and archiving | [`openspec-archive-change`](../reference/skills.md#openspec-archive-change), [`openspec-bulk-archive-change`](../reference/skills.md#openspec-bulk-archive-change) |
| `change.archive.completed` | Once per change, after its folder moves to the archive, whether or not specs were synced | [`openspec-archive-change`](../reference/skills.md#openspec-archive-change), [`openspec-bulk-archive-change`](../reference/skills.md#openspec-bulk-archive-change) |

One hook can have several triggers, and one action can be attached to several hooks. Your agent handles a hook's actions in the order you list the triggers.

A hook name starting with `custom.`, such as `custom.security-review.completed`, is yours to invoke from your own skills. Any other name must be a built-in hook, so a typo like `change.aply.before` fails validation.

## Modes

Each trigger sets a `mode`:

| Mode | What your agent does |
| --- | --- |
| `suggest` | Offers the action by its title and description, waits for your answer before doing anything else, and follows the instructions only if you accept |
| `auto` | Follows the instructions without asking first |

`auto` doesn't bypass your agent's permissions. If the instructions run a command your agent normally asks about, it still asks.

A trigger can't set `policy` yet. A trigger that sets it fails validation as unsupported, so there is no way to make an action block Apply or Archive.

## Recipes

Copy a recipe into `openspec/config.yaml` and edit the instructions to fit your project. Each one validates as written.

### Review linked requirements before Apply

The action from [Add an action](#add-an-action) rereads the sources your planning artifacts link to, such as a requirements doc in another repo, and compares them with the plan before any code changes.

A review might report:

```text
The requirements now set the quote timeout to 60 seconds. This plan uses
30 seconds in design.md and in task 2.3, which is already complete.
I could not open the linked pricing page.
```

What the review can and can't tell you:

- **It compares the source as it is now with the plan as it is now.** It can tell you they conflict. It can't tell you what changed since you planned, because nothing recorded the earlier version.
- **A conflict doesn't mean the implementation is wrong.** The source may be a proposal, not an agreed requirement.
- **An unreadable source is reported as unread.** It is never reported as checked.

The instructions tell your agent not to edit anything. To act on a finding, keep the plan as it is, or ask your agent to update the change ([`openspec-update-change`](../reference/skills.md#openspec-update-change)), which confirms before it edits.

### Draft upstream feedback after Apply

This action offers to draft feedback for the team that owns the requirements once every task is done:

```yaml
lifecycle:
  actions:
    upstream-feedback:
      title: Draft upstream feedback
      description: Find decisions or evidence worth sharing upstream.
      instructions: |
        Review this change's requirements, implementation decisions,
        and verification evidence. Draft feedback with source references
        and mark uncertainty. Do not submit feedback or change upstream
        requirements without separate approval.

  triggers:
    - on: change.apply.completed
      action: upstream-feedback
      mode: suggest
```

An accepted review produces a draft for you to read. Sending it anywhere, or changing the upstream requirements, is a separate step you approve.

### Run a team script

OpenSpec doesn't run commands itself yet, and an action can't set `command:`. As a stopgap, an action can ask your agent to run a script your team already maintains:

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

The script decides what to compare and where it keeps its starting point. OpenSpec doesn't track sources, revisions, or Git history. Your agent's normal permissions still apply, so it may ask before running the script.

Actions don't call one another. To run the script and then offer the requirements review, list both triggers on `change.apply.before`, with the script's trigger first.

## Look up a hook from your own skills

Built-in skills receive their actions through the `openspec instructions` read they already make. Custom skills and orchestrators can look up any hook directly:

```bash
# In your terminal
openspec lifecycle actions --at change.apply.before --json
```

```json
{
  "hook": "change.apply.before",
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  },
  "actions": [
    {
      "id": "requirements-review",
      "mode": "suggest",
      "title": "Review requirements against the plan",
      "description": "Reread linked requirements and compare them with this change.",
      "instructions": "Read the sources linked from this change's planning artifacts.\nCompare what they say now with the accepted plan.\nReport conflicts, the work they affect, and anything you could not read.\nDo not edit the plan or the sources."
    }
  ]
}
```

The command returns the actions for that hook in trigger order. It runs nothing. Pass `--store <id>` when the work lives in a [store](../multi-repo/stores.md). The full contract is in the [CLI reference](../reference/cli.md#openspec-lifecycle-actions).

## Lifecycle actions in a store

When a project's changes live in a [store](../multi-repo/stores.md), OpenSpec reads `lifecycle:` from the store's `openspec/config.yaml` only.

A repo whose `openspec/config.yaml` only points at a store (a `store:` line) can't carry its own `lifecycle:` block. If it does, `openspec lifecycle actions` exits 1 and tells you to move the block into the store's config.

## Limits

- **Only skills and orchestrators invoke hooks.** Terminal commands like `openspec archive` fire no hooks.
- **Older installed skills don't invoke hooks.** Run `openspec update` first.
- **Your agent carries out actions, not OpenSpec.** An agent that doesn't follow the skill won't run them.
- **Nothing is enforced.** OpenSpec can't stop Apply or Archive. Your agent can still pause based on what an action finds.
- **Actions can run more than once.** OpenSpec doesn't remember whether you accepted or skipped an action. `change.apply.before` runs again on every resume, so write actions that are safe to repeat and use `suggest` for heavier reviews.

To choose between `lifecycle` and the other config.yaml fields, see [Which field to use](project-config.md#which-field-to-use). Every `lifecycle` field and validation rule is in [Project configuration (config.yaml)](../reference/configuration/config-yaml.md#lifecycle).
