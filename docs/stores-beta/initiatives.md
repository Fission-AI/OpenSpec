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

That is the whole shape to start. The `README.md` holds the plan in plain words.
The `inventory.md` is a simple table — one row per change.

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

### An initiative can hold more than changes

Real work needs more than a change list. It helps to write down *who* you are
building for and *why* you made the calls you did. An initiative is a good home
for those too — as plain files, right next to the plan:

```
smoother-setup/
  README.md      the plan
  inventory.md   the changes, and where each one stands
  personas/      who we are building for
  decisions/     the key calls, and why (one short record each)
```

In the [example](../../openspec/initiatives/smoother-setup/README.md):

- **Personas** name the people the work serves — a
  [new user](../../openspec/initiatives/smoother-setup/personas/new-user.md), a
  [lead across repos](../../openspec/initiatives/smoother-setup/personas/team-lead.md),
  and an [AI coding agent](../../openspec/initiatives/smoother-setup/personas/coding-agent.md).
- **Decision records** (ADRs) capture one call each and why, so the reason is not
  lost later — for example, [why we added an alias instead of renaming](../../openspec/initiatives/smoother-setup/decisions/0001-aliases-over-rename.md).

All of it sits in one place, in plain Markdown your coding agent can read.

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

## Define your own artifact types

Plain files are enough to start. When you want OpenSpec to *check* these
artifacts — give each one a template and a clear order — you describe them in a
small **schema**. A schema is how you define your own artifact types, beyond the
built-in ones.

The example ships one:
[example-schema/](../../openspec/initiatives/smoother-setup/example-schema/schema.yaml).
It defines five types — a one-pager, a persona, a decision record, a spec, and a
task list — and the order they build in. Copy that folder into
`openspec/schemas/initiative/` and OpenSpec picks it up:

```
openspec schemas
```

```
Available schemas:

  initiative (project)
    A workflow that keeps the "who and why" next to the "what". It produces a
    one-pager, a persona, a decision record, a spec, and a task list.
    Artifacts: one-pager → persona → adr → spec → tasks

  spec-driven
    Default OpenSpec workflow - proposal → specs → design → tasks
    Artifacts: proposal → specs → design → tasks
```

Now you can start a change on your own types. OpenSpec tracks the order — each
artifact unlocks the next:

```
openspec new change improve-onboarding --schema initiative
openspec status --change improve-onboarding
```

```
[ ] one-pager
[-] persona (blocked by: one-pager)
[-] adr (blocked by: persona)
[-] spec (blocked by: adr)
[-] tasks (blocked by: spec)
```

Fill each artifact in order and the graph fills in. Here is a finished one — you
can read the real files in
[finished-example/](../../openspec/initiatives/smoother-setup/example-schema/finished-example/):

```
openspec status --change example-first-run
```

```
Progress: 5/5 artifacts complete

[x] one-pager
[x] persona
[x] adr
[x] spec
[x] tasks

All artifacts complete!
```

```
openspec validate example-first-run --type change --strict
```

```
Change 'example-first-run' is valid
```

This is the heart of it: a store is not limited to changes and specs. You decide
what artifacts your work needs — one-pagers, personas, decision records — and
they all live in one place your team and your coding agent can read.

Start with plain files. Add a schema when you want the structure and the checks.

## What works today, and what is still rough

Honest notes from building this:

- **Works now, no extra tools:** the initiative folder, personas and decision
  records as files, `openspec list` for status, your own artifact types via a
  schema, and reading a store by name from any repo. Every command and its output
  above came from a normal OpenSpec install.
- **Still rough:** the folder layout for an initiative is a convention here, not a
  built-in command, so it is on you to keep it tidy. And a store cannot yet list
  the repos that read from it, so a full "across every repo" rollup needs a bit of
  glue today.

## Where this could go

This works today with plain files and a copied schema. A first-class version
could:

- Add an `openspec initiative` command to create and list initiatives, so the
  layout is more than a convention.
- Roll up status across every repo that references a store, so "where does the
  whole effort stand" is one command.
- Ship a few ready-made artifact types (one-pager, persona, decision record) you
  can turn on, instead of copying a schema.

None of these are needed to start. They are the natural next steps once teams
lean on initiatives.

Start simple: one initiative folder, grouping a few real changes. Move it into a
store when more than one repo needs it.
