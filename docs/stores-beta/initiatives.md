# Group related work with initiatives

> **Beta.** This builds on [stores](user-guide.md), which are still new. Names and
> file shapes may change between releases.

Big work is rarely one change. A goal like "make setup smoother" or "add search"
is really a handful of changes that go together. Today there is no clear home for
that bigger picture, so people track it in their head or in a stray document.

An **initiative** is that home. It is a small folder that groups related changes
and shows where each one stands. You can keep it in your own repo, or in a
**store** so more than one repo can share it.

This page shows both: one repo first, then many repos.

## The two ideas, in one line each

- **A store** is a planning repo you register by name, so any project can read it.
- **An initiative** is a folder that groups related changes and tracks their status.

## One repo: make an initiative

An initiative is just a folder with two files:

```
openspec/
  initiatives/
    smoother-setup/
      README.md      the shared plan: what this is and why these changes go together
      inventory.md   the list of changes, and where each one stands
```

That is the whole shape. The `README.md` holds the plan in plain words. The
`inventory.md` is a simple table — one row per change.

There is a real example in this repo: [smoother-setup](../../openspec/initiatives/smoother-setup/README.md).
It groups four real changes that all make setup easier.

### See where each change stands

You do not track status by hand. Ask OpenSpec:

```
openspec list --changes
```

```
Changes:
  simplify-skill-installation               ✓ Complete    8d ago
  fix-opencode-commands-directory           ✓ Complete    8d ago
  add-global-install-scope                  0/38 tasks    8d ago
  schema-alias-support                      No tasks      8d ago
  ...
```

The inventory names the changes; this command shows their live status. Open any
one to read its full plan:

```
openspec show simplify-skill-installation
```

That is the one-repo case. Your big-picture plan and your changes now live side
by side, and your coding agent can read both.

## Many repos: share the initiative in a store

Sometimes the plan is bigger than one repo. Several repos build toward the same
goal, or one team owns the plan and others build against it. Put the initiative
in a **store**, and every repo can read it by name.

Register a planning repo as a store once:

```
openspec store register ./path-to-plans --id team-plans
```

```
OpenSpec root: ready
Registry: registered
```

Now any repo can read that plan without copying it. A code repo adds one line to
its `openspec/config.yaml`:

```yaml
references:
  - team-plans
```

From that repo, OpenSpec shows the shared plan as read-only context:

```
openspec context
```

```
OpenSpec root
  consumer-demo  /path/to/consumer-demo

Referenced stores
  team-plans  /path/to/plans
    Fetch: openspec show <spec-id> --type spec --store team-plans
```

And your coding agent, working in the code repo, automatically sees the shared
plan it should build against:

```
<referenced_stores>
Store team-plans (/path/to/plans):
  - ai-tool-paths: Define AI tool path metadata used to generate OpenSpec skills...
  - artifact-graph: Define the artifact graph model, dependency validation...
  - change-creation: Provide programmatic utilities for creating and validating...
</referenced_stores>
```

You can also read the plan by name from anywhere:

```
openspec list --specs --store team-plans
```

`openspec doctor` checks that every referenced store is present, and prints a
copy-paste fix if one is missing. Nothing syncs on its own — a store is a normal
git repo, so you share it by pushing and pulling like any other.

That is the many-repo case. One plan, one home, read by name from every project —
instead of copied around and left to drift.

## Optional: make the initiative a checked artifact

The folder above is enough to start. If you want OpenSpec to treat an initiative
as a first-class artifact — with its own template and checks — you can describe
one with a small schema file. Schemas are how you **define your own artifact
types** (an initiative, a decision record, a one-pager), beyond the built-in
ones. See [the stores guide](user-guide.md) and the schema files under
`schemas/` for the format. Start with the folder; add a schema only when you want
the extra structure.

## What works today, and what is still rough

Honest notes from building this:

- **Works now, no extra tools:** the initiative folder, `openspec list` for
  status, and reading a store by name from any repo. Everything above ran on a
  normal OpenSpec install.
- **Still rough:** defining your own artifact types is supported but light on
  docs. And a store cannot yet list the repos that read from it, so a full
  "across every repo" rollup needs a bit of glue today.

Start simple: one initiative folder, grouping a few real changes. Move it into a
store when more than one repo needs it.
