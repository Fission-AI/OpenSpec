## 1.CLI接線
- [x] 1.1 將 Kilo Code 加入選購的 AI 工具中 `openspec init`，包括“已設定”檢測和成功摘要。
- [x] 1.2 註冊一個 `KiloCodeSlashCommandConfigurator` 與其他斜杠命令工具一起。

## 2. 工作流程生成
- [x] 2.1 實作設定器以建立 `.kilocode/workflows/` （如果需要）並寫道 `openspec-{proposal,apply,archive}.md` 帶有 OpenSpec 標記。
- [x] 2.2 重複使用共享的斜線指令體，無需前置內容；驗證產生的檔案僅保留 Markdown，沒有額外的元資料。

## 3.更新支援
- [x] 3.1 確保 `openspec update` 重新整理現有的 Kilo Code 工作流程，同時跳過不存在的工作流程。
- [x] 3.2 新增迴歸覆蓋範圍，確認標記內容在更新期間被取代（不重複）。

## 4. 文件
- [x] 4.1 更新 README/docs 以記錄 Kilo Code 工作流程支援和路徑（`.kilocode/workflows/`).
- [x] 4.2 在變更日誌或發行說明中提及整合（如果適用）。
