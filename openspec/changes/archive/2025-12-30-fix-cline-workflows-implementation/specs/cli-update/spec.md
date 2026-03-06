# CLI 更新的增量

## 修改後的要求
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
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### Scenario: Updating slash commands for Cline
- **什麼時候** `.clinerules/workflows/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並且** 包括 Cline 特定的 Markdown 標題 frontmatter
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
