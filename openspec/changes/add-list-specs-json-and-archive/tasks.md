## 1. CLI and mode

- [x] 1.1 Add `--archive` option to `openspec list` in `src/cli/index.ts` and document in description/help
- [x] 1.2 Compute effective mode with precedence (archive > specs > changes) and pass mode `'changes' | 'specs' | 'archive'` to ListCommand

## 2. ListCommand: specs JSON

- [x] 2.1 In `src/core/list.ts` specs branch, when `options.json` is true, output `{ "specs": [ { "id", "requirementCount" } ] }` and return; output `{ "specs": [] }` when no specs

## 3. ListCommand: archive mode

- [x] 3.1 Extend ListCommand.execute mode type to `'changes' | 'specs' | 'archive'`
- [x] 3.2 Implement archive branch: scan `path.join(targetPath, 'openspec', 'changes', 'archive')` for direct child directories; reuse getTaskProgressForChange and getLastModified for each
- [x] 3.3 Apply --sort (recent | name) to archive list and output human-readable table when not --json
- [x] 3.4 When options.json in archive mode, output `{ "archivedChanges": [ ... ] }` with name, completedTasks, totalTasks, lastModified (ISO), status; empty list when archive missing or empty, exit 0

## 4. Spec and docs

- [x] 4.1 Update `openspec/specs/cli-list/spec.md` with new requirements and scenarios from this change delta (JSON for specs, --archive, precedence, empty archive)

## 5. Tests

- [x] 5.1 Add or extend tests for `openspec list --specs --json`: output shape, `specs` array elements have id and requirementCount, empty `{ "specs": [] }` when no specs
- [x] 5.2 Add tests for `openspec list --archive` and `openspec list --archive --json`: output shape, archivedChanges array, empty state; use path.join for expected paths in assertions
- [x] 5.3 Add test for mode precedence (e.g. --specs --archive results in archive list)
