---
"@fission-ai/openspec": patch
---

### Fixed

- **`/opsx:propose` and `/opsx:ff` no longer finish a change with no spec written.** The workflows listed only `proposal`/`design`/`tasks` and treated the apply phase's `tasks` artifact as the stop condition — but `status` marks an artifact `done` as soon as a matching file exists, so writing `tasks.md` early satisfied the loop while `specs/<capability>/spec.md` was never created (a spec-less change in a spec-driven tool). The loop now derives the full required set — every apply dependency plus everything it transitively `requires` — from a single `status` call, creates each missing artifact, and only skips one when its own `instruction` field marks it conditional. (#1260, #788)

### Changed

- **`openspec status --json` now reports each artifact's `requires` edges.** Every entry in the `artifacts` array carries a `requires` array of the ids it directly depends on, present for every status (including `done`) so agents can compute the transitive required set from `status` alone. Additive and backward-compatible — existing fields are unchanged.
