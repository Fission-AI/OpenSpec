## 為什麼
Google正在推出 Antigravity，這是一款源自 Windsurf 的 IDE，可以發現來自 Windsurf 的工作流程 `.agent/workflows/*.md`。今天 OpenSpec 只能為 Windsurf 目錄建立斜線命令，因此 Antigravity 使用者無法從 IDE 執行提案/應用程式/歸檔流程。

## 有什麼變化
- 增加反重力作為可選的本機工具 `openspec init` 所以它創造了 `.agent/workflows/openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md` YAML frontmatter 僅包含 `description` 字段加上標準 OpenSpec 管理的主體。
- 確保 `openspec update` 重新整理內部任何現有反重力工作流程的主體 `.agent/workflows/` 不會建立遺失的文件，鏡像 Windsurf 行為。
- 共用 e2e/範本覆蓋範圍，確認生成器寫入正確的目錄、檔案名稱大小寫和 frontmatter 格式，以便 Antigravity 接管工作流程。

## 影響
- 受影響的規格： `specs/cli-init`, `specs/cli-update`
- 預期程式碼：CLI 初始化/更新工具登錄、斜線指令範本、相關測試
