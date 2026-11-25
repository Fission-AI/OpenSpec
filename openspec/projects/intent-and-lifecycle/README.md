# OpenSpec Lifecycle Actions

**Status:** Proposed, not implemented. The command, configuration, and changelog text below describe what we plan to build.

**Goal:** Let developers attach their own actions to points in the development workflow, without changing OpenSpec or depending on its built-in skills.

We'll build this incrementally through five small PRs, with two release checkpoints.

## 1. How it works

A project defines **what the agent should do** and **when it should do it**.

```yaml
# openspec/config.yaml
lifecycle:
  actions:
    requirements-review:
      title: Review requirements
      instructions: |
        Check whether the current requirements
        still agree with the implementation plan.

  triggers:
    - on: change.apply.before
      action: requirements-review
      mode: suggest
```

When Apply starts:

```text
  Apply is about to start
           │
           ▼
  OpenSpec looks up actions
  configured for change.apply.before
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
openspec lifecycle actions --at change.apply.before --json
```

It receives the configured actions and handles them using its own agent, tools, and context.

A caller can also invoke a hook of its own. Custom hook names start with `custom.`, such as `custom.security-review.completed`.

No native execution engine is required.

## 2. How we'll build it

Small, independently verifiable PRs covering the core lifecycle checkpoints (`change.create.before`, `change.apply.before`, `change.apply.completed`, `change.archive.before`, `change.archive.completed`) plus `custom.*`, grouped into two release checkpoints.

| PR | What we're building | How we verify it |
|---|---|---|
| **1. Configuration** | Define and strictly validate `lifecycle.actions` and `lifecycle.triggers` | Valid configuration loads. Invalid references, modes, hook names, duplicate triggers, unknown keys (including unsupported `policy`), and `lifecycle:` in pointer-only repo configs fail clearly without breaking unrelated commands or Archive |
| **2. Action lookup** | Add `openspec lifecycle actions [--at <hook>] [--store <id>] [--json]` | Bare command lists all configured hooks for humans; `--at <hook>` returns resolved root and matching actions in order with instructions inline |
| **3. Apply hooks** | Invoke `change.apply.before` and `change.apply.completed` in Apply | `change.apply.before` runs once before edits (skipped on `blocked`/`all_done`); `change.apply.completed` runs on `all_done`; accepting and skipping both work |
| **4. Create & Archive hooks** | Invoke `change.create.before` (`propose`, `new`) and `change.archive.before` / `change.archive.completed` (`archive`, `bulk-archive`) | Full Create → Apply → Archive lifecycle works end-to-end across built-in skills |
| **5. Real examples** | Demonstrate agent-native lifecycle actions (plus a team-script note) | Multiple independently defined actions work through the same hooks without changes to OpenSpec's core |

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

- Configured actions work across Create (`change.create.before`), Apply (`change.apply.before`, `change.apply.completed`), and Archive (`change.archive.before`, `change.archive.completed`).
- Bare `openspec lifecycle actions` lists configured hooks cleanly for humans, and `--at <hook> --json` works for callers.
- `suggest` and `auto` behave as intended.
- A custom caller can invoke the same interface, including at a `custom.` hook.
- Projects without configured actions behave unchanged.
- The CLI and agent integration pass their tests.

### Release checkpoint B: Prove it works for real use cases

*After PR 5*

Lead with **agent-native actions** where coding agents add real judgment, without requiring special support in OpenSpec:

**Action A: Review linked requirements against the plan (`change.apply.before`)**

The agent rereads linked requirements and identifies conflicts with the current implementation plan.

For example:

> The requirements now specify a 60-second timeout, but the implementation plan specifies 30 seconds.

The developer can keep the plan, investigate, or revise it using the Update skill.

**Action B: Draft upstream feedback after implementation (`change.apply.completed`)**

The agent reviews decisions and verification evidence to draft feedback worth sharing with the requirements owners—without submitting anything automatically.

*(Teams can also point an action's instructions at an existing repo script—such as a Git drift script—as a lightweight stopgap until native `command:` execution exists.)*

**Release criteria:**

- Agent-native review and feedback actions work through the same lifecycle interface.
- No action-specific implementation is needed in OpenSpec.
- Both work through built-in skills and a custom caller.

---

## 3. What users see in the changelog

### Release A: Run your own actions across the OpenSpec change lifecycle

You can now define actions under `lifecycle:` in `openspec/config.yaml` and attach them to checkpoints in a change's lifecycle.

For example, check upstream readiness before creating a change, review requirements before implementation, draft feedback after tasks complete, or run a final check before archiving.

Actions can be suggested for your approval or followed automatically using your agent's existing permissions.

The initial checkpoints are `change.create.before`, `change.apply.before`, `change.apply.completed`, `change.archive.before`, and `change.archive.completed`. Custom skills and external orchestrators can also look up actions through `openspec lifecycle actions`, including at their own `custom.` hooks. Hooks run when invoked by skills or orchestrators (not deprecated direct CLI commands like `openspec archive`).

**Getting started:** Run `openspec update` to refresh your skills, define an action under `lifecycle:`, attach a trigger, and inspect your setup with `openspec lifecycle actions`. Nothing changes in projects without configured actions.

### Release B: Catch requirements that moved under you

We've added ready-to-copy agent-native examples for lifecycle actions:

**Review requirements before implementation.** Your agent rereads linked documents and identifies where current requirements conflict with your plan.

**Draft upstream feedback when tasks finish.** Your agent summarizes decisions and evidence worth sharing back with product or architecture teams.

OpenSpec doesn't prescribe how your team reviews work—you can customize these prompts, write your own, or tell your agent to run an existing validation script until native script execution lands.

**Getting started:** Copy an example into your `openspec/config.yaml`, adjust its instructions, and attach it to the appropriate checkpoint.

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

## Notes

These docs consolidate earlier exploration notes, with identifying names and private links removed. Mapping how custom external skills call these hooks is part of verifying the custom-caller path.
