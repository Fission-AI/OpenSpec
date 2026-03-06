## 1. 建立斜杠指令

- [x] 1.1 建立 `.claude/commands/opsx/archive.md` with skill definition
- [x] 1.2 新增YAML frontmatter（姓名、描述、類別、標籤）
- [x] 1.3 Implement change selection logic (prompt if not provided)
- [x] 1.4 使用以下方法實施工件完成檢查 `openspec status --json`
- [x] 1.5 實作任務完成檢查（解析tasks.md為 `- [ ]`)
- [x] 1.6 實作spec同步提示（檢查specs/目錄，提供 `/opsx:sync`)
- [x] 1.7 實施歸檔流程（移至 archive/YYYY-MM-DD-<name>/)
- [x] 1.8 新增成功/警告案例的輸出格式

## 2. 技能再生

- [x] 2.1 執行 `openspec artifact-experimental-setup` 恢復技能
- [x] 2.2 驗證技能出現在 `.claude/skills/` 目錄

## 3. 測試

- [x] 3.1 測試 `/opsx:archive` 進行了徹底的更改（所有工件，所有任務均已完成）
- [x] 3.2 測試 `/opsx:archive` 工件不完整（驗證顯示的警告）
- [x] 3.3 測試 `/opsx:archive` 任務未完成（驗證顯示的警告）
- [x] 3.4 測試 `/opsx:archive` 具有增量規格（驗證顯示的同步提示）
- [x] 3.5 測試 `/opsx:archive` 不更改名稱（驗證選擇提示）
