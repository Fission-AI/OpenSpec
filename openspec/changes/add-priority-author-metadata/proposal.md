## Why

`openspec list` shows every in-flight change with no way to tell which one matters most or who owns it. With several parallel changes, triaging what to pick up next means opening every `proposal.md`. Filed as [#1899](https://github.com/Fission-AI/OpenSpec/issues/1899).

## What Changes

- Add optional `priority` (`low` | `medium` | `high`) and `author` (string) fields to per-change metadata (`.openspec.yaml`), validated by `ChangeMetadataSchema`.
- `createChange` auto-populates `author` from `git config user.name` at `openspec new change` time when the caller doesn't pass one explicitly, and leaves it unset when git config has no name to offer.
- `openspec list` reads `.openspec.yaml` per change and shows `priority`/`author` as additional table columns, and includes them in `--json` output, whenever a change sets them. Changes that set neither render exactly as they do today.

## Capabilities

### Modified Capabilities
- `change-creation`: metadata schema gains optional `priority` (enum) and `author` (string) fields; change creation auto-populates `author` from git config when the caller omits it.
- `cli-list`: change list output (table and `--json`) gains optional priority/author columns.

## Impact

- `src/core/change-metadata/schema.ts` — new optional `priority`/`author` fields on `ChangeMetadataSchema`.
- `src/utils/change-utils.ts` / `src/commands/workflow/new-change.ts` — resolve `author` from `git config user.name` when not explicitly provided.
- `src/core/list.ts` — read `.openspec.yaml` per change, render the new columns, extend the JSON shape.
- No breaking changes: both fields are optional and existing changes/output are unaffected.
