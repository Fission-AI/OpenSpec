# 更新命令規範

## 目的

作為使用 OpenSpec 的開發人員，我希望在新版本發佈時更新專案中的 OpenSpec 指令，以便我可以從 AI 代理指令的改進中受益。
## 要求
### 要求：更新行為
更新命令應以團隊友好的方式將 OpenSpec 指令檔更新為最新模板。

#### 場景：執行更新命令
- **何時** 使用者執行 `openspec update`
- **然後** 更換 `openspec/AGENTS.md` 與最新的模板
- **AND** 若根級存根 (`AGENTS.md`/`CLAUDE.md`) 存在，重新整理它以便它指向 `@/openspec/AGENTS.md`

### 要求：先決條件

在允許更新之前，該命令應需要現有的 OpenSpec 結構。

#### 場景：檢查先決條件

- **鑑於**該命令需要現有的 `openspec` 目錄（由建立 `openspec init`)
- **何時** `openspec` 目錄不存在
- **然後** 顯示錯誤：“未找到 OpenSpec 目錄。首先執行 'openspec init'。”
- **並且** 使用代碼 1 退出

### 要求：文件處理
更新命令應以可預測且安全的方式處理文件更新。

#### 場景：更新文件
- **何時**更新文件
- **然後** 完全替換 `openspec/AGENTS.md` 與最新的模板
- **並且** 如果存在根級存根，請更新託管區塊內容，以便它繼續引導隊友 `@/openspec/AGENTS.md`

### 要求：與工具無關的更新
更新命令應以可預測的方式重新整理 OpenSpec 託管文件，同時尊重每個團隊選擇的工具。

#### 場景：更新文件
- **何時**更新文件
- **然後** 完全替換 `openspec/AGENTS.md` 與最新的模板
- **和** 建立或重新整理根級別 `AGENTS.md` 使用託管標記區塊進行存根，即使該檔案之前不存在
- **且** 僅更新現有 AI 工具檔案中 OpenSpec 管理的部分，使用戶創作的內容保持不變
- **並且**避免建立新的本機工具設定檔（斜線指令、CLAUDE.md 等），除非它們已經存在

### 需求：核心檔案始終更新
更新命令應始終更新核心 OpenSpec 檔案並顯示 ASCII 安全性成功訊息。

#### 場景：更新成功
- **何時** 更新成功完成
- **然後** 更換 `openspec/AGENTS.md` 與最新的模板
- **並且** 如果存在根級存根，請重新整理它，以便它仍然引導貢獻者 `@/openspec/AGENTS.md`

### 需求：Slash 指令更新

更新命令應重新整理已設定工具的現有斜杠命令文件，而不建立新文件，並確保 OpenCode 存檔命令接受更改 ID 參數。

#### 場景：更新反重力的斜線指令
- **什麼時候** `.agent/workflows/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 重新整理每個文件的 OpenSpec 託管部分，以便工作流程副本與其他工具匹配，同時保留現有的單字段 `description` 頭條
- **並且** 在更新期間跳過建立任何丟失的工作流程文件，鏡像 Windsurf 和其他 IDE 的行為

#### 場景：更新 Claude 程式碼的斜線指令
- **什麼時候** `.claude/commands/openspec/` 包含 `proposal.md`, `apply.md`， 和 `archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新 CodeBuddy 程式碼的斜杠命令
- **什麼時候** `.codebuddy/commands/openspec/` 包含 `proposal.md`, `apply.md`， 和 `archive.md`
- **然後** 使用共享 CodeBuddy 模板重新整理每個文件，其中包含 YAML frontmatter `description` 和 `argument-hint` 領域
- **AND** 使用方括號格式 `argument-hint` 參數（例如， `[change-id]`)
- **並** 保留 OpenSpec 託管標記之外的任何用戶自訂設置

#### Scenario: Updating slash commands for Cline
- **什麼時候** `.clinerules/workflows/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並且** 包括 Cline 特定的 Markdown 標題 frontmatter
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新「繼續」的斜槓指令
- **什麼時候** `.continue/prompts/` 包含 `openspec-proposal.prompt`, `openspec-apply.prompt`， 和 `openspec-archive.prompt`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新 Crush 的斜線命令
- **什麼時候** `.crush/commands/` 包含 `openspec/proposal.md`, `openspec/apply.md`， 和 `openspec/archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並且** 包括特定於 Crush 的 Frontmatter 以及 OpenSpec 類別和標籤
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新遊標的斜杠指令
- **什麼時候** `.cursor/commands/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新 Factory Droid 的斜線指令
- **什麼時候** `.factory/commands/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共享 Factory 模板重新整理每個文件，其中包含 YAML frontmatter `description` 和 `argument-hint` 領域
- **並**確保模板主體保留 `$ARGUMENTS` 佔位符，以便使用者輸入不斷流入 droid
- **且** 僅更新 OpenSpec 託管標記內的內容，保持任何非託管註解不變
- **並且**在更新期間跳過建立丟失的文件

