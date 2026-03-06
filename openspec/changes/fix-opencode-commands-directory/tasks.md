## 1. 適配器修復

- [x] 1.1 更新 `src/core/command-generation/adapters/opencode.ts`： 改變 `path.join('.opencode', 'command', ...)` 到 `path.join('.opencode', 'commands', ...)` 並更新 JSDoc 評論

## 2. 遺留清理

- [x] 2.1 更新 `src/core/legacy-cleanup.ts`: 更新一下 `'opencode'` 進入 `LEGACY_SLASH_COMMAND_PATHS` 檢測兩者 `opsx-*.md` 和 `openspec-*.md` 模式在 `.opencode/command/` 為了向後相容

## 3. 文件

- [x] 3.1 更新 `docs/supported-tools.md`：更改 OpenCode 命令路徑 `.opencode/command/opsx-<id>.md` 到 `.opencode/commands/opsx-<id>.md`

## 4. 測試

- [x] 4.1 更新 `test/core/command-generation/adapters.test.ts`：更改 OpenCode 檔案路徑斷言 `path.join('.opencode', 'command', 'opsx-explore.md')` 到 `path.join('.opencode', 'commands', 'opsx-explore.md')`

## 5. 變更集

- [x] 5.1 建立變更集檔案（`.changeset/fix-opencode-commands-directory.md`）帶有描述路徑修復的補丁凹凸
