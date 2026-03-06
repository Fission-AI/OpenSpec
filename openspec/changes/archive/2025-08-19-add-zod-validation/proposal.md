# 更改：新增 Zod 執行時驗證

## 為什麼

雖然spec和change指令可以輸出JSON，但它們目前除了基本結構檢查之外不執行嚴格的執行時間驗證。這可能會導致無效的規範或正在處理的變更、缺少必填欄位時的靜默失敗以及糟糕的錯誤訊息。

## 有什麼變化

- 增強現有 `spec validate` 和 `change validate` 具有嚴格 Zod 驗證的命令
- 向歸檔命令添加驗證，以確保更改在應用之前有效
- 向 diff 命令添加驗證以確保更改格式正確
- 提供JSON格式的詳細驗證報告
- 添加 `--strict` 出現警告時失敗的模式

## 影響

- **受影響的規範**：cli-spec、cli-change、cli-archive、cli-diff
- **受影響的代碼**：
  - src/commands/spec.ts（增強 validate 子指令）
  - src/commands/change.ts（增強 validate 子命令）
  - src/core/archive.ts（新增預存檔驗證）
  - src/core/diff.ts（新增驗證檢查）