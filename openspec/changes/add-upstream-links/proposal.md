# Add upstream links and open the schema system upward

## Why

Teams that plan before code moves (product briefs, platform contracts) need
a home for that work and a traceable handoff to the repos that implement it.
The initiatives experiment answered this with a new untyped layer — folders,
stages, evergreen files — while everything else in OpenSpec is typed. Users
with custom schemas showed the better shape: upstream work is a change in a
store, typed by a schema the store defines. What is missing is not a new
noun; it is the existing machinery working one level up and across repos.

## What Changes

- **Serves links**: `serves: <change>` / `<store-id>/<change>` in change
  metadata, written by `openspec new change --serves <ref>`. Linking records
  the checkout machine-locally and auto-adds `references:` to the repo's
  config, so context surfaces immediately.
- **Rollup**: `openspec list --downstream [--store <id>]` shows each of the
  root's changes and every change on this machine that serves it, live from
  task lists. Refs to missing changes stay visible; archived upstream
  changes are marked (their requirements now live in specs).
- **Upstream context block**: instructions for a linked change open with
  `<upstream>` — the upstream change's on-disk path and how to trace to it.
- **Schema system opens up**: top-level `notes:` surfaced verbatim on every
  instruction surface; per-artifact `instructions/<id>.md` files beside the
  schema; schemas inherit through `references:` (project → referenced stores
  → user → package); `structure:` in config declares folder purposes,
  surfaced in `context` and the references index.
- **Removed**: the initiatives folder convention, stages, evergreen files,
  `list --initiatives`, and the initiatives skill. The `initiative` noun
  returns to retired vocabulary; legacy metadata stays readable.

## Capabilities

### New Capabilities
- `upstream-links`: the serves link, downstream rollup, and upstream context block
- `schema-openness`: notes, instruction files, inheritance through references, structure declarations

## Impact

- CLI: `new change --serves`, `list --downstream`, `schemas --store` source labels
- Core: `src/core/upstream.ts` (new), artifact-graph resolver, project config, references index
- Docs: `docs/stores-beta/upstream-work.md`, agent contract JSON shapes
