# Initiatives

> **Beta.** Builds on [stores](user-guide.md). Names and shapes may change.

Big work starts above a single change — a roadmap, a product vision, a
quarter's effort — and today those artifacts have no home in OpenSpec, and no
connection to the changes carrying them out. `openspec/initiatives/` is that
home, and that connection.

## The whole idea in one picture

```text
openspec/initiatives/
  roadmap.md              evergreen — truths every initiative serves
  smoother-setup/         one initiative = one folder; contents freeform
    notes.md

openspec/changes/
  add-search/
    .openspec.yaml        initiative: smoother-setup   ← one line points UP
```

Two kinds of things live in the folder:

- **Evergreen artifacts** (unnumbered top-level files) are your standing
  truths — the roadmap, the product, the architecture. Maintained forever,
  the way specs are.
- **Initiatives** (subfolders) are finite: a piece of work above a single
  change that runs to completion.

Point your in-flight changes at an initiative, and one command maps the
portfolio, live:

```bash
openspec list --initiatives
```

```text
Initiatives: /…/my-app/openspec/initiatives
Evergreen: roadmap.md

smoother-setup   1/2 changes complete
  · add-search      here            1/2 tasks
  ✓ fix-onboarding  here            2/2 tasks
```

No manifest, no required artifact types, no new format. Status comes from
the changes' own task lists — nothing to keep in sync by hand.

## The same loop, one level up

```text
planning   evergreen artifacts   what is true      initiatives   what is in motion
code       specs                 what is true      changes       what is in motion
```

Work flows down: an initiative decomposes into changes. Truth flows up:
finishing an initiative updates the evergreen artifacts, the way archiving a
change updates specs. Status flows back live — driven by structured facts on
disk (a task checked off, a change archived), never by prose.

**Want visible order inside an initiative?** Number its folders
(`00_goal/`, `01_requirements/`) and they become stages: standing in
`01_requirements/`, an agent (or a new teammate) knows everything
lower-numbered is upstream. Opt-in — an initiative with no numbers works
exactly the same.

## Team: the portfolio lives in a store

Put the same folder in a [store](user-guide.md) — a planning repo the whole
team registers by name. The store is the parent; each code repo is a child
pointing up:

```bash
openspec store setup team-plans --path ~/openspec/team-plans
# put initiatives in team-plans/openspec/initiatives/

# in any code repo:
openspec new change add-search --initiative team-plans/smoother-setup
```

```bash
openspec list --initiatives --store team-plans
```

```text
Initiatives: /…/team-plans/openspec/initiatives
Evergreen: roadmap.md

smoother-setup   2/3 changes complete
  ✓ add-payments-api  api-server      2/2 tasks
  · add-search        my-app          1/2 tasks
  ✓ fix-onboarding    my-app          2/2 tasks
```

One command answers "where does everything stand?" — across every repo on
your machine that points at the store's initiatives. It even works outside
any repo: with no local root, `list --initiatives` shows the portfolios of
your registered stores. And repos that add `references: [team-plans]` to
their `openspec/config.yaml` get the initiatives into their agent's context
automatically.

Going from solo to team is moving one folder into a store. The initiative
is untouched; its ref changes from `smoother-setup` to
`team-plans/smoother-setup`.

## The skill

One skill drives it: `openspec-initiatives` (`/opsx:initiatives`). It routes
by what is on disk — nothing there yet → it captures the conversation into a
first artifact (synthesizing what it already knows instead of
re-interviewing you); a portfolio exists → it opens with where everything
stands; inside an initiative → it ideates from what exists, decomposes into
self-contained changes born linked, and syncs the evergreen layer as work
completes. Every move ends in a short numbered menu of real next actions —
one marked recommended — and it is told to write *less*: one page per
artifact, tables over prose.

## The handoff

**Whoever plans** (a PM, a lead, you) starts in `/opsx:initiatives`: talk the
idea through and the skill writes the artifacts — or drop existing docs into
`openspec/initiatives/`. Decomposing ends in changes created with
`--initiative`, so each is born linked.

**Whoever builds** picks up any change — each is self-contained — and works
it with the normal change skills. The initiative travels along: the repo's
`context:` config can point at it locally, and referenced stores surface it
to agents automatically.

**The handoff artifact is the change itself.** Status flows back to
`openspec list --initiatives` with no meetings and no bookkeeping.

## What the pieces are

| Piece | What it is |
|---|---|
| `openspec/initiatives/` | evergreen truths + one folder per initiative |
| numbered folders inside an initiative | optional ordered stages |
| `initiative: <name>` / `<store-id>/<name>` | one line in a change's `.openspec.yaml` |
| `openspec new change <name> --initiative <ref>` | create a change already pointing up |
| `openspec list --initiatives [--store <id>]` | the portfolio + every linked change, live |
| `openspec-initiatives` skill | the guide through all of it |

## Honest limits

- Rollup scans repos registered on this machine — it never clones or syncs.
- Stage order is a naming convention, not a gate. Nothing blocks working out
  of order; the skill just knows what comes next.
- Reactions fire when the skill looks — reactive triggers beyond that (git
  hooks, CI) are a natural next experiment, deliberately not this one.
- Want typed, checked artifacts someday? [Custom schemas](../customization.md)
  already exist — initiative artifacts stay freeform until you want that.
- This repo dogfoods it: see
  [openspec/initiatives/](../../openspec/initiatives/smoother-setup/goal.md)
  — one initiative with two optional stages, grouping four real changes.
