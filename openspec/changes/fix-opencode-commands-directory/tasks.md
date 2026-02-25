## 1. Adapter Fix

- [x] 1.1 Update `src/core/command-generation/adapters/opencode.ts`: change `path.join('.opencode', 'command', ...)` to `path.join('.opencode', 'commands', ...)` and update the JSDoc comment

## 2. Legacy Cleanup

- [x] 2.1 Update `src/core/legacy-cleanup.ts`: change the `'opencode'` entry in `LEGACY_SLASH_COMMAND_PATHS` from `'.opencode/command/openspec-*.md'` to `'.opencode/command/opsx-*.md'` to detect old singular-path artifacts with the current `opsx-*` prefix

## 3. Documentation

- [x] 3.1 Update `docs/supported-tools.md`: change OpenCode command path from `.opencode/command/opsx-<id>.md` to `.opencode/commands/opsx-<id>.md`

## 4. Tests

- [x] 4.1 Update `test/core/command-generation/adapters.test.ts`: change the OpenCode file path assertion from `path.join('.opencode', 'command', 'opsx-explore.md')` to `path.join('.opencode', 'commands', 'opsx-explore.md')`

## 5. Changeset

- [x] 5.1 Create a changeset file (`.changeset/fix-opencode-commands-directory.md`) with a patch bump describing the path fix
