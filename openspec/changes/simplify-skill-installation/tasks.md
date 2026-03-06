## 1. 全域設定擴展

- [x] 1.1 擴展 `src/core/global-config.ts` 架構與 `profile`, `delivery`， 和 `workflows` 領域
- [x] 1.2 為設定檔新增TypeScript類型（`core` | `custom`）， 送貨 （`both` | `skills` | `commands`）和工作流程（字串陣列）
- [x] 1.3 更新 `GlobalConfig` 介面和預設值（設定檔=`core`, 交貨=`both`)
- [x] 1.4 更新現有 `readGlobalConfig()` 使用預設值處理缺失的新字段
- [x] 1.5 新增模式演化測試（現有設定沒有新欄位）

## 2. 檔案系統

- [x] 2.1 建立 `src/core/profiles.ts` 具有設定檔定義（核心、自訂）
- [x] 2.2 定義 `CORE_WORKFLOWS` 持續的： `['propose', 'explore', 'apply', 'archive']`
- [x] 2.3 定義 `ALL_WORKFLOWS` 所有 11 個工作流程均維持不變
- [x] 2.4 添加 `COMMAND_IDS` 常數為 `src/core/shared/tool-detection.ts` （與現有 SKILL_NAMES 並行）
- [x] 2.5 實施 `getProfileWorkflows(profile, customWorkflows?)` 解析器函數
- [x] 2.6 新增設定檔解析測試

## 3. 設定檔命令（互動式選擇器）

- [x] 3.1 添加 `config profile` 子命令 `src/commands/config.ts`
- [x] 3.2 實作帶有交付選擇的互動式選擇器 UI（技能/命令/兩者）
- [x] 3.3 實作帶有工作流程切換的互動式選擇器 UI
- [x] 3.4 在選擇器中預選目前設定值
- [x] 3.5 確認後更新全域設定（僅設定，無檔案重新產生）
- [x] 3.6 顯示更新後訊息：「設定已更新。執行 `openspec update` 在您的專案中進行申請。 」
- [x] 3.7 偵測是否在 OpenSpec 專案內運作並提供自動執行更新
- [x] 3.8 實施 `config profile core` 預設快捷方式（保留傳送設定）
- [x] 3.9 處理非互動模式：有用訊息的錯誤
- [x] 3.10 更新 `openspec config list` 顯示設定檔、交付和工作流程設定（指示預設值與明確設定）
- [x] 3.11 新增設定檔命令和設定清單輸出的測試

## 4. 可用工具檢測

- [x] 4.1 建立 `src/core/available-tools.ts` （與現有的 `tool-detection.ts`)
- [x] 4.2 實施 `getAvailableTools(projectPath)` 掃描 AI 工具目錄（`.claude/`, `.cursor/`， ETC。 ）
- [x] 4.3 使用 `AI_TOOLS` 設定將目錄名稱對應到工具 ID
- [x] 4.4 新增可用工具偵測的測試，包括跨平台路徑

## 5. 提出工作流程模板

- [x] 5.1 建立 `src/core/templates/workflows/propose.ts`
- [x] 5.2 實作結合 new + ff 行為的技能模板
- [x] 5.3 確保提案建立 `.openspec.yaml` 透過 `openspec new change` 在生成工件之前
- [x] 5.4 將入門風格的解釋性輸出加入模板
- [x] 5.5 實現提議的命令模板
- [x] 5.6 匯出模板 `src/core/templates/skill-templates.ts`
- [x] 5.7 添加 `openspec-propose` 到 `SKILL_NAMES` 在 `src/core/shared/tool-detection.ts`
- [x] 5.8 添加 `propose` 命令模板 `src/core/shared/skill-generation.ts`
- [x] 5.9 添加 `propose` 到 `COMMAND_IDS` 在 `src/core/shared/tool-detection.ts`
- [x] 5.10 為提議範本新增測試（建立更改，產生工件，相當於 new + ff）

## 6. 條件技能/指令生成

- [x] 6.1 更新 `getSkillTemplates()` 接受設定檔過濾器參數
- [x] 6.2 更新 `getCommandTemplates()` 接受設定檔過濾器參數
- [x] 6.3 更新 `generateSkillsAndCommands()` 在 init.ts 中尊重交付設置
- [x] 6.4 新增當傳遞為「指令」時跳過技能產生的邏輯
- [x] 6.5 新增邏輯以在傳遞「技能」時跳過命令生成
- [x] 6.6 新增條件生成測試

## 7. 初始化流程更新

- [x] 7.1 更新init調用 `getAvailableTools()` 第一的
- [x] 7.2 更新 init 以讀取設定檔/交付預設值的全域設定
- [x] 7.3 在init中新增遷移檢查：呼叫shared `migrateIfNeeded()` 在設定檔解析之前
- [x] 7.4 變更工具選擇以顯示預先選取的偵測到的工具
- [x] 7.5 直接在init中套用設定的設定檔（無設定檔確認提示）
- [x] 7.6 更新成功訊息顯示 `/opsx:propose` 提示（僅當提議位於活動設定檔中時）
- [x] 7.7 添加 `--profile` 覆蓋全域設定的標誌
- [x] 7.8 更新非互動模式以使用預設值而不提示
- [x] 7.9 新增各種場景的初始化流程測試（包括重新初始化時的遷移和自訂設定檔行為）

