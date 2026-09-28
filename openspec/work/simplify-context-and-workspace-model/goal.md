# Simplify Context And Workspace Model Goal

## Destination

Reorient the current context-store, initiative, workspace, and repo-local change
direction into a simpler OpenSpec model that is easier to explain, implement,
and dogfood.

The simplified direction is:

```text
Specs are what is true.
Work is what is in motion.
```

OpenSpec artifacts should live in Git. That Git repo may be the project repo,
a standalone planning repo, or a contracts repo. The product should not require
context stores, workspaces, or another state system as primary user-facing
concepts.

## Desired Experience

A human should be able to say:

```text
OpenSpec can live in this project repo or in its own Git repo.
This project repo's work draws on these planning repos.
I can keep a personal workset for the planning repo and the code repos I want
open together.
```

Agents and commands should be able to assemble the relevant OpenSpec root and
referenced planning repos without asking users to understand context-store,
workspace, collection, and repo-local modes as separate product systems. Code
repos enter the experience through explicit user direction or personal
worksets, not through a committed declaration plus local map.

## Product Direction

- Preserve the current `specs/` and `changes/` baseline while the simpler model
  is introduced.
- Make the placement choice explicit: in-project OpenSpec or standalone
  OpenSpec repo.
- Support layered planning by reference, not redirection: high-level
  requirements and design can live in a standalone repo while a project repo
  keeps its own OpenSpec root for implementation-level work, drawing on the
  standalone repo as declared context.
- Keep implementation repo selection explicit until a clearer product model
  exists; do not introduce a committed code-repo declaration plus local mapping
  abstraction as the default path.
- Reduce workspace behavior to personal, manually composed focused views.
- Treat the future `work/` layout as a later evolution, not a prerequisite for
  making standalone OpenSpec repos useful.

## Constraints

- Keep the current `openspec/changes/` and `openspec/specs/` lifecycle working.
- Treat this `/work` folder as an experiment for organizing the reorientation,
  not as the implemented product model.
- Avoid reviving context stores or workspaces as primary product nouns.
- Avoid global `decisions.md` and `questions.md` files as the default planning
  shape.
- Prefer small, reviewable slices over large roadmap items.
- Promote only the information that needs to guide future slices.

## Success Signals

- A fresh agent can understand the active goal and current roadmap by reading
  the files in this work directory.
- The old context-store and workspace initiative becomes useful transition
  history rather than the active product queue.
- The next product slices are about preserving the baseline, clarifying
  placement, supporting standalone OpenSpec repos, references, and personal
  worksets.
- The roadmap avoids making future `/work` support block the simpler standalone
  OpenSpec repo path.