#### 場景：更新 OpenCode 的斜杠指令
- **什麼時候** `.opencode/command/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明
- **並且**確保存檔命令包括 `$ARGUMENTS` frontmatter 中的佔位符用於接受更改 ID 參數

#### 場景：更新 Windsurf 的斜線命令
- **什麼時候** `.windsurf/workflows/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用包含 OpenSpec 標記的共享模板重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明
- **並且** 跳過建立遺失的檔案（更新命令僅重新整理已存在的檔案）

#### 場景：更新 Kilo Code 的斜線指令
- **什麼時候** `.kilocode/workflows/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用包含 OpenSpec 標記的共享模板重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明
- **並且** 跳過建立遺失的檔案（更新命令僅重新整理已存在的檔案）

#### 場景：更新 Codex 的斜線指令
- **鑑於**全域 Codex 提示目錄包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **何時** 使用者執行 `openspec update`
- **然後** 使用共享斜杠命令模板（包括佔位符指導）重新整理每個文件
- **並** 保留 OpenSpec 標記區塊之外的所有非託管內容
- **並且** 當 Codex 提示文件遺失時跳過建立

#### 場景：更新 GitHub Copilot 的斜線指令
- **什麼時候** `.github/prompts/` 包含 `openspec-proposal.prompt.md`, `openspec-apply.prompt.md`， 和 `openspec-archive.prompt.md`
- **然後** 使用共享模板重新整理每個文件，同時保留 YAML frontmatter
- **並且** 僅更新標記之間的 OpenSpec 管理區塊
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新 Gemini CLI 的斜線指令
- **什麼時候** `.gemini/commands/openspec/` 包含 `proposal.toml`, `apply.toml`， 和 `archive.toml`
- **然後** 使用共用提案/應用程式/存檔範本重新整理每個文件的正文
- **AND** 僅替換之間的內容 `<!-- OPENSPEC:START -->` 和 `<!-- OPENSPEC:END -->` 內的標記 `prompt = """` 阻止 TOML 框架（`description`, `prompt`）保持完好無損
- **並且**跳過建立任何缺少的 `.toml` 更新期間的檔案；僅重新整理預先存在的 Gemini 命令

#### 場景：更新 iFlow CLI 的斜線指令
- **什麼時候** `.iflow/commands/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並且** 保留 YAML frontmatter `name`, `id`, `category`， 和 `description` 領域
- **並且** 僅更新標記之間的 OpenSpec 管理區塊
- **並**確保範本包含相關工作流程階段的說明

#### 場景：缺少斜線指令文件
- **當**工具缺少斜線指令檔時
- **那麼** 在更新期間不要建立新文件

### 需求：存檔命令參數支援
歸檔斜線命令範本應支援可選的變更 ID 參數，以支援以下工具： `$ARGUMENTS` placeholder.

#### 場景：帶有更改 ID 參數的存檔命令
- **何時** 用戶調用 `/openspec:archive <change-id>` 更改 ID
- **然後** 範本應指示 AI 驗證提供的變更 ID `openspec list`
- **並且** 使用提供的更改 ID 進行存檔（如果有效）
- **並且** 如果提供的更改 ID 與可存檔更改不匹配，則會快速失敗

#### 場景：不含參數的 Archive 指令（向後相容）
- **何時** 用戶調用 `/openspec:archive` 無需提供變更 ID
- **那麼** 範本應指示 AI 從上下文中或透過執行來識別更改 ID `openspec list`
- **並且** 繼續現有行為（保持向後相容性）

#### 場景：OpenCode 歸檔模板生成
- **何時** 產生 OpenCode 存檔斜線命令文件
- **然後** 包括 `$ARGUMENTS` 前面的佔位符
- **並且**將其包裝在一個清晰的結構中，例如 `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` 指示預期的參數
- **並且** 在範本正文中包含驗證步驟以檢查更改 ID 是否有效

## 邊緣情況

### 要求：錯誤處理

該命令應妥善處理邊緣情況。

#### 場景：檔案權限錯誤

- **何時** 文件寫入失敗
- **然後** 讓錯誤隨著檔案路徑自然地冒出來

#### 場景：AI 工具檔案遺失

- **何時** AI 工具設定檔不存在
- **然後** 跳過更新該文件
- **並且**不要建立它

#### 場景：自訂目錄名稱

- **何時** 考慮自訂目錄名稱
- **那麼** 此更改不支援
- **和** 預設目錄名稱 `openspec` 應使用

## 成功標準

用戶應該能夠：
- 使用單一指令更新OpenSpec指令
- 取得最新的AI代理指令
- 檢視更新的明確確認

更新過程應為：
- 簡單快速（無需版本檢查）
- 可預測（每次結果相同）
- 獨立（無需網路）
