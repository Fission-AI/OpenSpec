## 1.CLI初始化支援
- [x] 1.1 原生工具選擇器中的表面反重力（互動式+ `--tools`）因此它可以與其他 IDE 一起切換。
- [x] 1.2 生成 `.agent/workflows/openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md` YAML frontmatter 僅限於單一 `description` 每個階段的欄位並以 OpenSpec 標記包裹正文。
- [x] 1.3 確認工作區鷹架涵蓋了缺少的目錄建立和重新執行場景，以便重複 init 重新整理託管區塊。

## 2.CLI更新支援
- [x] 2.1 偵測現有反重力工作流程文件 `openspec update` 並僅重新整理託管主體，在文件遺失時跳過建立。
- [x] 2.2 確保更新邏輯保留 `description` frontmatter 區塊與 init 編寫的完全相同，包括大小寫和間距，並與其他工具一起重新整理正文模板。

## 3. 模板和測試
- [x] 3.1 為 Antigravity 新增共享範本條目，重複使用 Windsurf 副本但目標 `.agent/workflows` 加上僅描述的 frontmatter 要求。
- [x] 3.2 擴充自動覆蓋範圍（單元或整合），驗證 init 和 update 產生反重力的預期檔案路徑和 frontmatter + body 標記。
