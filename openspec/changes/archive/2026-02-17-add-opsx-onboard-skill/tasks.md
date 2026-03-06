## 1.新增技能模板

- [x] 1.1 添加 `getOnboardSkillTemplate()` 功能為 `src/core/templates/skill-templates.ts` 包含涵蓋所有階段的完整入職指導文本（預檢、歡迎、任務選擇、探索演示、變更建立、提案、規格、設計、任務、應用、存檔、回顧）
- [x] 1.2 包含建議入門任務的程式碼庫分析說明（TODO/FIXME、缺少錯誤處理、缺少測試、類型：any、console.log、缺少驗證）
- [x] 1.3 包括敘述模式指令（按鍵轉換處的 EXPLAIN → DO → SHOW → PAUSE）
- [x] 1.4 包含範圍護欄指令，用於將使用者從過大的任務中重定向出來
- [x] 1.5 包含優雅的退出處理指令（使用者中途停止，使用者只想命令參考）

## 2.新增命令模板

- [x] 2.1 添加 `getOpsxOnboardCommandTemplate()` 功能為 `src/core/templates/skill-templates.ts` 傳回與技能相同指令內容的 CommandTemplate

## 3. 註冊模板

- [x] 3.1 增加板載技能 `getSkillTemplates()` 數組中 `src/core/shared/skill-generation.ts` 與目錄名 `openspec-onboard`
- [x] 3.2 新增板載指令 `getCommandTemplates()` 數組中 `src/core/shared/skill-generation.ts` 附身分證 `onboard`

## 4. 驗證

- [x] 4.1 執行 `pnpm run build` 確保 TypeScript 編譯
- [x] 4.2 透過執行測試技能生成 `openspec init` 在測試目錄中並驗證已建立板載技能/命令文件
