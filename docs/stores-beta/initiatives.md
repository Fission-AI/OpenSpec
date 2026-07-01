# Initiatives: your plan, your artifacts, shared across repos

> **Beta.** This builds on [stores](user-guide.md). Names and file shapes may
> change between releases.

## The one idea

Kiro hands you `requirements → design → tasks`. Spec-Kit hands you
`spec → plan → tasks`. You use the artifacts they picked.

OpenSpec is different:

> **You define the artifacts your team actually uses — a brief, a persona, a
> decision record, anything — and share them in one place every repo can read.**

That one place is a **store**. The plan that lives there is an **initiative**.

## What an initiative is

An **initiative** is the home for a big effort — work that is too large for a
single change.

It holds three things:

- **the brief** — what you are doing, and why
- **the artifacts you choose** — personas, decision records, whatever your team
  works from
- **the changes** that carry it out — each one still a normal OpenSpec change,
  with live status

One effort. One home. Read by every repo that needs it.

```text
acme-plans  (a store: planning in its own repo)
  openspec/initiatives/
    smoother-setup/
      brief.md          what this is, and why
      personas/         who we build for      ← your own artifact types
      decisions/        the calls we made      ← your own artifact types
      (changes grouped here, with live status)
```

## The happy path

*A team is making setup smoother. The work spans a CLI repo and a docs repo.
The plan should not live in either one.*

### 1. Put the plan in a store

A store is planning in its own git repo. Stand one up once:

```bash
openspec store setup acme-plans --path ~/openspec/acme-plans
```

Now the plan has a home of its own — not buried in anyone's code.

### 2. Define your own artifacts

This is the superpower. Your team works from personas and decision records, so
make those first-class. Describe them once, in a small **schema**:

```yaml
# acme-plans/openspec/schemas/initiative/schema.yaml
artifacts:
  - id: brief        # what and why
  - id: persona      # who we build for
  - id: decision     # a call we made, and the trade-off
```

These are *your* artifact types — labeled in your words. OpenSpec now knows them
and can check them, the same way it checks specs and tasks.

### 3. Group the changes it takes

The initiative names the changes that carry it out. Each change is a normal
OpenSpec change — nothing new to learn. You never track status by hand; ask
OpenSpec:

```bash
openspec list --changes --store acme-plans
```

```text
Changes:
  simplify-skill-installation      ✓ Complete    8d ago
  fix-opencode-commands-directory  ✓ Complete    8d ago
  add-global-install-scope         0/38 tasks    8d ago
  schema-alias-support             No tasks      8d ago
```

One command. Where the whole effort stands.

### 4. Every repo reads it — nothing copied

Each code repo adds one line to its `openspec/config.yaml`:

```yaml
references:
  - acme-plans
```

Now the coding agent in *that* repo sees the shared plan — the brief, the
personas, the decisions, the changes — and builds against it. No pasting. No
drift. The plan is read by name, live from the store.

That is the whole happy path: **your store, your artifacts, read by every
repo, with live status.**

## When two initiatives collide

The question every team hits: the store has an initiative called
`smoother-setup`, and someone starts a local one by the same name in their own
repo. Which wins?

**Best default: the store is canonical.** The store holds the shared,
agreed-upon initiative. A local one with the same name is treated as a *draft
that shadows it* — OpenSpec keeps letting you work locally, but tells you
plainly:

```text
initiative 'smoother-setup' (local) shadows the canonical one in store 'acme-plans'
```

Nothing diverges silently. You always know there is a shared source of truth,
and you can reconcile when you are ready. (This mirrors how OpenSpec already
handles schemas: a project schema *shadows* a package one, and `openspec schema
which` shows you it is happening.)

## What works today, and what we are building

Honest scope — this is a prototype.

**Works today:**
- An initiative folder in a store: the brief, your own artifact types as plain
  files, and the changes it groups.
- Live status for those changes with `openspec list --changes --store`.
- A repo reading the store by name via `references:`.
- Defining your own artifact types in a schema (`openspec schema`).

**The gap we are closing (this is the build):**
- Today, `openspec schemas` and artifact discovery look only at the current
  repo — they are not store-aware. So a repo that *references* a store cannot
  yet see the store's custom artifact types, and initiative precedence
  (canonical vs. local shadow) is a convention, not something OpenSpec enforces.
- **The prototype makes both work across repos:** the store's initiatives and
  artifact types become discoverable and checkable from any repo that
  references it, with the canonical-vs-shadow rule built in.

Start simple: one initiative folder in a store, grouping a few real changes,
with the artifacts your team already uses. The rest is what we build next.
