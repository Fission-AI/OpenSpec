# Lifecycle guide (draft)

*Have your agent offer a review, or run a check, at set points in your OpenSpec workflow.*

> **Draft guide:** This describes a proposed experience. The command and configuration below are not available today. See the [pilot proposal](pilot-proposal.md) for the design and the [roadmap](../direction/roadmap.md) for the delivery plan.

Your team agrees on checkout requirements in another repository. You create an OpenSpec change and start building. A week later, someone updates the requirements.

You can tell your agent to reread those requirements every time it starts implementing. Lifecycle actions make that a project setting, so every engineer and every agent on the project does the same thing at the same moment.

## 1. Write an action

Add an action under `lifecycle:` in `openspec/config.yaml`. An action is a name plus instructions for your agent (`title` and `description` are optional):

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
```

The instructions are yours. OpenSpec does not interpret them. Your agent follows them with the tools and access it already has.

## 2. Choose when it happens

Add a trigger under `lifecycle:` that attaches the action to a point in the workflow:

```yaml
lifecycle:
  triggers:
    - on: change.before-apply
      action: requirements-review
      mode: suggest
```

`on` names the checkpoint, which this guide calls a hook. Hooks are repeatable checkpoints in a change's lifecycle. The first hooks are:

| Hook | When it happens |
| --- | --- |
| `change.before-apply` | The Apply skill is about to start or resume, before any edits |
| `change.applied` | The Apply skill has finished every tracked task |

`mode` says how your agent handles the action:

| Mode | What your agent does |
| --- | --- |
| `suggest` | Offers the action and follows it only if you accept |
| `auto` | Follows the instructions without asking first |

`auto` does not bypass your agent's permissions. If the instructions run a command your agent normally asks about, it still asks.

A trigger is also planned to take a `policy`, which says whether an action's outcome warns or blocks. Policy is separate from mode and is not supported yet. A trigger that sets `policy` fails validation as unsupported.

One action can have several triggers, and one hook can have several actions. Your agent handles them in the order you list them.

## 3. See it during Apply

Start implementing a change with the Apply skill (`openspec-apply-change`). Before it edits anything, your agent offers the review:

> Before I start, want me to reread the linked requirements and check that they still match this plan?

- **Accept**, and your agent follows the instructions and reports what it found.
- **Skip**, and nothing runs. Your agent carries on with the tasks.

A project with no triggers sees no change.

## 4. Act on what the review finds

A review of the checkout requirements might report:

> The requirements now set the quote timeout to 60 seconds. This plan uses 30 seconds in the design and in task 2.3, which is already complete. I could not open the linked pricing page.

You decide what happens next:

1. **Keep the plan.** The difference may not apply to your slice.
2. **Revise the plan.** Use the Update skill (`openspec-update-change`), which confirms before it edits.
3. **Ask the owners.** The source may be a proposal, not an agreed requirement.

The review compares the requirements as they are now with your plan as it is now. It can tell you they conflict. It cannot tell you what changed since you planned, because nothing recorded the earlier version.

A conflict does not mean the implementation is wrong. A source your agent could not read is reported as unread, never as checked.

## 5. Offer a review when the work is done

Some reviews make sense after implementation. This one drafts feedback for the team that owns the requirements:

```yaml
lifecycle:
  actions:
    upstream-feedback:
      title: Review implementation feedback
      description: Find decisions or evidence worth sharing upstream.
      instructions: |
        Review this change's requirements, implementation decisions,
        and verification evidence. Draft feedback with source references
        and mark uncertainty. Do not submit feedback or change upstream
        requirements without separate approval.

  triggers:
    - on: change.applied
      action: upstream-feedback
      mode: suggest
```

When the tasks are complete, your agent offers it:

> Tasks are complete. Want me to review the work for anything worth sending to the product team?

An accepted review produces a draft for you to read. Sending it anywhere is a separate step that you approve.

## 6. Run your own script

An action can tell your agent to run a script your team maintains. This one checks whether the requirements file changed in Git:

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

The script decides what to compare and where it keeps its starting point. OpenSpec does not track sources, revisions, or Git history.

This is how a team gets "changed since planning". The script holds the earlier version, which the review in step 4 does not have.

Actions do not call one another. To run the script and then offer the review from step 1, list both triggers on `change.before-apply` with the script first.

## 7. Use hooks from your own skills

A custom skill or another tool can ask the same question the built-in skills ask:

```bash
openspec lifecycle actions --at change.before-apply --json
```

Pass `--store <id>` if your work lives in a registered Store. The command returns the resolved root and the actions for that hook, in order, with their instructions. It runs nothing.

You can also invoke hooks of your own. Start the name with `custom.`, such as `custom.security-review.completed`, and attach triggers to it the same way. Any other name must be one OpenSpec defines, so a typo like `change.before-aply` is rejected.

## How this differs from operation guidance

`openspec/config.yaml` also supports `operations.apply.guidance`. **Guidance shapes how your agent works throughout an operation; an action is a discrete job done at one moment.**

Use guidance for standing advice such as "run focused tests before the full suite". Use an action for a named step at a specific moment that your agent can offer and you can skip.

## Limits

- **Hooks fire only when a skill asks.** Running `openspec archive` yourself in a terminal fires none, and projects with older installed skills must update their skills before hooks will fire.
- **Your agent carries out actions, not OpenSpec.** An agent that does not follow the skill will not run them.
- **No enforced blocking.** OpenSpec cannot stop Apply or Archive. Your agent can still pause based on what an action finds.
- **Actions can run more than once.** OpenSpec does not remember whether you accepted or skipped a hook before. Because `change.before-apply` also runs when resuming an in-progress change, write actions that are safe to repeat, prefer `mode: suggest` for heavier reviews, and keep `mode: auto` for fast, repeatable checks.
- **Custom schemas without task tracking:** `change.applied` only fires on schemas that track task completion.

## Not part of this proposal

Scripts that OpenSpec runs itself, policies that warn or block, and plugins that share actions across repositories are separate decisions.

A general way for a change to reference the documents and tools it depends on is also being explored separately. The examples here use ordinary Markdown links for now.

The [roadmap](../direction/roadmap.md) lists all of these.
