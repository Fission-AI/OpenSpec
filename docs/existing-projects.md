# Using OpenSpec in an Existing Project

**You do not document your whole codebase to start. You write specs only for what you're about to change.** That's the single most important thing to know about adopting OpenSpec on an existing project, and it's why OpenSpec is built brownfield-first.

A common worry sounds like this: "My app is 80,000 lines old. Do I have to write specs for all of it before OpenSpec is useful?" No. You'd hate that, and so would we. OpenSpec grows your specs one change at a time. Your first change documents the slice it touches, the next change documents its slice, and over months your specs fill in naturally around the work you actually do.

This guide shows how to start on day one without boiling the ocean.

## The thirty-second version

```bash
$ cd your-existing-project
$ openspec init          # adds openspec/ and your AI tool's commands
```

Then, in your AI chat:

```text
/opsx:explore            # optional: have the AI read the area you'll touch
/opsx:propose <a real, small change you actually need>
/opsx:apply
/opsx:archive
```

Your specs now describe exactly the part of the system that change touched, and nothing more. That's correct. You're done worrying about the other 80,000 lines.

## Why delta-first is the whole trick

OpenSpec changes are written as **deltas**: `ADDED`, `MODIFIED`, `REMOVED`. A delta describes what's changing relative to current behavior, not the entire system.

This is exactly what brownfield work needs. You're rarely building from nothing. You're adding a field, fixing a redirect, tightening a timeout. A delta lets you specify that one change precisely without first writing a 40-page spec of everything around it.

So your `openspec/specs/` directory doesn't start full and complete. It starts nearly empty and accumulates. Each archived change merges its delta in. The spec for `auth/` becomes thorough only after you've made several auth changes, which is exactly when you want it thorough.

If you want the deeper mechanics, see [Concepts: Delta Specs](concepts.md#delta-specs).

## Your first change on a real codebase

Pick something small and real. Not a toy, not a rewrite. A change you were going to make this week anyway. Small first changes teach you the workflow with low stakes.

**Step 1: Let the AI read the relevant area.** This is where `/opsx:explore` earns its keep on an unfamiliar or large codebase. Point it at the part you're about to touch and let it map how things work before proposing anything.

```text
You: /opsx:explore

AI:  What would you like to explore?

You: I need to add rate limiting to our public API, but I'm not sure
     how requests currently flow through the middleware.

AI:  Let me trace it... [reads the router, middleware stack, and config]
     Requests hit Express, pass through auth middleware, then your
     controllers. There's no rate-limiting layer today. The cleanest
     insertion point is a middleware right after auth. Want me to scope it?
```

Notice the AI now understands your actual structure, so the proposal it writes will fit your code, not a generic template. On a big codebase, this single habit saves the most pain. See [Explore First](explore.md).

**Step 2: Propose the change.** The proposal and its delta spec capture just this change.

```text
You: /opsx:propose add-api-rate-limiting
```

**Step 3: Build and archive** with `/opsx:apply` and `/opsx:archive`, same as any change. After archiving, you have a real spec for your rate-limiting behavior, born from a change you needed anyway.

## Prefer a guided tour? Use onboard

If you'd rather watch the whole loop happen on your own code with narration, the expanded command `/opsx:onboard` does exactly that: it scans your codebase for a small, safe improvement, then walks you through proposing, building, and archiving it, explaining each step.

Turn on the expanded commands first:

```bash
$ openspec config profile      # select the expanded workflows
$ openspec update              # apply them to this project
```

Then in chat:

```text
/opsx:onboard
```

It's the gentlest possible introduction on a real project, and it leaves you with a genuine (small) change you can keep or discard. See [Commands: `/opsx:onboard`](commands.md#opsxonboard).

## "But I already have requirements docs"

Maybe you have a PRD, an SRS, a formal spec, even TLA+ models. Good. You don't import them wholesale, and you don't throw them away either.

Treat existing docs as **source material for exploration**, not as specs to convert. When you start a change, paste or point the AI at the relevant section, and let it shape a focused OpenSpec delta from it. The delta captures the behavior you're changing now, in OpenSpec's testable requirement-and-scenario form. Your original documents stay where they are as background.

The honest reason: OpenSpec specs are deliberately behavior-first and scoped to changes. A 40-page PRD is a different artifact with a different job. Forcing a one-time bulk conversion tends to produce a large, stale spec nobody trusts. Letting specs grow from real changes keeps them accurate.

```text
You: /opsx:explore
You: Here's the section of our PRD about checkout. I'm implementing the
     "guest checkout" requirement next.
     [paste the relevant requirement]
AI:  [reads it, asks clarifying questions, then helps scope a change]
You: /opsx:propose add-guest-checkout
```

## Organizing specs in a big codebase

Specs live under `openspec/specs/`, grouped by **domain**: a logical area that matches how your team thinks about the system. You don't have to design the whole taxonomy up front. Create a domain folder when your first change in that area needs one.

Common ways to slice domains:

- **By feature area:** `auth/`, `payments/`, `search/`
- **By component:** `api/`, `frontend/`, `workers/`
- **By bounded context:** `ordering/`, `fulfillment/`, `inventory/`

Pick whatever makes a newcomer nod. You can refine later. See [Concepts: Specs](concepts.md#specs).

## Monorepos and work that spans repos

For a monorepo, the simplest model is one `openspec/` directory at the repo root, with domains that map to your packages or services. That covers most teams.

If your work genuinely spans **multiple repositories** (or several packages you treat as separate), OpenSpec has a beta **stores** feature: planning lives in its own standalone repo that any of your code repos can reference, so the plan does not have to live inside one repo's `openspec/` folder. It's beta, so treat its commands and state as evolving. Start with the [Stores User Guide](stores-beta/user-guide.md) for the mental model and the smallest useful path.

## A few honest cautions

- **Resist the urge to back-fill everything.** Writing specs for code you aren't changing feels productive and usually isn't. Those specs go stale, because nothing forces them to track reality. Let real changes drive your specs.
- **Keep early changes small.** Your first few changes are as much about learning the rhythm as shipping. A tight scope makes the loop fast and the lessons cheap.
- **Commit `openspec/` to git.** Your specs and archive belong in version control alongside the code they describe.
- **Give the AI context.** On a large codebase with strong conventions, fill in `openspec/config.yaml`'s `context:` so every proposal respects your stack and patterns. See [Customization](customization.md#project-configuration).

## Where to go next

- [Explore First](explore.md) - the key habit for understanding code before you change it
- [Getting Started](getting-started.md) - the full first-change walkthrough
- [Editing & Iterating on a Change](editing-changes.md) - adjusting a change as you learn
- [Concepts: Delta Specs](concepts.md#delta-specs) - why deltas make brownfield work clean
- [Customization](customization.md) - teach OpenSpec your project's conventions
