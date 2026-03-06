# 刪除 Diff 指令 - 任務

## 1. 刪除核心實現
- [x] 刪除 `/src/core/diff.ts`
- [x] 刪除 DiffCommand 匯入 `/src/cli/index.ts`
- [x] 從 CLI 中刪除 diff 指令註冊

## 2. 刪除規格
- [x] 刪除 `/openspec/specs/cli-diff/spec.md`
- [x] 如果需要，將規格存檔以供歷史參考

## 3. 更新依賴
- [x] 從 package.json 依賴項中刪除 jest-diff
- [x] 執行 pnpm install 更新鎖定文件

## 4. 更新文檔
- [x] 更新 main README.md 以刪除 diff 指令引用
- [x] 更新 openspec/README.md 以從命令清單中刪除 diff 命令
- [x] 如果 CLAUDE.md 範本提到 diff 指令，請更新它
- [x] 更新使用 diff 命令的任何範例工作流程

## 5.更新相關文件
- [x] 在以下位置搜尋並更新對“openspec diff”的任何剩餘引用：
  - 範本文件
  - 測試檔案（如果存在 diff 命令）
  - 存檔文檔
  - 變更提案

## 7. 測試
- [x] 確保移除後通過所有測試
- [x] 驗證 CLI 幫助文字不再顯示 diff 命令
- [x] 測試 show 指令是否提供足夠的替換功能

## 8. 替代工作流程的文檔
- [x] 記錄如何使用 `openspec show` 用於檢視更改
- [x] 記錄如何使用 git diff 進行檔案比較
- [x] 新增遷移指南以協助文字或文檔