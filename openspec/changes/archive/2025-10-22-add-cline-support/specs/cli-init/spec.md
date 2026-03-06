## 修改後的要求
### 要求：AI工具設定詳細信息

此指令應使用標記系統使用 OpenSpec 特定指令正確設定選定的 AI 工具。

#### 場景：設定Claude代碼

- **何時** 選擇 Claude 代碼
- **然後** 建立或更新 `CLAUDE.md` 在專案根目錄中（不在 openspec/ 內）
- **並且** 用一個短存根填滿託管區塊，該短存根指向隊友 `@/openspec/AGENTS.md`

#### 場景：設定CodeBuddy程式碼

- **何時** 選擇 CodeBuddy 程式碼
- **然後** 建立或更新 `CODEBUDDY.md` 在專案根目錄中（不在 openspec/ 內）
- **並且** 用一個短存根填滿託管區塊，該短存根指向隊友 `@/openspec/AGENTS.md`

#### 場景：設定Cline

- **何時** 選擇克萊恩
- **然後** 建立或更新 `CLINE.md` 在專案根目錄中（不在 openspec/ 內）
- **並且** 用一個短存根填滿託管區塊，該短存根指向隊友 `@/openspec/AGENTS.md`

#### 場景：建立新的 CLAUDE.md

- **何時** CLAUDE.md 不存在
- **然後** 使用標記中包含的存根指令建立新文件，以便完整的工作流程保留在 `openspec/AGENTS.md`:
```markdown
<!-- OPENSPEC:START -->
# OpenSpec Instructions

This project uses OpenSpec to manage AI assistant workflows.

- Full guidance lives in '@/openspec/AGENTS.md'.
- Keep this managed block so 'openspec update' can refresh the instructions.
<!-- OPENSPEC:END -->
```

### 要求：斜線命令設定
init 指令應使用共用範本為支援的編輯器產生斜線指令檔。

#### 場景：為 Claude 程式碼產生斜線指令
- **何時** 使用者在初始化期間選擇 Claude 程式碼
- **然後**建立 `.claude/commands/openspec/proposal.md`, `.claude/commands/openspec/apply.md`， 和 `.claude/commands/openspec/archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 CodeBuddy 程式碼產生斜杠命令
- **何時**使用者在初始化期間選擇 CodeBuddy 程式碼
- **然後**建立 `.codebuddy/commands/openspec/proposal.md`, `.codebuddy/commands/openspec/apply.md`， 和 `.codebuddy/commands/openspec/archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Cline 產生斜線指令
- **何時** 使用者在初始化期間選擇 Cline
- **然後**建立 `.clinerules/openspec-proposal.md`, `.clinerules/openspec-apply.md`， 和 `.clinerules/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 包括 Cline 特定的 Markdown 標題 frontmatter
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

#### 場景：為 Cursor 產生斜杠命令
- **何時**使用者在初始化期間選擇遊標
- **然後**建立 `.cursor/commands/openspec-proposal.md`, `.cursor/commands/openspec-apply.md`， 和 `.cursor/commands/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明

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

#### 場景：為 GitHub Copilot 產生斜線指令
- **何時** 使用者在初始化期間選擇 GitHub Copilot
- **然後**建立 `.github/prompts/openspec-proposal.prompt.md`, `.github/prompts/openspec-apply.prompt.md`， 和 `.github/prompts/openspec-archive.prompt.md`
- **並且** 使用包含 YAML frontmatter 的內容填充每個文件 `description` 總結工作流程階段的字段
- **和**包括 `$ARGUMENTS` 用於捕獲用戶輸入的佔位符
- **並且** 以 OpenSpec 標記包裹共用範本主體，以便 `openspec update` 可以重新整理內容
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明