## 8. 更新指令（設定檔支援+遷移）

- [x] 8.1 修改現有 `src/commands/update.ts` 讀取設定檔/交付/工作流程的全域設定
- [x] 8.2 實現共享 `scanInstalledWorkflows(projectPath, tools)` — 掃描工具目錄，僅匹配 `ALL_WORKFLOWS` 常數，跨工具返回聯合
- [x] 8.3 實現共享 `migrateIfNeeded(projectPath, tools)` — 兩者都使用的一次性遷移邏輯 `init` 和 `update`
- [x] 8.4 顯示遷移訊息：“已遷移：具有 N 個工作流程的自訂設定檔”+“此版本中的新增內容：/opsx:propose。嘗試‘openspec config profile core’以獲得簡化的體驗。”
- [x] 8.5 新增項目檢查：如果沒有則報錯退出 `openspec/` 目錄存在
- [x] 8.6 新增邏輯來偵測哪些工作流程在設定中但未安裝（待新增）
- [x] 8.7 新增邏輯來偵測哪些工作流程已安裝並且需要重新整理（更新）
- [x] 8.8 尊重交付設定：僅在以下情況產生技能： `skills`，僅命令如果 `commands`
- [x] 8.9 交付更改時刪除檔案：刪除指令 if `skills`，刪除技能，如果 `commands`
- [x] 8.10 為設定檔中缺少的工作流程產生新的工作流程文件
- [x] 8.11 顯示摘要：「已新增：X，Y」/「已更新：Z」/「已刪除：N 個檔案」/「已是最新的」。
- [x] 8.12 在輸出中列出受影響的工具：“工具：Claude代碼，遊標”
- [x] 8.13 偵測目前未設定的新工具目錄並顯示重新初始化的提示
- [x] 8.14 新增遷移場景測試（現有使用者、部分工作流程、多種工具、冪等、忽略自訂技能）
- [x] 8.15 新增更新指令與設定檔場景的測試（包括交付變更、專案外錯誤、新工具偵測）

## 9. 工具選擇UX修復

- [x] 9.1 更新 `src/prompts/searchable-multi-select.ts` 鍵綁定
- [x] 9.2 更改空間以切換選擇
- [x] 9.3 更改 Enter 確認選擇
- [x] 9.4 刪除 Tab 鍵確認行為
- [x] 9.5 新增提示文字“空格切換，回車確認”
- [x] 9.6 新增鍵綁定行為測試

## 10. 腳手架驗證

- [x] 10.1 驗證 `openspec new change` 創造 `.openspec.yaml` 具有架構和建立的字段

<!-- Note: 10.2 and 10.3 below are potential follow-up work, not core to this change -->
<!-- - [ ] 10.2 Update ff skill to verify `.openspec.yaml` exists after `openspec new change` -->
<!-- - [ ] 10.3 Add guardrail to skills: "Never manually create files in openspec/changes/ - use openspec new change" -->

## 11. 模板後續指導

- [x] 11.1 審核所有範本的硬編碼跨工作流程指令引用（例如， `/opsx:propose`)
- [x] 11.2 以概念為基礎的通用指導取代任何特定的命令參考（例如，「建立變更提案」）
- [x] 11.3 回顧探索→提出過渡使用者體驗（參見 `openspec/explorations/explore-workflow-ux.md` 對於開放式問題）

## 12. 整合和手動測試

- [x] 12.1 執行完整的測試套件並修復任何故障
- [x] 12.2 對 Windows 進行測試（或驗證 CI 在 Windows 上通過）
- [x] 12.3 測試端對端流程：init→propose→apply→archive
- [x] 12.4 更新CLI新指令的幫助文本
- [x] 12.5 手動：互動式初始化 - 驗證偵測到的工具是否已預先選擇，確認提示有效，成功訊息正確
- [x] 12.6 手冊： `openspec config profile` 選擇器 — 驗證交付切換、工作流程切換、目前值預選、核心預設捷徑
- [x] 12.7 手動：使用自訂設定檔進行初始化 — 在沒有設定檔確認提示的情況下驗證初始化是否繼續
- [x] 12.8 手冊：透過更新進行交付變更 - 驗證在技能/命令/兩者之間切換時刪除/建立正確的文件
- [x] 12.9 手冊：遷移流程 — 在設定中沒有設定檔的情況下對現有專案執行更新，驗證遷移訊息和產生的設定

## 13. 實施後強化（審核後續）

- [x] 13.1 確保 `update` 即使模板是最新的，也會將設定檔/交付偏差視為需要更新
- [x] 13.2 確保 `update` 將僅命令安裝識別為設定工具
- [x] 13.3 確保 `init` 驗證 `--profile` 無效覆寫的值和錯誤
- [x] 13.4 確保重新執行 `init` 應用傳遞清理（刪除與目前傳遞模式不符的檔案）
- [x] 13.5 新增/調整設定漂移同步、僅命令偵測、無效設定檔覆蓋範圍和重新初始化交付清理的回歸測試
