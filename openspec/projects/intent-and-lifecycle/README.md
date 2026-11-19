# OpenSpec Lifecycle Actions

**Status:** Proposed, not implemented. The command, configuration, and changelog text below describe what we plan to build.

**Goal:** Let developers attach their own actions to points in the development workflow, without changing OpenSpec or depending on its built-in skills.

We'll build this incrementally through five small PRs, with two release checkpoints.

## 1. How it works

A project defines **what the agent should do** and **when it should do it**.

```yaml
# openspec/config.yaml
actions:
  requirements-review:
    title: Review requirements
    instructions: |
      Check whether the current requirements
      still agree with the implementation plan.

triggers:
  - on: apply.before
    run: requirements-review
    mode: suggest
```

When Apply starts:

```text
  Apply is about to start
           │
           ▼
  OpenSpec looks up actions
  configured for apply.before
           │
           ▼
  Returns: requirements-review
           │
           ▼
  Agent: "Want me to review the
          requirements first?"
           │
      ┌────┴────┐
      ▼         ▼
     Yes        No
      │         │
      ▼         ▼
   Agent      Continue
   reviews    Apply
```

**OpenSpec discovers the actions. The agent executes them.**

Two modes determine what happens:

- `suggest`: The agent offers the action and runs it if accepted.
- `auto`: The agent follows the instructions without an additional action-specific prompt, subject to its existing permissions.

This also works outside OpenSpec's built-in skills. A custom skill or external orchestrator can invoke the same hook:

```bash
openspec lifecycle actions --at apply.before --json
```

It receives the configured actions and handles them using its own agent, tools, and context.

A caller can also invoke a hook of its own. Custom hook names start with `custom.`, such as `custom.security-review.completed`.

No native execution engine is required.

## 2. How we'll build it

Five independently verifiable PRs, grouped into two release checkpoints.

| PR | What we're building | How we verify it |
|---|---|---|
| **1. Configuration** | Define and validate `actions` and `triggers` | Valid configuration loads. Invalid references, modes, and hook names fail clearly |
| **2. Action lookup** | Add `openspec lifecycle actions --at <hook>` | CLI returns the correct actions, in order, with their instructions |
| **3. After Apply** | Invoke `apply.completed` when tasks finish | Agent offers configured actions. Accepting and skipping both work |
| **4. Before Apply** | Invoke `apply.before` before implementation | Actions are offered before edits and don't interfere with normal Apply |
| **5. Real examples** | Demonstrate two independently defined actions | Both work through the same hook without changes to OpenSpec's core |

Each PR can merge independently once its acceptance tests pass.

We don't need to release or announce every PR.

### Release checkpoint A: Lifecycle actions work end-to-end

*After PRs 1 to 4*

We can now demonstrate the complete mechanism:

1. Define an action in project configuration.
2. Attach it to a lifecycle hook.
3. Run Apply.
4. Confirm the agent receives the action at the correct moment.
5. Accept or skip it.

**Release criteria:**

- Configured actions work before and after Apply.
- `suggest` and `auto` behave as intended.
- A custom caller can invoke the same interface, including at a `custom.` hook.
- Projects without configured actions behave unchanged.
- The CLI and agent integration pass their tests.

### Release checkpoint B: Prove it works for real use cases

*After PR 5*

Demonstrate two useful actions that don't require special support in OpenSpec.

**Action A: Review requirements against the plan**

The agent rereads linked requirements and identifies conflicts with the current implementation plan.

For example:

> The requirements now specify a 60-second timeout, but the implementation plan specifies 30 seconds.

The developer can keep the plan, investigate, or revise it using the Update skill.

**Action B: Check for source drift using Git**

The agent runs a script maintained by the project to detect whether requirements changed since a recorded baseline.

The script owns the Git comparison and baseline. OpenSpec only tells the agent when to run it.

**Release criteria:**

- Both actions work through the same lifecycle interface.
- No action-specific implementation is needed in OpenSpec.
- The agent correctly handles the review and script output.
- Both work through the built-in Apply skill and a custom caller.

This proves the mechanism supports both agent reasoning and existing team tooling.

---

## 3. What users see in the changelog

### Release A: Run your own actions at different points in the OpenSpec workflow

You can now define actions in `openspec/config.yaml` and choose when your coding agent should run them.

For example, configure a security review before implementation or ask your agent to summarize findings after completing a change.

Actions can be suggested for your approval or followed automatically using your agent's existing permissions.

The initial hooks are `apply.before` and `apply.completed`. Custom skills and external orchestrators can also look up actions through the CLI, including at their own hooks named with a `custom.` prefix.

**Getting started:** Define an action, attach it to a hook, and use Apply as normal. Nothing changes in projects without configured actions.

### Release B: Catch requirements that moved under you

We've added two examples you can use to get started with lifecycle actions.

**Review requirements before implementation.** Your agent can reread linked documents and identify where the current requirements conflict with your plan.

**Check for changes using your own scripts.** Configure an action that asks your agent to run an existing validation or drift-detection script and report its findings.

Both examples use the same lifecycle mechanism. OpenSpec doesn't prescribe how your team checks requirements or validates work, so you can customize them or replace them with your own instructions.

**Getting started:** Copy an example into your project configuration, adjust its instructions, and attach it to the appropriate hook.

---

## 4. What comes later

We're deliberately keeping the first implementation small.

- **Policies:** `mode` controls whether an action is offered or followed. `policy` is a separate concept for handling outcomes, such as warning or blocking, but enforcement is not part of these releases.
- **References:** A future, independent capability for linking changes to Markdown, Git, Linear, Jira, Notion, and other information.
- **Native execution:** Letting OpenSpec run checks directly, collect results, and enforce policies.
- **Plugins:** Packaging and sharing reusable actions across projects.

None of these is required for the initial lifecycle system.

## The overall story

**PRs 1 and 2: Make actions discoverable.**

Projects can define actions, and any caller can ask OpenSpec which actions belong to a hook.

**PRs 3 and 4: Make actions part of the workflow.**

OpenSpec's built-in skills invoke the hooks at the right moments. This is our first complete release.

**PR 5: Prove the mechanism is useful.**

Two independent actions demonstrate real workflows without introducing special-case logic into OpenSpec.

**Release A introduces the mechanism. Release B demonstrates what you can build with it.**

The longer-term goal is a small, reusable lifecycle interface that works across OpenSpec skills, custom agents, and external orchestrators.

---

## More detail

- [Roadmap](direction/roadmap.md): the PR sequence, the interface, and what is decided separately.
- [Lifecycle pilot proposal](lifecycle/pilot-proposal.md): the design, the config shape, and what proves it works.
- [Lifecycle guide (draft)](lifecycle/guide-draft.md): the experience from the user's side.
- [Enterprise requirements inventory](research/enterprise-requirements.md): the broader integration needs, scored against this pilot.

The [product direction](direction/intent-to-implementation.md), [external-context PRD](direction/external-context-for-changes.md), [product launch post (draft)](launch/product-launch-post-draft.md), and [product open questions](launch/product-open-questions.md) explore wider questions about context and contract verification. That work is separate from this pilot.

## Working on this proposal

Use branch `explore/intent-and-lifecycle` in `../openspec-intent-and-lifecycle`, beside the original `openspec` checkout. It was created from local `main` at `2bd5bc3b` on November 5, 2026.

We have not inspected the private integration skills. Mapping where they would call a hook is part of checking the custom-caller path.

These docs came from private exploration and have been revised locally. Identifying names, attachment names, personal paths, and private page links were removed. Original remote pages were not changed.

This proposal is being shared as a draft PR. It is not ready for review or implementation.
