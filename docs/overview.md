# Core Concepts at a Glance

**OpenSpec is a lightweight agreement layer between you and your AI.** You write down what a change should do, the AI drafts the details, you both look at the same plan, and only then does code get written. This page is the whole mental model on one screen. When you want the long version, [Concepts](concepts.md) has it.

Here's the entire idea in five words: **agree first, then build confidently.**

## The five ideas

Everything in OpenSpec is built from five concepts. Learn these and the rest is detail.

**1. Specs are the truth.** A spec describes how your system behaves *right now*. It lives in `openspec/specs/`, organized by domain (`auth/`, `payments/`, `ui/`). Specs are made of requirements ("the system SHALL expire sessions after 30 minutes") and scenarios (concrete given/when/then examples). Think of specs as the single agreed-upon answer to "what does this software do?"

**2. A change is one unit of work.** When you want to add, modify, or remove behavior, you create a change: a folder in `openspec/changes/` holding everything about that work in one place. A proposal, a design, a task list, and the spec edits. One change, one folder, one feature.

**3. Delta specs describe what's changing, not the whole world.** Inside a change, you don't rewrite the entire spec. You write a small delta: `ADDED` this requirement, `MODIFIED` that one, `REMOVED` this other one. This is the trick that makes OpenSpec good at editing existing systems, not just green-field ones. You describe the diff, not the destination.

**4. Artifacts build on each other.** A change contains a few documents, created in a natural order, each feeding the next:

```text
proposal ──► specs ──► design ──► tasks ──► implement
   why        what       how       steps      do it
```

You can revisit any of them at any time. They're enablers, not gates. (More on that below.)

**5. Archiving folds the change back into the truth.** When the work is done, you archive the change. Its delta specs merge into your main specs, and the change folder moves to `changes/archive/` with a date stamp. Now your specs describe the new reality, and you're ready for the next change. The cycle closes.

## The picture

```text
┌─────────────────────────────────────────────────────────────────┐
│                          openspec/                              │
│                                                                 │
│   ┌──────────────────┐         ┌──────────────────────────┐    │
│   │     specs/       │         │        changes/          │    │
│   │                  │ ◄─────  │                          │    │
│   │ source of truth  │  merge  │ one folder per change    │    │
│   │ how things work  │  on     │ proposal · design ·      │    │
│   │ today            │ archive │ tasks · delta specs      │    │
│   └──────────────────┘         └──────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Two folders. `specs/` is what's true. `changes/` is what you're proposing. Archiving moves a proposal into truth.

## The loop you'll actually run

In the default setup, your day looks like this. Optionally think it through first; then one command drafts the plan, you read it, the next builds it, and the last files it away.

```text
/opsx:explore                   →  (optional) think it through with the AI first
/opsx:propose add-dark-mode     →  AI drafts proposal, specs, design, tasks
        (you read and adjust the plan)
/opsx:apply                     →  AI builds it, checking off tasks
/opsx:archive                   →  specs updated, change archived
```

**When in doubt, start by exploring.** `/opsx:explore` is a no-stakes thinking partner: it reads your code, lays out options, and turns a fuzzy idea into a concrete plan before any artifact exists. It's the best antidote to an AI that will otherwise build *something* from a vague prompt. Already know exactly what you want? Skip straight to `/opsx:propose`. Either way, explore ships in the default profile, so it's always there. See the [Explore guide](explore.md).

Those are slash commands, typed in your AI assistant's chat. Setup (`openspec init`) happens in your terminal. If that split is new to you, read [How Commands Work](how-commands-work.md) first; it's the most common point of confusion.

## "Enablers, not gates"

This phrase shows up everywhere in OpenSpec, so here's what it means in plain terms.

Old-school spec processes are waterfalls: finish planning, *then* you're allowed to implement, and going back is painful. OpenSpec refuses that. The order `proposal → specs → design → tasks` shows what becomes *possible* next, not what you're *forced* to do next.

Discover during implementation that the design was wrong? Edit `design.md` and keep going. Realize the scope should shrink? Update the proposal. Nothing locks. The dependencies exist only so the AI has the context it needs (you can't write good tasks without specs to base them on), not to box you in.

The strength here is honesty: real work is messy and iterative, and OpenSpec lets it be. The tradeoff is discipline: because nothing forces you forward, it's on you to keep a change focused rather than letting it sprawl. The [Workflows](workflows.md) guide has good habits for that.

## Why this is worth the small overhead

Plain truth: OpenSpec adds a step. You write a short plan before building. So what do you get for it?

- **You catch wrong turns before they cost you.** Fixing a misunderstanding in a one-paragraph proposal is free. Fixing it after the AI wrote 400 lines is not.
- **The plan and the code stay in the same repo.** Six months later, the spec tells you (and the next AI session) why the system works the way it does.
- **Changes are reviewable.** A change folder is a tidy package: read the proposal, skim the deltas, check the tasks. No archaeology through chat history.
- **It fits existing codebases.** Deltas mean you can specify a change to a 50,000-line app without first documenting the whole thing.

And the honest tradeoff: for a truly trivial one-line fix, the ceremony may not pay off, and that's fine. OpenSpec is designed to be lightweight, but it isn't free. Use it where agreement matters, which turns out to be most of the time once you're working with an AI that will confidently build whatever you vaguely asked for.

## Where to go next

- New here? [Getting Started](getting-started.md) walks the first change in full.
- Not sure what to build yet? [Explore First](explore.md) is the place to start.
- Confused about where commands run? [How Commands Work](how-commands-work.md).
- Want the deep version of everything above? [Concepts](concepts.md).
- Learn by example? [Examples & Recipes](examples.md).
- Need a term defined? [Glossary](glossary.md).
