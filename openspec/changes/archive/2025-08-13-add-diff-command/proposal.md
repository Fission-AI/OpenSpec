# 將 Diff 指令加入 OpenSpec CLI

## 為什麼

開發人員需要輕鬆檢視提議的規範變更與當前規範之間的差異，而無需手動比較文件。

## 有什麼變化

- 添加 `openspec diff [change-name]` 顯示更改規格和當前規格之間差異的命令
- 比較文件 `changes/[change-name]/specs/` 以及相應的文件 `specs/`
- 顯示統一差異輸出，顯示新增/刪除/修改的行
- 支援彩色輸出以提高可讀性

## 影響

- 受影響的規格：新功能 `cli-diff` 將被添加
- 受影響的代碼：
  - `src/cli/index.ts` - 新增 diff 指令
  - `src/core/diff.ts` - 具有差異邏輯的新檔案（約 80 行）