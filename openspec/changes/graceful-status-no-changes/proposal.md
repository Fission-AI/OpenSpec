## 為什麼

什麼時候 `openspec status` 被調用時沒有 `--change` 且不存在任何變更（例如，在新初始化的項目上啟動期間），CLI 會引發致命錯誤： `No changes found. Create one with: openspec new change <name>`。這會破壞入職流程，因為人工智慧代理可能會調用 `openspec status` 在建立任何更改之前，導致代理停止或報告故障。修復 [#714](https://github.com/Fission-AI/OpenSpec/issues/714).

## 有什麼變化

- `openspec status` 當不存在任何更改時，將優雅退出（代碼 0）並顯示友好訊息，而不是拋出致命錯誤
- `openspec status --json` 當不存在任何更改時，將返回一個有效的 JSON 對象，其中包含一個空的更改數組
- 其他命令（`apply`, `show`等等）保留其當前嚴格的驗證行為

## 能力

### 新功能

- `graceful-status-empty`: 優雅的處理 `openspec status` 當不存在任何變更時，涵蓋文字和 JSON 輸出模式

### 修改後的功能

_沒有任何 - `validateChangeExists` 被內部重構以委託給新導出的 `getAvailableChanges`，但其行為和公共契約不變。其他消費者不受影響。 _

## 影響

- `src/commands/workflow/shared.ts` - 提煉 `getAvailableChanges` 作為公共函數（驗證行為不變）
- `src/commands/workflow/status.ts` — 在驗證之前檢查可用的更改，優雅地處理空案例
- 對狀態命令的測試需要涵蓋新的優雅行為
