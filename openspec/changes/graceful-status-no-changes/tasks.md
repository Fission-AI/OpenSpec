## 1. 實施

- [x] 1.1 摘錄 `getAvailableChanges` 在 `shared.ts` 並用在 `statusCommand` 在致電之前檢查是否有更改 `validateChangeExists`
- [x] 1.2 文字模式下：列印 `No active changes. Create one with: openspec new change <name>` 並返回（出口 0）
- [x] 1.3 JSON模式下：輸出 `{"changes":[],"message":"No active changes."}` 並返回（出口 0）

## 2. 測試

- [x] 2.1 新增測試： `openspec status` 不做任何更改，優雅地退出，並顯示友好訊息（文字模式）
- [x] 2.2 新增測試： `openspec status --json` 沒有更改返回有效的 JSON，更改數組為空
- [x] 2.3 驗證現有行為： `openspec status` 沒有 `--change` 當更改存在時仍然拋出缺少選項錯誤
- [x] 2.4 驗證跨平台：測試使用 `path.join()` 對於任何路徑斷言

## 3. 發布

- [x] 3.1 新增描述修復的變更集
