## Why

`openspec instructions create|archive --json` now return the project's `change.create.before`, `change.archive.before`, and `change.archive.completed` actions, but the propose, new, archive, and bulk-archive skills do not act on them. Propose also reads `openspec/config.yaml` by hand for project context, which the CLI now returns.

## What Changes

- Propose and `/opsx:propose` read `openspec instructions create --json` instead of `openspec context --json` plus a hand-read of `config.yaml`. The CLI returns `root`, `context`, and optional `lifecycle` / `lifecycleError`.
- New and `/opsx:new` run the same create read as their project check, in place of `openspec list --json`. No extra CLI call.
- A CLI that predates `instructions create` returns JSON without `root`. Propose then falls back to `openspec context --json`, and new falls back to `openspec list --json`, both without lifecycle actions.
- Before creating the change, propose and new handle `lifecycle.before` once, or stop on `lifecycleError` without creating files.
- Archive and bulk-archive read `lifecycle` and `lifecycleError` from their existing `openspec instructions archive --json` read. A failed lookup still never blocks archiving.
- Archive handles `lifecycle.before` before syncing specs or moving the change, and `lifecycle.completed` after the move, whether or not specs were synced. `lifecycleError` stops before any sync or move.
- Bulk-archive does the same once per archived change. `lifecycleError` stops the whole batch before any sync or move.
- `openspec instructions create` reports a missing root (`root: null`, `no_openspec_root`) instead of resolving an implicit one, matching `openspec context`.

Out of scope: user docs, and the direct `openspec archive` command, which fires no hooks.

## Capabilities

### New Capabilities

- `opsx-propose-skill`: create inputs and the create checkpoint in propose.
- `opsx-new-skill`: create inputs and the create checkpoint in new.

### Modified Capabilities

- `opsx-archive-skill`: handle Archive lifecycle checkpoints.
- `opsx-bulk-archive-skill`: handle Archive lifecycle checkpoints per change.
- `lifecycle-actions`: `instructions create` reports a missing root.

## Impact

- Skills and commands: propose, new, archive, and bulk-archive templates, generated `skills/`, and parity hashes.
- CLI: `openspec instructions create` no longer resolves an implicit root.
- Projects without lifecycle triggers see the same or fewer tool calls.
