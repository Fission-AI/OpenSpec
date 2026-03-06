# 實施任務

## 1. 核心實現
- [x] 1.1 建立 `src/core/list.ts` 具有列表邏輯
  - [x] 1.1.1 實現目錄掃描（不包括archive/）
  - [x] 1.1.2 從tasks.md檔案實現任務計數
  - [x] 1.1.3 將輸出格式化為簡單表格
- [x] 1.2 將list指令加入CLI中 `src/cli/index.ts`
  - [x] 1.2.1 註冊 `openspec list` 命令
  - [x] 1.2.2 連接list.ts實現

## 2. 錯誤處理
- [x] 2.1 處理遺失的 openspec/changes/ 目錄
- [x] 2.2 在沒有tasks.md檔案的情況下處理更改
- [x] 2.3 Handle empty changes directory

## 3. 測試
- [x] 3.1 新增清單功能測試
  - [x] 3.1.1 多次更改測試
  - [x] 3.1.2 已完成變更的測試
  - [x] 3.1.3 不做任何改動測試
  - [x] 3.1.4 測試錯誤條件

## 4. 文件
- [x] 4.1 使用 list 指令更新 CLI 幫助文本
- [x] 4.2 將清單指令加到README（如果適用）