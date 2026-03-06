## 為什麼
Cline 的實作在架構上是不正確的。根據Cline的官方文檔，Cline使用工作流程進行按需自動化，並使用規則進行行為指南。 OpenSpec 斜線指令是程序性工作流程（支架 → 實作 → 歸檔），而不是行為規則，因此應將它們放在 `.clinerules/workflows/` 而不是 `.clinerules/`.

## 有什麼變化
- 更新 ClineSlashCommandConfigurator 以使用 `.clinerules/workflows/` 路徑而不是 `.clinerules/` 路徑
- 更新所有測試以期望正確的工作流程文件位置
- 更新 README.md 文件以反映工作流程而不是規則
- **重大**：現有 Cline 使用者將需要重新執行 `openspec init` 取得更正後的工作流程文件

## 影響
- 受影響的規範：cli-init、cli-update（修正了 Cline 工作流程路徑）
- 受影響的代碼： `src/core/configurators/slash/cline.ts`，測試文件，README.md
- 修改後的文件： `.clinerules/workflows/openspec-*.md` （移自 `.clinerules/openspec-*.md`)
