## 情境

`statusCommand` 在 `src/commands/workflow/status.ts` 來電 `validateChangeExists()` 從 `shared.ts` 作為其第一次手術。當沒有 `--change` 提供了選項並且不存在更改目錄， `validateChangeExists` 拋出： `No changes found. Create one with: openspec new change <name>`。此錯誤以致命 CLI 錯誤（非零退出代碼）向上傳播。

對於像這樣的命令來說，這是正確的行為 `apply` 和 `show` 需要進行更改才能進行操作。然而， `status` 是一個資訊命令 - 它應該報告當前狀態，即使該狀態是「不存在任何變更」。

當 AI 代理呼叫時，錯誤會在入職期間出現（問題 #714） `openspec status` 在建立任何更改之前。

## 目標/非目標

**目標：**
- 製作 `openspec status` 當不存在任何變更時，以代碼 0 退出並顯示友善訊息
- 對於無更改情況，支援文字和 JSON 輸出模式
- 保持所有其他命令的驗證行為不變

**非目標：**
- 改變行為 `validateChangeExists` （對所有消費者保持嚴格；僅提取其內部助手）
- 更改板載範本或技能說明
- 處理以下情況 `--change` 已提供，但具體更改不存在（這應該仍然是一個錯誤）

## 決定

### 提煉 `getAvailableChanges` 並在驗證前檢查

**基本原理**：提取私有 `getAvailableChanges` 關閉自 `validateChangeExists` 進入公共導出函數 `shared.ts`。然後，在 `statusCommand`， 稱呼 `getAvailableChanges` *前* `validateChangeExists` 儘早發現未發生變化的情況並妥善處理。這避免了使用 try/catch 進行控制流，並消除了與錯誤訊息字串的任何耦合。

**考慮的替代方案**：捕獲錯誤 `validateChangeExists` 透過匹配 `error.message.startsWith('No changes found')`。被拒絕是因為字串耦合很脆弱——如果錯誤訊息發生變化，catch 就會默默地停止工作。

**考慮的替代方案**：添加 `throwOnEmpty` 參數為 `validateChangeExists`。被拒絕是因為它增加了滿足單一消費者需求的共享功能的複雜性，並將使用者體驗問題混合到驗證實用程式中。

### 保持 `validateChangeExists` 嚴格的

**理由**： `validateChangeExists` 行為保持不變——它仍然會拋出所有錯誤情況。優雅的操控完全在於 `statusCommand`，這是使用者體驗決策的適當層。其他命令（`apply`, `show`, `instructions`）不受影響。

## 風險/權衡

- [風險] 沒有時讀取額外的檔案系統 `--change` 已提供並且更改*確實*存在（`getAvailableChanges` 首先被調用，然後 `validateChangeExists` 執行自己的讀取）→ 緩解措施： `statusCommand` 在到達之前提前返回 `validateChangeExists` 當不存在變更時，因此僅當存在變更時才會發生雙讀 - 最小開銷。
- [風險] 其他命令也可能在未來受益於優雅的無更改處理 → 緩解： `getAvailableChanges` 現在是公開的且可重用的，使得在其他地方應用相同的模式變得容易。
