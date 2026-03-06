## 1.更新ClineSlashCommandConfigurator
- [x] 更改 FILE_PATHS 中 `src/core/configurators/slash/cline.ts` 從 `.clinerules/openspec-*.md` 到 `.clinerules/workflows/openspec-*.md`

## 2. 更新測試
- [x] 更新「應該重新整理現有的 Cline 規則檔案」測試 `test/core/update.test.ts` 使用工作流程路徑
- [x] 更新「應該使用範本建立 Cline 規則檔案」測試 `test/core/init.test.ts` 使用工作流程路徑

## 3. 更新文檔
- [x] 更新 README.md 表以顯示「工作流程 `.clinerules/workflows/` 克萊恩的目錄”

## 4. 驗證更改
- [x] 確保所有測試都通過新路徑
- [x] 驗證更改是否遵循 OpenSpec 約定
