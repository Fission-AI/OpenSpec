# The plan folder

> **Beta.** Builds on [stores](user-guide.md). Names and shapes may change.

Big work is bigger than one change. A roadmap, a PRD, a vision — today that
lives outside OpenSpec, and there is no good way in. The plan folder is the
way in.

## The whole idea in one picture

```text
openspec/plan/            the plan: one folder
  00_goal/                numbered folders are stages, in order
  01_requirements/        names and contents are YOURS — any artifact
  02_changes/             the last stage meets execution
  vision.md               unnumbered = context, not a stage

openspec/changes/
  add-search/
    .openspec.yaml        plan: local   ← one line points the change UP
```

That is everything. No manifest, no new file format, no required artifact
types. Rename the folders and you have changed the workflow.

## Solo: one repo, one machine

The plan sits in your repo, next to your changes.

```bash
mkdir -p openspec/plan/00_goal          # a plan starts as an empty folder
openspec new change add-search --plan local
openspec list --plan
```

```text
Plan: openspec/plan
Stages:
  00_goal        1 file
Changes pointing here: 0/1 complete
  · add-search   here   0/4 tasks
```

Status is live from the changes' own task lists. Nothing to keep in sync.

## Team: the plan is the parent, repos are children

Put the same folder in a [store](user-guide.md) — a planning repo the whole
team registers by name. The store is the global level; each code repo is a
child that points up at it.

```bash
openspec store setup team-plans --path ~/openspec/team-plans
mkdir -p ~/openspec/team-plans/openspec/plan/00_goal

# in any code repo:
openspec new change add-search --plan team-plans
```

```bash
openspec list --plan --store team-plans
```

```text
Plan: ~/openspec/team-plans/openspec/plan
Stages:
  00_goal            1 file
Changes pointing here: 1/3 complete
  ✓ add-payments-api  api-server   5/5 tasks
  · add-search        web-app      2/4 tasks
  · update-docs       here         1/2 tasks
```

One command answers "where does the whole effort stand?" — across every repo
on your machine that points at the plan.

Repos that add `references: [team-plans]` to their `openspec/config.yaml`
also get the plan in their agent's context automatically:

```text
Store team-plans (…):
  Plan: 00_goal → 01_requirements → 02_changes  (openspec list --plan --store team-plans)
```

## The skill

One skill drives it: `openspec-plan` (`/opsx:plan`). It is a stance, not a
procedure — it reads the folders to see where the effort stands, helps
translate each stage into the next (a PRD into a feature list, a feature into
changes), and syncs the high level against live change status. It is also
told to write *less*: one page per artifact, tables over prose.

## What the pieces are

| Piece | What it is |
|---|---|
| `openspec/plan/` | one folder; numbered subfolders are ordered stages |
| `plan: local` / `plan: <store-id>` | one line in a change's `.openspec.yaml` |
| `openspec new change <name> --plan <where>` | create a change already pointing up |
| `openspec list --plan [--store <id>]` | stages + every linked change, live |
| `openspec-plan` skill | the guide through all of it |

## Honest limits

- Rollup scans repos registered on this machine — it never clones or syncs.
- Stage order is a naming convention, not a gate. Nothing blocks working out
  of order; the skill just knows what comes next.
- This repo dogfoods it: see [openspec/plan/](../../openspec/plan/00_goal/goal.md).
