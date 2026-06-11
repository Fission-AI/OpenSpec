# Context Store And Initiatives

This initiative is the source of product intent for context stores,
collections, initiatives, workspaces, and repo-local changes.

Start here before continuing workspace or initiative work.

## Reading Order

1. `direction.md` explains the product model and principles.
2. `roadmap.md` lists the ordered roadmap.
3. `tasks.md` shows initiative-wide progress.
4. `decisions.md` records accepted decisions.
5. `questions.md` tracks unresolved questions.
6. `work-items/<id>/` contains execution notes for one roadmap item.

## Boundary

Initiative artifacts carry product intent and roadmap decisions. OpenSpec specs
describe the current behavioral contract behind the code.

Do not rewrite specs for future intent until behavior changes with an
implementation slice.

The current product boundary is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```
