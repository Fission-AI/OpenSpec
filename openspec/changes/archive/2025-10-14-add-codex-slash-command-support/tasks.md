## 1.CLI整合
- [x] 1.1 將 Codex 新增至初始化工具選擇器，並顯示文字以澄清全域提示 `.codex/prompts/` 目錄並透過檢查託管 Codex 提示檔案來實現「已設定」檢測。
- [x] 1.2 實施 `CodexSlashCommandConfigurator` 那寫著 `.codex/prompts/openspec-{proposal,apply,archive}.md`，確保提示目錄存在並將內容包裝在 OpenSpec 標記中。
//（不需要輔助指令）
- [x] 1.3 使用斜線命令註冊表註冊設定器，並在 init/update 連線中包含 Codex，以便這兩個命令在適當的時候呼叫新的設定器。

## 2. 提示模板
- [x] 2.1 擴充共享斜線指令範本（或增加 Codex 特定的包裝器）以注入編號佔位符（`$1`, `$2`, ...) 其中 Codex 需要使用者提供的參數。
- [x] 2.2 驗證產生的 Markdown 是否符合 Codex 的格式預期（無標題，標題優先佈局）並與參考螢幕截圖中顯示的問題分析器樣式相符。

## 3.更新支援和測試
- [x] 3.1 更新 `openspec update` 當檔案遺失時，流程會重新整理現有的 Codex 提示，而不會建立新的提示。
- [x] 3.2 增加整合覆蓋率，透過設定對臨時全域 Codex 提示目錄執行 init/update `CODEX_HOME`，斷言標記保存和冪等更新。
- [x] 3.3 在README和CHANGELOG中記錄Codex的全域發現和自動安裝。
- [x] 3.3 確認錯誤處理面在CLI無法寫入Codex提示目錄時清除路徑（權限、缺少主目錄等）。

## 4. 文件
- [x] 4.1 在 README 和變更日誌以及其他助理整合中記錄 Codex 斜線命令支援。
- [x] 4.2 新增一個發行說明片段，將 Codex 使用者指向產生的 `/openspec-proposal`, `/openspec-apply`， 和 `/openspec-archive` commands.
