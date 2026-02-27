# Design: Add Spec title and list JSON fields

## Context

The Spec type is defined in `src/core/schemas/spec.schema.ts` (name, overview, requirements, metadata). `MarkdownParser.parseSpec(name)` in `src/core/parsers/markdown-parser.ts` builds a Spec from spec.md: it requires `## Purpose` and `## Requirements`, maps Purpose content to `overview`, and passes through the `name` argument (spec id) as the spec’s `name`. The document’s first `# H1` is not currently parsed or stored. Multiple callers depend on the Spec shape: validation (SpecSchema.safeParse), list command (parseSpec for specs mode), view dashboard, deprecated spec show/list, and json-converter. Changing the schema or parser return shape can break any of these if not updated consistently.

## Goals / Non-Goals

**Goals:**

- Add a required `title` field to the Spec type, set from the first `# H1` in the spec document, with fallback to the spec id (`name`) when H1 is missing or unparseable.
- Keep `openspec list --specs --json` output unchanged (each item: `id`, `requirementCount` only). Add a `--detail` flag so that when used (e.g. `openspec list --specs --json --detail`), each spec entry additionally includes `title` and `overview`, enabling LLMs and scripts to optionally discover and select specs without reading each file.
- Ensure all existing callers of SpecSchema and `parseSpec()` are identified, updated if they construct or consume Spec, and verified so that existing behavior is preserved and new behavior is consistent.

**Non-Goals:**

- Adding a separate `summary` field (overview remains the description).
- Changing required sections (Purpose, Requirements) or validation rules beyond accommodating `title`.
- Frontmatter or other overrides for title in this change.

## Call-site audit (mandatory before implementation)

Before changing the schema or parser, every consumer of the Spec type or `parseSpec()` must be checked and updated as needed so that existing functionality is not broken.

| Location | Usage | Required change / check |
|----------|--------|---------------------------|
| `src/core/schemas/spec.schema.ts` | Defines Spec type | Add required `title: z.string().min(1, …)`. |
| `src/core/parsers/markdown-parser.ts` | `parseSpec(name): Spec` | Extract first level-1 heading; set `title` to that or `name`. Return `title` in the Spec object. |
| `src/core/validation/validator.ts` | `parser.parseSpec(specName)` then `SpecSchema.safeParse(spec)`; `applySpecRules(spec)` uses `spec.overview` | Parser will always return `title`. Validator only needs to pass through; confirm no code builds a Spec manually without `title`. |
| `src/core/list.ts` | `parser.parseSpec(id)`; uses `spec.requirements.length` for specs mode JSON | Default (no `--detail`): keep current shape (id, requirementCount only). When `options.json` and `options.detail` are both true, add `title: spec.title` and `overview: spec.overview` to each item in the `specs` array. CLI: add `--detail` option to list command. |
| `src/core/view.ts` | `parser.parseSpec(entry.name)`; uses `spec.requirements.length` | No change required for this change; optional later: show `spec.title` in dashboard. |
| `src/commands/spec.ts` | `parseSpecFromFile` → `parseSpec`; `show` uses `parsed.name` as `title`, `parsed.overview`; `list` uses `spec.name` as `title` | **show**: Use `parsed.title` for the output `title` field instead of `parsed.name`. **list**: Use `spec.title` instead of `spec.name` for the displayed/list title. |
| `src/core/converters/json-converter.ts` | `parser.parseSpec(specName)` then spreads `...spec` into JSON | No code change; once parser returns `title`, the converted JSON will include it. |

**Implementation order:** (1) Schema + parser (so every Spec has `title`), (2) list.ts (add `--detail` option and conditional title/overview in specs JSON), (3) spec.ts (deprecated show/list use `title`), (4) run tests and any code that constructs Spec or validates with SpecSchema to confirm no regressions.

## Decisions

1. **Title required in schema**  
   `title` is a required field so that every Spec is guaranteed to have a display name. The parser is the single place that sets it (H1 or fallback to name), so no caller has to handle missing title.

2. **H1 extraction in parser**  
   Reuse the existing section parse: the first top-level section with `level === 1` from `parseSections()` is the document title. Use its `title` property (the heading text). If there is no level-1 section, use the `name` argument. This avoids a separate first-line regex and keeps parsing in one place.

3. **List JSON: default unchanged; `--detail` adds title and overview**  
   Default `openspec list --specs --json` is unchanged: each element in `specs` has only `id` and `requirementCount`. When `--detail` is passed (e.g. `openspec list --specs --json --detail`), each element additionally includes `title` and `overview`. Use `overview` (not a new name like `purpose`) so the field name matches the Spec type and existing `openspec spec show --json` output.

4. **Deprecated spec list / show**  
   `openspec spec show --json` already outputs `title` and `overview`; switch the source of `title` from `parsed.name` to `parsed.title`. `openspec spec list` (and --long/--json) currently use `spec.name` as the display title; use `spec.title` so behavior aligns with the new model and with list --specs --json.

## Risks / Trade-offs

- **[Risk]** Existing tests or code that build a Spec object manually (e.g. mocks) may omit `title` and fail validation.  
  **Mitigation:** Grep for `Spec` construction and `SpecSchema.safeParse`/`parseSpec`; add `title` to any fixture or mock that returns a Spec.

- **[Risk]** Specs with no `# H1` (only `## Purpose`, etc.) will get `title = name`; that may be less readable than a proper H1.  
  **Mitigation:** Acceptable; conventions can recommend adding an H1. No change to required sections.

- **[Trade-off]** Parser does slightly more work (scan for first H1). Cost is one pass over already-parsed sections; negligible.

## Migration Plan

- No data migration. Existing spec.md files need no change; missing H1 is handled by fallback to name.
- After implementation: run full test suite; manually run `openspec list --specs --json` (confirm unchanged: id, requirementCount only), `openspec list --specs --json --detail` (confirm title and overview present), `openspec spec show <id> --json`, and `openspec spec list --json` to confirm shape and that title/overview appear as expected where applicable.

## Open Questions

- None for this change. Optional follow-up: document in openspec-conventions that the first `# H1` is the canonical display title and is used in list/APIs.
