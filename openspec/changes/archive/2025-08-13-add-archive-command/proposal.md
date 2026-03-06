## 為什麼
需要一個命令將已完成的變更存檔到存檔資料夾，並帶有適當的日期前綴，遵循 OpenSpec 約定。目前，必須手動移動和重新命名更改。

## 有什麼變化
- 新增新的 `archive` 命令CLI 將變更移至 `changes/archive/YYYY-MM-DD-[change-name]/`
- 歸檔前檢查未完成的任務並警告用戶
- 允許互動式選擇存檔更改
- 如果目標目錄已存在，則阻止歸檔
- 從變更的未來狀態規格中更新主要規格（複製自 `changes/[name]/specs/` 到 `openspec/specs/`)
- 在更新規格之前顯示確認提示，顯示將建立/更新哪些規格
- 支援 `--yes` 跳過自動化確認的標誌

## 影響
- 受影響的規範：cli-archive（新）
- 受影響的程式碼：src/cli/index.ts、src/core/archive.ts（新）