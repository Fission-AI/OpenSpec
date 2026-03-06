# 實施任務

## 1.更新OpenCode設定器
- [x] 1.1 添加 `$ARGUMENTS` OpenCode 存檔 frontmatter 的佔位符（與提案模式相符）
- [x] 1.2 格式化為 `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` 或為了清晰起見類似的結構
- [x] 1.3 確保 `updateExisting` 重寫存檔 frontmatter/body 以便 `$ARGUMENTS` 之後持續存在 `openspec update`

## 2. 更新斜線指令模板
- [x] 2.1 修改存檔步驟以驗證透過提供的變更 ID 參數 `$ARGUMENTS`
- [x] 2.2 保持向後相容性 - 如果沒有提供參數，則允許從上下文推斷
- [x] 2.3 新增步驟以驗證更改 ID 是否存在 `openspec list` 歸檔前

## 3. 更新文檔
- [x] 3.1 Update AGENTS.md archive examples to show argument usage
- [x] 3.2 OpenCode現在支援的文檔 `/openspec:archive <change-id>`
