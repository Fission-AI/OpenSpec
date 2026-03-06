## 修改後的要求

### 要求：斜線命令設定

init 指令應使用共用範本為支援的編輯器產生斜線指令檔。

#### 場景：為反重力產生斜線指令
- **何時**使用者在初始化期間選擇反重力
- **然後**建立 `.agent/workflows/openspec-proposal.md`, `.agent/workflows/openspec-apply.md`， 和 `.agent/workflows/openspec-archive.md`
- **並且**確保每個檔案以 YAML frontmatter 開頭，僅包含 `description: <stage summary>` 欄位後面跟著包含在託管標記中的共用 OpenSpec 工作流程說明
- **並且** 使用與其他工具相同的提案/應用/存檔指南填充工作流程主體，以便反重力在指向 `.agent/workflows/` 目錄

#### 場景：為 Claude 程式碼產生斜線指令
- **何時** 使用者在初始化期間選擇 Claude 程式碼
- **然後**建立 `.claude/commands/openspec/proposal.md`, `.claude/commands/openspec/apply.md`， 和 `.claude/commands/openspec/archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 CodeBuddy 程式碼產生斜杠命令
- **何時**使用者在初始化期間選擇 CodeBuddy 程式碼
- **然後**建立 `.codebuddy/commands/openspec/proposal.md`, `.codebuddy/commands/openspec/apply.md`， 和 `.codebuddy/commands/openspec/archive.md`
- **並且** 從共享模板填充每個文件，其中包含與 CodeBuddy 相容的 YAML frontmatter `description` 和 `argument-hint` 領域
- **AND** 使用方括號格式 `argument-hint` 參數（例如， `[change-id]`)
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Cline 產生斜線指令
- **何時** 使用者在初始化期間選擇 Cline
- **然後**建立 `.clinerules/workflows/openspec-proposal.md`, `.clinerules/workflows/openspec-apply.md`， 和 `.clinerules/workflows/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 包括 Cline 特定的 Markdown 標題 frontmatter
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Crush 產生斜線命令
- **何時** 使用者在初始化期間選擇 Crush
- **然後**建立 `.crush/commands/openspec/proposal.md`, `.crush/commands/openspec/apply.md`， 和 `.crush/commands/openspec/archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 包括特定於 Crush 的 Frontmatter 以及 OpenSpec 類別和標籤
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Cursor 產生斜杠命令
- **何時**使用者在初始化期間選擇遊標
- **然後**建立 `.cursor/commands/openspec-proposal.md`, `.cursor/commands/openspec-apply.md`， 和 `.cursor/commands/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Factory Droid 產生斜線指令
- **何時** 用戶在初始化期間選擇 Factory Droid
- **然後**建立 `.factory/commands/openspec-proposal.md`, `.factory/commands/openspec-apply.md`， 和 `.factory/commands/openspec-archive.md`
- **並且** 從共享模板填充每個文件，其中包含與工廠相容的 YAML frontmatter `description` 和 `argument-hint` 領域
- **並且**包括 `$ARGUMENTS` 範本主體中的佔位符，以便 droid 接收任何使用者提供的輸入
- **並且** 將產生的內容包裝在 OpenSpec 託管標記中，以便 `openspec update` 可以安全地重新整理命令

#### 場景：為 OpenCode 產生斜杠指令
- **何時** 使用者在初始化期間選擇 OpenCode
- **然後**建立 `.opencode/commands/openspec-proposal.md`, `.opencode/commands/openspec-apply.md`， 和 `.opencode/commands/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Windsurf 產生斜線命令
- **何時** 使用者在初始化期間選擇 Windsurf
- **然後**建立 `.windsurf/workflows/openspec-proposal.md`, `.windsurf/workflows/openspec-apply.md`， 和 `.windsurf/workflows/openspec-archive.md`
- **並且** 從共用範本填入每個檔案（以 OpenSpec 標記包裹），以便工作流程文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Kilo Code 產生斜線指令
- **何時** 使用者在初始化期間選擇 Kilo Code
- **然後**建立 `.kilocode/workflows/openspec-proposal.md`, `.kilocode/workflows/openspec-apply.md`， 和 `.kilocode/workflows/openspec-archive.md`
- **並且** 從共用範本填入每個檔案（以 OpenSpec 標記包裹），以便工作流程文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Codex 產生斜線指令
- **何時** 使用者在初始化期間選擇 Codex
- **然後** 建立全域提示文件 `~/.codex/prompts/openspec-proposal.md`, `~/.codex/prompts/openspec-apply.md`， 和 `~/.codex/prompts/openspec-archive.md` （或根據 `$CODEX_HOME/prompts` 如果設定）
- **並且** 從映射第一個編號佔位符的共用範本填入每個檔案（`$1`）到主要使用者輸入（例如，更改標識符或問題文字）
- **並且** 將產生的內容包裝在 OpenSpec 標記中，以便 `openspec update` 可以重新整理提示而不觸及周圍的自訂註釋