## 1. 核心命令實現

- [x] 1.1 建立 `src/commands/artifact-workflow.ts` 與所有命令
- [x] 1.2 實施 `status` 帶有文字輸出的命令
- [x] 1.3 實施 `next` 帶有文字輸出的命令
- [x] 1.4 實施 `instructions` 帶有文字輸出的命令
- [x] 1.5 實施 `templates` 帶有文字輸出的命令
- [x] 1.6 實施 `new change` 使用 createChange() 的子命令

## 2.CLI註冊

- [x] 2.1 註冊 `status` 命令輸入 `src/cli/index.ts`
- [x] 2.2 註冊 `next` 命令輸入 `src/cli/index.ts`
- [x] 2.3 註冊 `instructions` 命令輸入 `src/cli/index.ts`
- [x] 2.4 註冊 `templates` 命令輸入 `src/cli/index.ts`
- [x] 2.5 註冊 `new` 命令組與 `change` 子命令

## 3. 輸出格式

- [x] 3.1 添加 `--json` 標記對所有命令的支援
- [x] 3.2 新增顏色編碼狀態指示器（完成/就緒/阻止）
- [x] 3.3 為載入操作新增進度微調器
- [x] 3.4 支援 `--no-color` 旗幟

## 4. 錯誤處理

- [x] 4.1 句柄缺失 `--change` 帶有有用錯誤的參數
- [x] 4.2 使用可用變更清單處理未知變更名稱
- [x] 4.3 使用有效選項處理未知工件名稱
- [x] 4.4 處理模式解析錯誤

## 5. 選項和標誌

- [x] 5.1 添加 `--schema` 自訂模式選擇的選項
- [x] 5.2 添加 `--description` 選項 `new change` 命令
- [x] 5.3 確保選項遵循現有的 CLI 模式

## 6. 測試

- [x] 6.1 為每個命令新增冒煙測試
- [x] 6.2 測試錯誤案例（缺少更改、未知工件）
- [x] 6.3 測試JSON輸出格式
- [x] 6.4 使用不同模式進行測試

## 7. 文檔

- [x] 7.1 為所有標記為「實驗」的指令加入幫助文本
- [ ] 7.2 使用新指令更新 AGENTS.md（存檔後）
