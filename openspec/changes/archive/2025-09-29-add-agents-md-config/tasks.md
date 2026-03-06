# 實施任務

## 1. 擴充初始化工作流程
- [x] 1.1 新增“AGENTS.md standard”選項 `openspec init` 工具選擇提示，尊重現有的 UI 約定。
- [x] 1.2 產生或重新整理根級別 `AGENTS.md` 選擇此選項時，使用 OpenSpec 標記建立文件，從規範範本中取得內容。

## 2. 增強更新指令
- [x] 2.1 確保 `openspec update` 寫根 `AGENTS.md` 從最新的模板（如果丟失則建立它）旁邊 `openspec/AGENTS.md`.
- [x] 2.2 更新成功訊息傳遞和日誌記錄以反映 AGENTS 標準檔案的建立與重新整理。

## 3. 共享模板處理
- [x] 3.1 如有必要，重構範本實用程序，以便兩個指令重複使用相同的內容。
- [x] 3.2 新增涵蓋現有項目和沒有現有項目的初始化/更新流程的自動化測試 `AGENTS.md`，確保標記行為正確。

## 4. 文件
- [x] 4.1 更新 CLI 規格和用戶導向的文件以描述 AGENTS 標準支援。
- [x] 4.2 Run `openspec validate add-agents-md-config --strict` 並記錄任何顯著的行為變化。
