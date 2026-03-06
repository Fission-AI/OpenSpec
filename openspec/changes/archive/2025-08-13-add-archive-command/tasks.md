# 實施任務

## 1. 核心實現
- [ ] 1.1 建立 `src/core/archive.ts` 與 ArchiveCommand 類
  - [ ] 1.1.1 實現變更選擇（如果沒有提供則互動式）
  - [ ] 1.1.2 從tasks.md實作不完整任務檢查
  - [ ] 1.1.3 實現未完成任務的確認提示
  - [ ] 1.1.4 實作規格更新功能
    - [ ] 1.1.4.1 Detect specs in change directory
    - [ ] 1.1.4.2 Compare with existing main specs
    - [ ] 1.1.4.3 Display summary of new vs updated specs
    - [ ] 1.1.4.4 Show confirmation prompt for spec updates
    - [ ] 1.1.4.5 Copy specs to main spec directory
  - [ ] 1.1.5 實施帶有日期前綴的歸檔移動
  - [ ] 1.1.6 支援 --yes 標誌跳過確認

## 2.CLI整合
- [ ] 2.1 新增歸檔指令 `src/cli/index.ts`
  - [ ] 2.1.1 導入存檔指令
  - [ ] 2.1.2 向指揮官註冊命令
  - [ ] 2.1.3 Add --yes/-y flag option
  - [ ] 2.1.4 加入適當的錯誤處理

## 3. 錯誤處理
- [ ] 3.1 Handle missing openspec/changes/ directory
- [ ] 3.2 Handle change not found
- [ ] 3.3 Handle archive target already exists
- [ ] 3.4 處理用戶取消

## 4. 測試
- [ ] 4.1 完全完成變更的測試
- [ ] 4.2 使用不完整的任務進行測試（顯示警告）
- [ ] 4.3 測試交互選擇模式
- [ ] 4.4 測試重複存檔預防
- [ ] 4.5 測試規格更新功能
  - [ ] 4.5.1 測試建立新規範
  - [ ] 4.5.2 測試更新現有規範
  - [ ] 4.5.3 測試確認提示顯示
  - [ ] 4.5.4 測試拒絕確認（不做任何更改）
  - [ ] 4.5.5 測試 --yes 標誌跳過確認

## 5. 建置和驗證
- [ ] 5.1 確保TypeScript編譯成功
- [ ] 5.2 Test command execution