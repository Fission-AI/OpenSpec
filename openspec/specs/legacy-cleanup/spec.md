# 遺留清理規範

## 目的
定義初始化和更新工作流程期間遺留 OpenSpec 工件的偵測和清理行為。

## 要求
### 需求：遺留工件檢測

系統應偵測先前 init 版本中遺留的 OpenSpec 工件。

#### 場景：偵測舊設定檔

- **何時**執行 `openspec init` 在現有項目上
- **那麼**系統應該檢查帶有OpenSpec標記的設定檔：
  - `CLAUDE.md`
  - `.cursorrules`
  - `.windsurfrules`
  - `.clinerules`
  - `.kilocode_rules`
  - `.github/copilot-instructions.md`
  - `.amazonq/instructions.md`
  - `CODEBUDDY.md`
  - `IFLOW.md`
  - 以及舊版 ToolRegistry 中的所有其他工具設定檔

#### 場景：偵測舊版斜線指令目錄

- **何時**執行 `openspec init` 在現有項目上
- **那麼**系統應該檢查舊的斜線指令目錄：
  - `.claude/commands/openspec/`
  - `.cursor/commands/openspec/` （註：使用舊格式 `openspec-*.md` 在命令根中）
  - `.windsurf/workflows/openspec-*.md`
  - 以及舊版 SlashCommandRegistry 中所有工具的等效目錄

#### 場景：偵測舊版 OpenSpec 結構文件

- **何時**執行 `openspec init` 在現有項目上
- **那麼**系統要檢查：
  - `openspec/AGENTS.md`
  - `openspec/project.md` （僅用於遷移訊息，不刪除）
  - 根 `AGENTS.md` 有 OpenSpec 標記

### 要求：遺留清理確認

系統應在刪除遺留工件之前提示確認。

#### 場景：偵測到舊版時提示清理

- **何時** 偵測到遺留工件
- **那麼**系統將顯示找到的內容
- **AND** 提示：“偵測到舊檔案。升級並清理嗎？[Y/n]”
- **並且** 如果使用者按 Enter 鍵，則預設為“是”

#### 場景：用戶確認清理

- **何時** 使用者回應 Y 或按 Enter 鍵
- **那麼**系統應刪除遺留工件
- **並** 繼續進行基於技能的設置

#### 場景：用戶拒絕清理

- **何時** 使用者回應 N
- **那麼**系統應中止初始化
- **和** 顯示建議手動清理或使用的訊息 `--force` 旗幟

#### 場景：非互動模式

- **何時** 執行 `--no-interactive` 或在CI環境中
- **並且** 偵測到遺留工件
- **那麼** 系統應以退出代碼 1 中止
- **和** 顯示偵測到的遺留工件
- **並且**建議互動式執行或使用 `--force` 旗幟

### 要求：透過手術刪除設定檔內容

從設定檔中刪除 OpenSpec 標記時，系統應保留使用者內容。

#### 場景：設定檔僅包含 OpenSpec 內容

- **何時** 設定檔僅包含 OpenSpec 標記區塊（外部空白是可以接受的）
- **那麼**系統應刪除 OpenSpec 標記區塊
- **並** 保留檔案（即使為空或僅包含空格）
- **且**不刪除該檔案（設定檔屬於使用者的專案根目錄）

#### 場景：具有混合內容的設定檔

- **何時**設定檔包含 OpenSpec 標記之外的內容
- **那麼**系統應僅刪除 `<!-- OPENSPEC:START -->` 到 `<!-- OPENSPEC:END -->` 堵塞
- **並且** 保留標記之前和之後的所有內容
- **並** 清理任何產生的雙空行

#### 場景：具有混合內容的 Root AGENTS.md

- **何時** 根 `AGENTS.md` 包含 OpenSpec 標記和其他內容
- **那麼**系統應只刪除 OpenSpec 標記區塊
- **並** 保留文件的其餘部分

### 需求：刪除舊目錄

系統應完全刪除舊的斜線指令目錄。

#### 場景：刪除舊的斜線指令目錄

- **何時** 存在舊斜線指令目錄（例如， `.claude/commands/openspec/`)
- **那麼**系統應刪除整個目錄及其內容
- **且**不刪除父目錄（例如， `.claude/commands/` 遺跡）

#### 場景：刪除舊版 AGENTS.md

- **什麼時候** `openspec/AGENTS.md` 存在
- **那麼**系統將刪除該文件
- **並且**不刪除 `openspec/` 目錄本身

### 需求：project.md 遷移提示

系統應保留project.md並顯示遷移提示而不是刪除它。

#### 場景：升級過程中project.md存在

- **什麼時候** `openspec/project.md` 遺留清理期間存在
- **那麼**系統不應刪除該文件
- **且**系統應在輸出中顯示遷移提示：
  ```
  Manual migration needed:
    → openspec/project.md still exists
      Move useful content to config.yaml's "context:" field, then delete
  ```

#### 場景：project.md 遷移原理

- **GIVEN** project.md 可能包含使用者編寫的專案文檔
- **和** config.yaml 的上下文欄位具有相同的目的（自動注入到工件中）
- **何時** 顯示遷移提示
- **那麼**使用者可以手動遷移或使用 `/opsx:explore` 獲得人工智慧幫助

### 要求：清理報告

系統應報告已清理的內容。

#### 場景：顯示計算摘要

- **何時** 遺留清理完成
- **然後**系統應顯示摘要部分：
  ```
  Cleaned up legacy files:
    ✓ Removed OpenSpec markers from CLAUDE.md
    ✓ Removed .claude/commands/openspec/ (replaced by /opsx:*)
    ✓ Removed openspec/AGENTS.md (no longer needed)
  ```
- **如果** `openspec/project.md` 存在
- **那麼**系統應顯示一個單獨的遷移部分：
  ```
  Manual migration needed:
    → openspec/project.md still exists
      Move useful content to config.yaml's "context:" field, then delete
  ```

#### 場景：未偵測到遺留

- **何時** 未發現遺留工件
- **那麼**系統不應顯示清理部分
- **並且**直接進行技能設置

