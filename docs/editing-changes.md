# Editing & Iterating on a Change

**Every artifact in a change is just a Markdown file you can edit at any time.** There is no locked "planning phase," no approval gate, no special edit mode to enter. Want to change the proposal after you've started building? Open `proposal.md` and change it. Realized the design is wrong mid-implementation? Fix `design.md` and keep going. That's the whole answer, and it's by design.

This page is for the moment you think "wait, can I go back and change that?" Yes. Here's how, for each common case.

## Two ways to edit anything

You always have both:

1. **Edit the file directly.** Artifacts are plain Markdown in `openspec/changes/<name>/`. Open `proposal.md`, `design.md`, `tasks.md`, or a delta spec under `specs/` in your editor and change it. Nothing else is required.

2. **Ask your AI to revise it.** In chat, just say what you want: "Update the proposal to drop the caching idea and add a rate-limit section," or "the design should use a queue, not polling." The AI edits the artifact for you, using the rest of the change as context.

Use whichever fits the moment. Small wording tweak? Edit the file. Substantive rethink? Let the AI revise with full context.

## "How do I update the proposal (or specs) after I've started?"

Just update it. Same change, refined.

If you're using the expanded commands, the natural flow is: edit the artifact, then run `/opsx:continue` to pick up from the new state, or `/opsx:apply` to keep implementing against the updated plan. If you're on the default `core` commands, edit the artifact and run `/opsx:apply`; it reads the current files, so it builds against whatever the artifacts now say.

The mental model: artifacts are the live plan, not a signed contract. The AI always works from their current contents, so editing them steers the work.

```text
You: I want to change the approach in this change.

You: [edit design.md, or tell the AI:]
     Update design.md to use a background job instead of a synchronous call.

AI:  Updated design.md. The task list still fits; want me to continue applying?

You: /opsx:apply
```

This answers a very common question: there's no separate "update proposal" command because you don't need one. The file is the source of truth, and editing it (by hand or via the AI) is the update.

## "How do I go back to review after implementing?"

You don't have to "go back," because you never left. The workflow is fluid: review, edit, and implementation aren't sequential phases you're trapped in.

Concretely, after some `/opsx:apply` work:

- Want to re-examine the plan? Open the artifacts and read them, or run `openspec show <change>` in your terminal for a consolidated view.
- Found something to change? Edit the artifact (or ask the AI to), then continue.
- Want a structured check that the code matches the plan? Run `/opsx:verify` (expanded command). It reports completeness, correctness, and coherence without blocking anything. See [Workflows: Verify](workflows.md#verify-check-your-work).

There's no "review phase" to return to, because review is something you can do at any point, including after implementation.

## "I edited the code by hand. How do I reconcile that with OpenSpec?"

This happens constantly and it's fine. You tweaked something in your editor, and now the code and the artifacts disagree. Bring them back in sync in whichever direction is true:

- **The code is now correct, the spec is stale.** Update the delta spec (and tasks, if relevant) to describe the behavior you actually shipped. The spec should match reality before you archive, because archiving merges the spec into your source of truth.
- **The spec is correct, the code drifted.** Keep building or fixing until the code matches the spec.

A fast way to surface mismatches is `/opsx:verify`: it reads your artifacts and your code and tells you where they diverge. Treat its output as a to-do list for reconciliation, then archive once they agree.

The principle: at archive time, your specs become the truth of record. So before you archive, make the specs honest about what the code does. Manual edits are welcome; just don't let them quietly desync the spec.

## Refining a proposal you're not happy with

If a generated proposal misses the mark, you have three good moves:

- **Iterate in place.** Tell the AI what's off ("the scope is too broad, drop the admin features") and let it revise. Cheapest and usually right.
- **Explore first, then re-propose.** If the problem is that the idea itself is unclear, step back to `/opsx:explore`, think it through, and let a sharper proposal come out of that. See [Explore First](explore.md).
- **Start fresh.** If the intent has fundamentally changed, a new change can be clearer than patching the old one.

That last move has its own decision guide, next.

## When to update vs. start a new change

Short version: **update when it's the same work refined; start new when the intent fundamentally changed or the scope exploded into different work.**

- Same goal, better approach? Update.
- Scope narrowing (ship the MVP now, more later)? Update, then archive, then a new change for phase two.
- The problem itself changed ("add dark mode" became "build a full theming system")? New change.

There's a full flowchart and worked examples in [Workflows: When to Update vs Start Fresh](workflows.md#when-to-update-vs-start-fresh) and a deeper treatment in [OPSX: When to Update vs. Start Fresh](opsx.md#when-to-update-vs-start-fresh).

## A note on tasks

`tasks.md` is a living checklist, not a frozen plan. As you implement, you can add tasks you discover, remove ones that turned out unnecessary, or reorder them. The AI checks items off as it completes them during `/opsx:apply`, and it resumes from the first unchecked task if you come back later. Editing the list mid-flight is expected.

## Where to go next

- [Workflows](workflows.md) - patterns, plus the update-vs-new decision guide
- [Explore First](explore.md) - the place to step back to when an idea needs rethinking
- [Commands](commands.md) - `/opsx:continue`, `/opsx:apply`, and `/opsx:verify` in detail
- [Concepts: Artifacts](concepts.md#artifacts) - what each artifact is for
