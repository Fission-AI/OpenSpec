# 更新OpenSpec代理指令

## 為什麼

目前的 OpenSpec 代理指令需要更新，以遵循 AI 助理指令的最佳實踐（簡潔、清晰、消除歧義），確保 CLI 命令與實際實施保持同步，並正確記錄代理應遵循的三階段工作流程模式。

## 有什麼變化

### 核心結構改進
- **預先加載 3 階段工作流程**作為主要心智模型：
  1. 建立變更提案（proposal.md、spec deltas、design.md、tasks.md）
  2. 實施變更提案：
     - First read proposal.md to understand the change
     - Read design.md if it exists for technical context
     - Read tasks.md for the implementation checklist
     - Complete tasks one by one
     - Mark each task complete immediately after finishing
  3. Archiving the change proposal (using archive command after deployment)
- **將指令長度減少 50%**，同時保留所有關鍵訊息
- **重構並具有清晰的層次結構**：核心工作流程 → 快速啟動 → 命令 → 詳細資訊 → 邊緣案例

### 決策清晰度增強
- **為常見場景添加清晰的決策樹**（錯誤與功能、需要提案與不需要提案）
- **消除混淆代理決策的模糊條件**
- **新增「任何任務之前」清單**以收集上下文
- **新增「建立規格之前」規則** - 始終先檢查現有規格以避免重複

### CLI 文件更新
- **完整的命令文件** 包含所有當前功能：
  - `openspec init [path]` - 在專案中初始化OpenSpec
  - `openspec list` - 列出所有活動變更（預設）
  - `openspec list --specs` - 列出所有規格
  - `openspec show [item]` - 透過自動偵測顯示變化或規格
  - `openspec show` - 互動模式選擇
  - `openspec diff [change]` - 顯示變更的規格差異
  - `openspec validate [item]` - 驗證變更或規格
  - `openspec archive [change]` - 部署後存檔已完成的更改
  - `openspec update [path]` - 更新OpenSpec指令文件
- **記錄所有標誌和選項**：
  - `--json` 供程式設計使用的輸出格式
  - `--type change|spec` 為了消除歧義
  - `--skip-specs` 僅用於工具檔案
  - `--strict` 對於嚴格驗證模式
  - `--no-interactive` 禁用提示
- **刪除已棄用的命令引用**（名詞優先模式，例如 `openspec change show`)
- **為每個命令變體添加具體範例**
- **記錄調試命令**：
  - `openspec show [change] --json --deltas-only` 用於檢查三角洲
  - `openspec validate [change] --strict` 進行全面驗證

### 規範文件結構文檔
- **完整的規範文件範例**顯示正確的結構：
  ```markdown
  ## ADDED Requirements
  ### Requirement: Clear requirement statement
  The system SHALL provide the functionality...
  
  #### Scenario: Descriptive scenario name
  - **WHEN** condition occurs
  - **THEN** expected outcome
  - **AND** additional outcomes
  ```
- **場景格式要求**（關鍵 - 最常見的錯誤）：
  - 必須使用 `#### Scenario:` 標題（4 個主題標籤）
  - 不是項目符號列表或粗體文本
  - 每個需求必須至少有一個場景
- **增量檔案位置** - 清晰的解釋：
  - 規格文件進入 `changes/{name}/specs/` 目錄
  - 增量會自動從這些文件中提取
  - 使用操作前綴：ADDED、MODIFIED、REMOVED、RENAMED

### 故障排除部分
- **常見錯誤及解決方法**：
  - 「更改必須至少有一個增量」→ 檢查 specs/ 目錄是否存在 .md 文件
  - 「要求必須至少有一個場景」 → 檢查場景使用 `#### Scenario:` 格式
  - 靜默場景解析失敗 → 驗證確切的標頭格式
- **Delta檢測調試**：
  - 使用 `openspec show [change] --json --deltas-only` 檢查已解析的增量
  - 檢查規範文件是否具有操作前綴（## 新增要求）
  - 驗證規格/子目錄結構
- **驗證最佳實踐**：
  - 總是使用 `--strict` 全面檢查標誌
  - 使用 JSON 輸出進行偵錯： `--json | jq '.deltas'`

### 特定於代理的改進
- **實施工作流程** - 清晰的逐步流程：
  1. 閱讀proposal.md 以瞭解正在建置的內容
  2. 閱讀 design.md（如果存在）以獲取技術決策
  3. 閱讀tasks.md以取得實施清單
  4. 依序一項一項地落實任務
  5. 將每個任務標記為立即完成： `- [x] Task completed`
  6. 切勿跳過或批次完成任務
- **規格發現工作流程** - 在建立新規格之前始終檢查現有規格：
  - 使用 `openspec list --specs` 檢視所有當前規格
  - 建立前檢查能力是否已存在
  - 喜歡修改現有規範而不是建立重複項
- **工具選擇矩陣** - 何時使用 Grep、Glob 和 Read
- **錯誤恢復模式** - 如何處理常見故障
- **情境管理指南** - 開始任務前要閱讀的內容
- **驗證工作流程** - 如何確認更改正確

### 最佳實踐部分
- **簡潔扼要** - 適當時用一行答案
- **具體** - 使用準確的檔案路徑和行號 (file.ts:42)
- **從簡單開始** - 預設<100行，單一檔案實現
- **證明複雜性** - 任何最佳化都需要資料/指標

## 影響

- 受影響的規格：無（這是工具/文件變更）
- 受影響的代碼： 
  - `src/core/templates/claude-template.ts` - 更新 CLAUDE.md 模板
- 受影響的文檔：
  - `openspec/README.md` - 主要OpenSpec指令
  - CLAUDE.md 檔案生成 `openspec init` 命令

注意：這是工具/基礎設施的更改，不需要規格更新。歸檔時，使用 `openspec archive update-agent-instructions --skip-specs`.