## Why

`openspec list --json` correctly returns structured JSON for active changes, but `openspec list --specs --json` still prints human-readable table output because the specs branch of the list command never checks the `--json` flag. Scripts and tooling that expect consistent JSON from list cannot use specs listing. Separately, there is no CLI way to list archived changes; users must inspect `openspec/changes/archive/` manually.

## What Changes

- **Specs mode with JSON**: When `openspec list --specs --json` is run, output a JSON object with a `specs` array (e.g. `{ "specs": [ { "id": "...", "requirementCount": n } ] }`) instead of the "Specs:" table. Empty state: `{ "specs": [] }` when no specs exist.
- **Archive mode**: Add a `--archive` flag to `openspec list` so that listing shows archived changes (directories under `openspec/changes/archive/`). Support the same `--sort` (recent | name) and `--json` options for archive mode. When `--json` is used with `--archive`, output e.g. `{ "archivedChanges": [ ... ] }` with fields consistent with active changes where applicable (name, lastModified, task counts if available).
- **Mode mutual exclusion**: Only one of default (changes), `--specs`, or `--archive` applies per run. Conflicting flags (e.g. `--specs` and `--archive`) can be rejected or resolved by a defined precedence.

## Capabilities

### New Capabilities

None. This change only extends the existing list command.

### Modified Capabilities

- **cli-list**: Extend the list command specification to require JSON output when `--json` is used in specs mode (output shape and empty state), and to add an archive listing mode when `--archive` is provided (source directory, output format, and interaction with `--sort` and `--json`).

## Impact

- **Code**: `src/core/list.ts` (specs branch: add JSON branch; new archive mode and JSON/sort handling), `src/cli/index.ts` (add `--archive` option and pass mode to ListCommand).
- **Spec**: `openspec/specs/cli-list/spec.md` (new/updated requirements and scenarios for JSON output in specs mode and for archive mode).
- **Tests**: Add or extend tests for `openspec list --specs --json` output shape and for `openspec list --archive` / `openspec list --archive --json` (and sort behavior as needed).
