# 實施任務

## 1.更新命令實現
- [x] 1.1 建立 `src/core/update.ts` 和 `UpdateCommand` 班級
- [x] 1.2 檢查是否 `openspec` 目錄存在（使用 `FileSystemUtils.directoryExists`)
- [x] 1.3 寫入 `readmeTemplate` 到 `openspec/README.md` 使用 `FileSystemUtils.writeFile`
- [x] 1.4 更新 `CLAUDE.md` 使用標記透過 `FileSystemUtils.updateFileWithMarkers` 和 `TemplateManager.getClaudeTemplate()`
- [x] 1.5 顯示ASCII安全成功訊息： `Updated OpenSpec instructions`

## 2.CLI整合
- [x] 2.1 註冊 `update` 命令輸入 `src/cli/index.ts`
- [x] 2.2 新增指令說明： `Update OpenSpec instruction files`
- [x] 2.3 處理錯誤 `ora().fail(...)` 和退出代碼 1（缺少 `openspec` 目錄、檔案寫入錯誤）

## 3. 測試
- [x] 3.1 驗證 `openspec/README.md` 已完全替換為最新模板
- [x] 3.2 驗證 `CLAUDE.md` OpenSpec 阻止更新而不更改標記之外的使用者內容
- [x] 3.3 驗證冪等性（執行兩次產生相同的文件，沒有重複的標記）
- [x] 3.4 驗證錯誤時 `openspec` 目錄遺失，並帶有友好訊息
- [x] 3.5 驗證成功訊息在僅 ASCII 的終端中正確顯示