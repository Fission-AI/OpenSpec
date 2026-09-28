# Context Store And Initiatives

Status: transition evidence / beta history.

This folder preserves the beta context-store and workspace direction, the
decisions made while exploring it, and the evidence that led to the simpler
Git-native model.

It is not the active product roadmap or implementation queue. For current
direction, start with:

1. `openspec/work/simplify-context-and-workspace-model/goal.md`
2. `openspec/work/simplify-context-and-workspace-model/roadmap.md`

The `direction-git-native-work.md` note is the transition note that led to the
current goal. If it conflicts with the current `goal.md`, the current `goal.md`
wins.

## Reading Order

Use this reading order when researching the beta history:

1. `direction-git-native-work.md` explains the transition from the old beta
   model toward Git-native specs and work.
2. `direction.md` preserves the earlier context-store and initiative direction.
3. `roadmap.md` preserves the historical beta roadmap snapshot.
4. `tasks.md` preserves historical initiative-wide progress.
5. `decisions.md` records accepted decisions made during the beta.
6. `questions.md` tracks questions that were open at the time.
7. `work-items/<id>/` contains execution notes for one historical roadmap item.

## Boundary

These artifacts preserve product intent, roadmap decisions, and beta evidence
from the old model. OpenSpec specs describe the current behavioral contract
behind the code.

Do not rewrite specs for future intent until behavior changes with an
implementation slice.

The earlier product boundary was:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

The newer direction is:

```text
OpenSpec is a Git-native artifact format for specs and work.

Specs are what is true.
Work is what is in motion.
```
