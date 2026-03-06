## 1. 遺留偵測與清理模組

- [x] 1.1 建立 `src/core/legacy-cleanup.ts` 具有針對所有遺留工件類型的偵測功能
- [x] 1.2 實施 `detectLegacyConfigFiles()` - 檢查帶有 OpenSpec 標記的設定檔
- [x] 1.3 實施 `detectLegacySlashCommands()` - 檢查舊的 `/openspec:*` 指令目錄
- [x] 1.4 實施 `detectLegacyStructureFiles()` - 檢查 AGENTS.md（為訊息傳遞單獨偵測的project.md）
- [x] 1.5 實施 `removeMarkerBlock()` - 透過手術從檔案中刪除 OpenSpec 標記塊
- [x] 1.6 實施 `cleanupLegacyArtifacts()` - 透過適當的邊緣情況處理來協調刪除（保留project.md）
- [x] 1.7 實作project.md的遷移提示輸出 - 顯示指導使用者遷移到config.yaml的訊息
- [x] 1.8 為遺留偵測和清理功能新增單元測試

## 2. 重寫Init指令

- [x] 2.1 更換 `src/core/init.ts` 使用實驗方法進行新的實現
- [x] 2.2 導入並使用動畫歡迎畫面 `src/ui/welcome-screen.ts`
- [x] 2.3 匯入並使用可搜尋的多選 `src/prompts/searchable-multi-select.ts`
- [x] 2.4 在初始化流程開始時整合遺留偵測
- [x] 2.5 新增遺留清理確認的 Y/N 提示
- [x] 2.6 利用現有技術生成技能 `skill-templates.ts`
- [x] 2.7 使用現有的生成斜線指令 `command-generation/` 適配器
- [x] 2.8 建立 `openspec/config.yaml` 使用預設模式
- [x] 2.9 更新成功輸出以符合新的工作流程（技能、/opsx:* 指令）
- [x] 2.10 添加 `--force` 在非互動模式下跳過遺留清理提示的標誌

## 3. 刪除遺留程式碼

- [x] 3.1 刪除 `src/core/configurators/` 目錄（ToolRegistry，所有設定生成器）
- [x] 3.2 刪除 `src/core/templates/slash-command-templates.ts`
- [x] 3.3 刪除 `src/core/templates/claude-template.ts`
- [x] 3.4 刪除 `src/core/templates/cline-template.ts`
- [x] 3.5 刪除 `src/core/templates/costrict-template.ts`
- [x] 3.6 刪除 `src/core/templates/agents-template.ts`
- [x] 3.7 刪除 `src/core/templates/agents-root-stub.ts`
- [x] 3.8 刪除 `src/core/templates/project-template.ts`
- [x] 3.9 刪除 `src/commands/experimental/` 目錄
- [x] 3.10 更新 `src/core/templates/index.ts` 刪除已刪除的匯出
- [x] 3.11 刪除已刪除模組的相關測試檔（wizard.ts）

## 4.更新CLI註冊

- [x] 4.1 更新 `src/cli/index.ts` 刪除 `registerArtifactWorkflowCommands()` 稱呼
- [x] 4.2 保留實驗子指令（狀態、指令、模式等）但直接註冊
- [x] 4.3 從保留的子指令中刪除「[實驗]」標籤
- [x] 4.4 添加隱藏 `experimental` 命令作為別名 `init`

## 5. 更新相關指令

- [x] 5.1 更新 `openspec update` 命令重新整理技能/命令而不是設定檔
- [x] 5.2 從更新中刪除設定檔重新整理邏輯
- [x] 5.3 新增技能重新整理邏輯進行更新

## 6. 測試與驗證

- [x] 6.1 為新的初始化流程新增整合測試（全新安裝）
- [x] 6.2 新增遺留檢測和清理的整合測試
- [x] 6.3 新增擴充模式的整合測試（重新執行init）
- [x] 6.4 測試非互動模式 `--tools` 旗幟
- [x] 6.5 測試 `--force` CI 環境的標誌
- [x] 6.6 驗證跨平台路徑處理（自始至終使用path.join）
- [x] 6.7 執行完整的測試套件並修復任何損壞的測試

## 7. 文檔和清理

- [x] 7.1 使用新的初始化行為更新 README（基於技能的工作流程是自記錄的）
- [x] 7.2 記錄發行說明的重大變更（在任務文件中）
- [x] 7.3 刪除對已刪除模組的任何孤立導入/引用（已驗證不存在）
- [x] 7.4 執行 linter 並修復任何問題（通過）
