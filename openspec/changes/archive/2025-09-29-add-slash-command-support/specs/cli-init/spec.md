## 新增要求
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
- **然後**建立 `.opencode/commands/openspec-proposal.md`, `.opencode/commands/openspec-apply.md`， 和 `.opencode/commands/openspec-archive.md`
- **並且** 從共用範本填充每個文件，以便命令文字與其他工具匹配
- **並且** 每個範本都包含相關 OpenSpec 工作流程階段的說明
