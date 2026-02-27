## Why

`openspec list --specs --json` currently returns only `id` and `requirementCount` per spec. LLMs and scripts sometimes need a human-readable title and a short description (e.g. from the spec document) to discover and select relevant specs without opening each spec file. The spec document already has a top-level heading (`# H1`) and a Purpose section (`## Purpose`). We should (1) add a required `title` to the Spec model and (2) allow list JSON to optionally include `title` and `overview` via a new flag, without changing the default list output.

## What Changes

- **Spec schema**: Add a required `title` field to the Spec type. When parsing a spec, set `title` from the document's first `# H1`; when that is missing or unparseable, fall back to the spec id (`name`). No new `summary` field — keep using `overview` (## Purpose) for description.
- **Parser**: In `MarkdownParser.parseSpec()` (or the code that builds the Spec object), extract the first level-1 heading and assign it to `title`; otherwise use the passed-in `name`.
- **List JSON**: Keep `openspec list --specs --json` unchanged: each spec entry continues to have only `id` and `requirementCount`. Add a new `--detail` flag; when used with `--specs --json` (e.g. `openspec list --specs --json --detail`), include `title` and `overview` in each spec entry so tooling can optionally get display name and Purpose text.
- **Deprecated `spec list`**: Align with the new model: `openspec spec list --long` and its JSON output should use the parsed `title` (from H1 or name) so behavior is consistent.

## Capabilities

### New Capabilities

None. This change extends the existing spec model and list command only.

### Modified Capabilities

- **openspec-conventions**: Document that a spec's document title (first `# H1`) is the canonical display title and is exposed in list/APIs; when H1 is absent, the spec id is used. No change to required sections (Purpose, Requirements).
- **cli-list**: Extend the list command specification: (1) `openspec list --specs --json` remains unchanged (each item has `id`, `requirementCount` only). (2) Add a `--detail` option; when `openspec list --specs --json --detail` is used, each item in the `specs` array additionally includes `title` (string) and `overview` (string).

## Impact

- **Code**: `src/core/schemas/spec.schema.ts` (add required `title`), `src/core/parsers/markdown-parser.ts` (extract first H1, set title; fallback to name), `src/core/list.ts` (add `--detail`; when `--specs --json --detail`, include `title` and `overview` in each spec entry; default list --specs --json unchanged), `src/commands/spec.ts` (use parsed title in deprecated spec list when available).
- **Validation**: Ensure validators that construct or validate Spec objects supply `title`; existing specs without an explicit H1 will get `title = name` after the parser fallback.
- **Tests**: Update or add tests for parser (H1 → title, no H1 → name), list JSON without --detail (unchanged shape), list JSON with --detail (title, overview), and deprecated spec list output.
