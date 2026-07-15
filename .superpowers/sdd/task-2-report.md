## Task 2 Report

### RED evidence

- Updated root/store expectations first from `openspec/changes/archive` to sibling `openspec/archive`.
- Focused RED command:
  `.\node_modules\.bin\vitest.cmd run test/core/openspec-root.test.ts test/core/root-selection.test.ts test/core/init.test.ts test/commands/store.test.ts test/commands/store-git.test.ts test/cli-e2e/store-lifecycle.test.ts`
- Initial RED result:
  `18 failed, 117 passed`
- Representative failures:
  - `test/core/root-selection.test.ts`: `archiveDir` still resolved to `openspec/changes/archive`
  - `test/core/init.test.ts`: init still created `openspec/changes/archive`
  - `test/commands/store-git.test.ts`: committed anchor still used `openspec/changes/archive/.gitkeep`
  - `test/core/openspec-root.test.ts`: sibling archive inspection/ledger expectations failed

### GREEN evidence

- Rebuilt CLI after production changes:
  `node build.js`
- Required focused GREEN command:
  `.\node_modules\.bin\vitest.cmd run test/core/openspec-root.test.ts test/core/root-selection.test.ts test/core/init.test.ts test/commands/store.test.ts test/commands/store-git.test.ts test/cli-e2e/store-lifecycle.test.ts`
- GREEN result:
  `6 passed, 135 passed`
- Additional directly affected root/store regression command:
  `.\node_modules\.bin\vitest.cmd run test/commands/store-root-selection.test.ts test/commands/store-remote.test.ts test/commands/declared-store-fallback.test.ts test/cli-e2e/capstone-journeys.test.ts`
- Additional GREEN result:
  `4 passed, 60 passed`
- Review follow-up command:
  `.\node_modules\.bin\vitest.cmd run test/utils/change-utils.test.ts test/core/openspec-root.test.ts`
- Review follow-up result:
  `2 passed, 35 passed`

### Changed files

- `src/core/init.ts`
- `src/core/openspec-root.ts`
- `src/core/root-selection.ts`
- `src/utils/change-utils.ts`
- `test/cli-e2e/capstone-journeys.test.ts`
- `test/cli-e2e/store-lifecycle.test.ts`
- `test/commands/declared-store-fallback.test.ts`
- `test/commands/store-git.test.ts`
- `test/commands/store-remote.test.ts`
- `test/commands/store-root-selection.test.ts`
- `test/commands/store.test.ts`
- `test/core/init.test.ts`
- `test/core/openspec-root.test.ts`
- `test/core/root-selection.test.ts`
- `test/helpers/openspec-fixtures.ts`
- `test/helpers/store-git.ts`
- `test/utils/change-utils.test.ts`

### Commit

- Original Task 2 commit hash: `fafc879`
- Integrated by controller as: `31393c8`

### Concerns

- None beyond the intentional non-migration rule: legacy nested `openspec/changes/archive` is neither deleted nor migrated by this task.
