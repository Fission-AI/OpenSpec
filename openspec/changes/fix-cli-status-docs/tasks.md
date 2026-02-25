## 1. Fix Documentation Examples

- [x] 1.1 Update the text output example in `docs/cli.md` (lines ~437-448) to match actual `openspec status` format: `[x]`/`[ ]`/`[-]` indicators, `Change:`/`Schema:`/`Progress:` headers, `(blocked by: ...)` notation
- [x] 1.2 Update the JSON output example in `docs/cli.md` (lines ~452-464) to use correct field names: `changeName`, `schemaName`, `isComplete`, `applyRequires`, `artifacts` with `id`/`outputPath`/`status`/`missingDeps`

## 2. Validation

- [x] 2.1 Run `openspec status --change <name>` (text mode) and verify every line in the documented example matches the actual output format
- [x] 2.2 Run `openspec status --change <name> --json` and verify every field name and value format in the documented example matches the actual output

## 3. Changeset

- [x] 3.1 Create a changeset file (`.changeset/fix-cli-status-docs.md`) with a patch bump describing the documentation fix
