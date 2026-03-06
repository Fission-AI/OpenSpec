## 修改後的要求
### 需求：AI工具設定
此指令應使用標記系統使用 OpenSpec 指令設定 AI 編碼助理。
#### 場景：提示選擇AI工具
- **何時** 交互執行
- **然後** 提示使用者「您使用哪些人工智慧工具？」使用多重選擇選單
- **並** 使用核取方塊列出每個可用工具：
  - Claude 程式碼（建立或重新整理 CLAUDE.md 和斜線指令）
  - 遊標（建立或重新整理 `.cursor/commands/*` 斜線指令）
  - OpenCode（建立或重新整理 `.opencode/command/openspec-*.md` 斜線指令）
  - Windsurf（建立或重新整理 `.windsurf/workflows/openspec-*.md` 工作流程）
  - Kilo 代碼（建立或重新整理 `.kilocode/workflows/openspec-*.md` 工作流程）
  - Codex（建立或重新整理全域提示 `~/.codex/prompts/openspec-*.md`)
  - AGENTS.md 標準（使用 OpenSpec 標記建立或重新整理 AGENTS.md）
- **並且** 在存在託管文件的工具旁邊顯示“（已設定）”，以便用戶瞭解選擇將重新整理內容
- **並且** 將禁用的工具視為“即將推出”並保持它們不可選擇
- **並且**允許在選擇一個或多個工具後按 Enter 進行確認

### 要求：斜線命令設定
init 指令應使用共用範本為支援的編輯器產生斜線指令檔。

#### 場景：為 Claude 程式碼產生斜線指令
- **何時** 使用者在初始化期間選擇 Claude 程式碼
- **然後**建立 `.claude/commands/openspec/proposal.md`, `.claude/commands/openspec/apply.md`， 和 `.claude/commands/openspec/archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Cursor 產生斜杠命令
- **何時**使用者在初始化期間選擇遊標
- **然後**建立 `.cursor/commands/openspec-proposal.md`, `.cursor/commands/openspec-apply.md`， 和 `.cursor/commands/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 OpenCode 產生斜杠指令
- **何時** 使用者在初始化期間選擇 OpenCode
- **然後**建立 `.opencode/command/openspec-proposal.md`, `.opencode/command/openspec-apply.md`， 和 `.opencode/command/openspec-archive.md`
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
