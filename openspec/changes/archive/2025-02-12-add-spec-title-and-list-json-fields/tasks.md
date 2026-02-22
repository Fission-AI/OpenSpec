## 1. Schema and parser

- [x] 1.1 Add required `title` field to Spec type in `src/core/schemas/spec.schema.ts`
- [x] 1.2 In `markdown-parser.parseSpec()`, extract first level-1 heading and set `title`; fallback to `name` when H1 is missing or unparseable
- [x] 1.3 Add `title` to any fixtures or mocks that construct a Spec (grep for SpecSchema.safeParse / parseSpec / Spec construction)

## 2. List command and --detail

- [x] 2.1 Add `--detail` option to list command (CLI flag and options type passed to list)
- [x] 2.2 In `src/core/list.ts` specs-mode JSON: when `options.json` and `options.detail` are true, include `title` and `overview` in each spec entry; when `--detail` is omitted, keep output shape unchanged (id, requirementCount only)

## 3. Deprecated spec command

- [x] 3.1 In `openspec spec show`: use `parsed.title` for the output title field instead of `parsed.name`
- [x] 3.2 In `openspec spec list` (and --long/--json): use `spec.title` for the displayed/list title instead of `spec.name`

## 4. Tests and verification

- [x] 4.1 Add or update parser tests: document with H1 → title set from heading; document without H1 → title equals name
- [x] 4.2 Add or update list tests: `openspec list --specs --json` output shape unchanged (id, requirementCount only); `openspec list --specs --json --detail` includes title and overview per spec
- [x] 4.3 Update or add tests for deprecated spec list/show to assert title comes from parsed title
- [x] 4.4 Run full test suite; manually run `openspec list --specs --json`, `openspec list --specs --json --detail`, `openspec spec show <id> --json`, and `openspec spec list --json` to confirm shapes and title/overview where applicable
