# Explore First

**`/opsx:explore` is your thinking partner. Reach for it whenever you have a problem but not yet a plan.** It investigates your codebase, weighs options with you, and clarifies what you actually want, all before a single artifact or line of code is created. When the picture is clear, it hands off to `/opsx:propose`.

If you take one habit from these docs, take this one: **when you're not sure, explore before you propose.**

Here's why that matters. AI coding assistants are eager. Ask vaguely and they'll confidently build *something*, just maybe not the thing you needed. Explore is the cure. It's a no-stakes conversation where you and the AI figure out the right move together, so that by the time you propose, you're proposing the right thing.

## When to explore

Explore is the right first step more often than people expect. Use it when any of these is true:

- You know the *problem* but not the *solution*. ("Pages feel slow." "Auth is a mess." "We keep getting duplicate orders.")
- You're choosing between approaches and want the tradeoffs laid out against your actual code.
- You're new to a codebase and need to understand how something works before you change it.
- The requirements are fuzzy and you want to sharpen them before committing.
- You suspect the work is bigger or smaller than it looks and want to scope it honestly.

Skip explore only when you already know exactly what you want and how. In that case go straight to [`/opsx:propose`](commands.md#opsxpropose).

## What it does (and doesn't)

Explore is a **conversation**, not a generator.

**It does:**
- Read and search your codebase to answer real questions.
- Compare options and name the tradeoffs of each.
- Draw diagrams to make a design legible.
- Help you narrow a vague idea into a concrete, buildable scope.
- Transition to `/opsx:propose` when you're ready.

**It does not:**
- Create a change folder.
- Write any artifacts (no proposal, specs, design, or tasks).
- Write or modify code.

That's the point. Exploring costs you nothing and commits you to nothing. You can explore three dead ends, learn something from each, and only then propose the path that survived.

## It's already installed

Good news: `/opsx:explore` ships in the default **core** profile, right alongside `propose`, `apply`, `sync`, and `archive`. You don't need to enable anything. If OpenSpec is set up in your project, explore is ready in your AI chat. (As with all `/opsx:*` commands, you type it in your assistant's chat, not the terminal. See [How Commands Work](how-commands-work.md).)

## A full example

Watch how a vague worry becomes a sharp, buildable change.

```text
You: /opsx:explore

AI:  What would you like to explore?

You: Our checkout sometimes creates duplicate orders. I don't know why
     and I don't know how to fix it safely.

AI:  Let me dig into the checkout path...
     [reads the order service, the payment webhook handler, and the
      client submit logic]

     Here's what I found. There are two ways a duplicate can happen:

     1. The client can submit twice (double-click, retry on slow network).
        Nothing debounces it.
     2. The payment webhook can fire more than once, and the handler
        creates an order each time. There's no idempotency key.

     Cause #2 is the dangerous one: it can charge and fulfill twice.

     Three ways to fix it, roughly in order of robustness:
     - Idempotency key on the order-creation endpoint (handles both causes)
     - Dedup on the webhook by payment-intent id (handles #2 only)
     - Client-side debounce (handles #1 only, papers over the real bug)

     Given your code already stores the payment-intent id, the
     idempotency-key approach is a small change with the biggest payoff.
     Want me to scope that?

You: Yes, let's do the idempotency key.

You: /opsx:propose add-order-idempotency-key

AI:  Created openspec/changes/add-order-idempotency-key/, with a proposal
     and delta spec grounded in what we just found. Ready for implementation.
```

Notice what happened. The starting point was "something is wrong and I'm scared to touch it." Twenty seconds of exploration turned that into a named root cause, three ranked options, a recommendation tied to the existing code, and a precise change. The proposal that follows is sharp because the thinking happened first.

## Handing off to propose

Explore doesn't archive into anything. When you're ready, you simply start a change, and the AI carries the context from your conversation into the artifacts.

```text
explore  ──►  propose  ──►  apply  ──►  archive
 (think)     (agree)       (build)     (record)
```

You can say it in plain language ("let's turn this into a change") or run `/opsx:propose <name>` directly. Either way, the exploration you just did becomes the foundation of the proposal, not throwaway chat.

If you use the expanded command set, explore can hand off to `/opsx:new` instead, for step-by-step artifact creation. See [Workflows](workflows.md).

## Tips for a good exploration

- **Bring the problem, not the solution.** "Logins feel slow" gives the AI room to investigate. "Add a Redis cache" pre-commits you to an answer you haven't tested yet.
- **Ask for the tradeoffs out loud.** "What are the downsides of each option?" gets you a more honest comparison.
- **Let it read first.** The best explorations start with the AI actually looking at your code, not guessing. Point it at the relevant area if it helps.
- **It's okay to bail.** If exploration reveals the idea isn't worth it, that's a win. You learned it cheaply.
- **Explore again mid-change.** Stuck during `/opsx:apply`? You can step back and explore a sub-problem, then return.

## The honest tradeoffs

**What you gain:** explore catches wrong turns at the cheapest possible moment, before any artifact exists. It's especially powerful in unfamiliar code, where the AI's ability to read and summarize the system saves you an afternoon of spelunking.

**What it costs:** a little patience. Explore is a conversation, so it's slower than firing off `/opsx:propose` and hoping. For work you genuinely understand already, that extra step is pure overhead, and you should skip it.

The rule of thumb: the fuzzier the task, the more explore pays off. The clearer the task, the more you can skip straight to proposing.

## Where to go next

- [Commands: `/opsx:explore`](commands.md#opsxexplore): the precise reference
- [Workflows](workflows.md): explore as part of the everyday loop
- [Examples & Recipes](examples.md#recipe-3-exploring-before-you-commit): explore in a full walkthrough
- [Getting Started](getting-started.md): the first-change guide, exploration included
