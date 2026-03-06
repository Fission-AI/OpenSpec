## 為什麼

ArtifactGraph (Slice 1) 和InstructionLoader (Slice 3) 為基於工件的工作流程管理提供程式設計APIs。用戶目前沒有CLI介面：
- 檢視變更的工件完成狀態
- 發現可以建立哪些工件
- 取得建立工件的豐富說明
- 透過適當的驗證來建立新的更改

此提案新增 CLI 指令，向使用者和代理程式公開工件工作流程功能。

## 有什麼變化

- **新的**： `openspec status --change <id>` 顯示工件完成狀態
- **新的**： `openspec next --change <id>` 顯示準備建立的工件
- **新的**： `openspec instructions <artifact> --change <id>` 輸出豐富模板
- **新的**： `openspec templates [--schema <name>]` 顯示已解析的範本路徑
- **新的**： `openspec new change <name>` 建立一個新的更改目錄

所有指令都是流暢使用者體驗的頂級指令。它们与现有核心模块集成：
- 用途 `loadChangeContext()`, `formatChangeStatus()`, `generateInstructions()` 來自指令載入器
- 用途 `ArtifactGraph`, `detectCompleted()` 來自工件圖
- 用途 `createChange()`, `validateChangeName()` 來自變更實用程式

**實驗隔離**：所有命令都在單一檔案中實現（`src/commands/artifact-workflow.ts`）以便在該功能不起作用時輕鬆刪除。幫助文本將它們標記為實驗性的。

## 影響

- 受影響的規格：新 `cli-artifact-workflow` 能力
- 受影響的代碼：
  - `src/cli/index.ts` - 註冊新指令
  - `src/commands/artifact-workflow.ts` - 新的命令實施
- 現有命令或規範沒有變化
- 基於已完成的 Slice 1、2 和 3 實作構建
