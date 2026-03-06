## 1.CLI接線
- [x] 1.1 將Windsurf加入可選的AI工具中 `openspec init`，包括“已設定”檢測。
- [x] 1.2 註冊一個 `WindsurfSlashCommandConfigurator` 將工作流程寫入 `.windsurf/workflows/` 並確保該目錄存在。
- [x] 1.3 確保 `openspec update` 當選擇風時拉動 Windsurf 設定器並在檔案不存在時跳過建立。

## 2. 工作流程模板
- [x] 2.1 重複使用共享提案/應用程式/存檔正文，在 OpenSpec 標記之前新增 Windsurf 特定標題/描述。
- [x] 2.2 確認產生的 Markdown（每個檔案）保持在 Windsurf 文件中註明的 12k 字元上限以下。

## 3. 測試和保障措施
- [x] 3.1 擴展初始化測試以斷言建立 `.windsurf/workflows/openspec-*.md` 當選擇風帆衝浪時。
- [x] 3.2 擴展更新測試以斷言現有 Windsurf 工作流程已重新整理並且忽略不存在的文件。
- [x] 3.3 新增迴歸覆蓋以在 Windsurf 工作流程檔案中儲存標記。

## 4. 文件
- [x] 4.1 更新%README（以及任何面向使用者的文件）以在本機斜線/工作流程整合下列出 Windsurf。
- [x] 4.2 在發行說明或變更日誌（如果適用）中註明 Windsurf 工作流程支援。
