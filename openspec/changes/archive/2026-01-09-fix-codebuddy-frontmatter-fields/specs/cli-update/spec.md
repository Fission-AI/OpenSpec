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
- **然後** 使用共享 CodeBuddy 模板重新整理每個文件，其中包含 YAML frontmatter `description` 和 `argument-hint` 領域
- **AND** 使用方括號格式 `argument-hint` 參數（例如， `[change-id]`)
- **並** 保留 OpenSpec 託管標記之外的任何用戶自訂設置

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
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明