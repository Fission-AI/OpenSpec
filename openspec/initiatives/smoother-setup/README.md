# Initiative: Smoother setup

> An **initiative** is a group of related changes that go together, plus the
> shared plan that holds them. Each change is still its own piece of work. This
> page is the plan they share.
>
> This is a real example, built from changes already in this repo. It shows how
> to group related work in one place. See [the guide](../../../docs/stores-beta/initiatives.md).

## What this is

A group of changes that make OpenSpec faster and simpler to set up.

## Why these go together

New users should get value fast. Each change here removes some setup friction:
fewer skills to learn at first, the right folders for each tool, a clear choice
of where things install, and friendlier schema names. On their own they are
small. Together they add up to a smoother first run.

## The plan

1. Cut first-run friction, so a new user reaches a win quickly.
2. Fix install paths, so files land where each tool expects them.
3. Let users choose where things install.
4. Make schema names easier to understand, without breaking old projects.

## The work

See [inventory.md](inventory.md) for the list of changes and where each one
stands. The status there comes from `openspec list`.

## What is in this folder

An initiative can hold more than a plan and a change list. It is a home for every
artifact that supports the work:

- [inventory.md](inventory.md) — the changes, and where each one stands.
- [personas/](personas/) — who we are building for ([new user](personas/new-user.md),
  [a lead across repos](personas/team-lead.md), [an AI coding agent](personas/coding-agent.md)).
- [decisions/](decisions/) — the key decisions and why, as short records
  ([0001](decisions/0001-aliases-over-rename.md), [0002](decisions/0002-tool-native-paths.md)).
- [example-schema/](example-schema/) — an optional schema that turns these into
  typed, checked artifacts (one-pager → persona → adr → spec → tasks), with a
  [finished-example/](example-schema/finished-example/) showing a completed set.
  See [the guide](../../../docs/stores-beta/initiatives.md).

These are all artifacts in one place. Your coding agent can read any of them.
