# The plan folder

> **Beta.** Builds on [stores](user-guide.md). Names and shapes may change.

Big work starts from a destination — a roadmap, a vision, a `product.md` —
and today that artifact has no home in OpenSpec, and no connection to the
changes carrying it out. The plan folder is that home, and that connection.

## The whole idea in one picture

```text
openspec/plan/
  product.md              your destination — any artifact, any name

openspec/changes/
  add-search/
    .openspec.yaml        plan: local   ← one line points the change UP
```

Put in your destination. Point your in-flight changes at it. Then one command
maps the work against it, live:

```bash
openspec list --plan
```

```text
Plan: openspec/plan
  product.md
Changes pointing here: 1/3 complete
  ✓ add-payments-api   here   5/5 tasks
  · add-search         here   2/4 tasks
  · update-docs        here   0/2 tasks
```

No manifest, no required artifact types, no new format. Status comes from the
changes' own task lists — nothing to keep in sync by hand.

## Growing the plan: any files, any folders

The plan is a folder, so an org can keep whatever it already uses in there —
an `architecture.md`, personas, decisions, meeting notes. All of it is
context the agent reads.

**Want visible order?** Number the folders, and they become stages:

```text
openspec/plan/
  00_goal/            numbered folders are stages, in order
  01_requirements/    names and contents are still YOURS
  vision.md           unnumbered = context, read everywhere
```

The numbering is how "where am I?" carries meaning: standing in
`01_requirements/`, an agent (or a new teammate) knows everything
lower-numbered is upstream — read it — and this folder's artifact is what you
produce. Location carries the workflow, not roles or configuration. And it is
opt-in: a plan with no numbers at all works exactly the same.

## Team: the plan is the parent, repos are children

Put the same folder in a [store](user-guide.md) — a planning repo the whole
team registers by name. The store is the global level; each code repo is a
child pointing up at it:

```bash
openspec store setup team-plans --path ~/openspec/team-plans
# put your destination in team-plans/openspec/plan/

# in any code repo:
openspec new change add-search --plan team-plans
```

```bash
openspec list --plan --store team-plans
```

```text
Plan: ~/openspec/team-plans/openspec/plan
  product.md
Changes pointing here: 1/2 complete
  ✓ add-payments-api  api-server   2/2 tasks
  · add-search        web-app      1/3 tasks
```

One command answers "where does the whole effort stand?" — across every repo
on your machine that points at the plan. And repos that add
`references: [team-plans]` to their `openspec/config.yaml` get the plan into
their agent's context automatically.

Going from solo to team is moving one folder into a store. Nothing else
changes. (Want the plan and your code repos open together? That is what
[worksets](user-guide.md) already do.)

## The skill

One skill drives it: `openspec-plan` (`/opsx:plan`). A stance, not a
procedure — it captures a planning conversation into the destination artifact
(synthesizing what it already knows instead of re-interviewing you), **maps
in-flight changes against the destination**, decomposes into self-contained
tracer-bullet slices, and syncs the high level against live status. It is
also told to write *less*: one page per artifact, tables over prose.

## The handoff

**Whoever plans** (a PM, a lead, you) starts in `/opsx:plan`: talk the idea
through and the skill writes the destination artifact — or drop an existing
doc into `openspec/plan/`. Decomposing ends in changes created with
`--plan`, so each is born linked.

**Whoever builds** picks up any change — each is self-contained — and works
it with the normal change skills. The plan travels along: the repo's
`context:` config can point at it locally, and referenced stores surface it
to agents automatically.

**The handoff artifact is the change itself.** Status flows back to
`openspec list --plan` with no meetings and no bookkeeping.

## What the pieces are

| Piece | What it is |
|---|---|
| `openspec/plan/` | one folder; your destination + whatever artifacts you use |
| numbered folders | optional ordered stages — "where am I" navigation |
| `plan: local` / `plan: <store-id>` | one line in a change's `.openspec.yaml` |
| `openspec new change <name> --plan <where>` | create a change already pointing up |
| `openspec list --plan [--store <id>]` | the plan + every linked change, live |
| `openspec-plan` skill | the guide through all of it |

## Honest limits

- Rollup scans repos registered on this machine — it never clones or syncs.
- Stage order is a naming convention, not a gate. Nothing blocks working out
  of order; the skill just knows what comes next.
- Want typed, checked artifacts someday? [Custom schemas](../customization.md)
  already exist — plan artifacts stay freeform until you want that.
- This repo dogfoods it: see [openspec/plan/](../../openspec/plan/goal.md) — a destination file plus two optional stages.
