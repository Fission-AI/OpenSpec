## 為什麼

這 `artifact-experimental-setup` 命令目前將技能輸出路徑硬編碼為 `.claude/skills` 和 `.claude/commands/opsx`。這可以防止其他 AI 編碼工具（Cursor、Windsurf、Codex 等）的使用者使用 OpenSpec 的技能產生。我們需要支援人工智慧編碼助理的多樣化生態系統，每個助手都有自己的技能/指令檔案位置和命令前沿格式約定。

## 有什麼變化

- 添加 `skillsDir` 現有的路徑設定 `AIToolOption` 接口在 `config.ts`
- 新增必填項 `--tool <tool-id>` 標誌到 `artifact-experimental-setup` 命令
- 使用策略/適配器模式建立通用命令產生系統：
  - `CommandContent`：與工具無關的命令資料（id、名稱、描述、正文）
  - `ToolCommandAdapter`：每個工具格式化（檔案路徑、frontmatter 格式）
  - `CommandGenerator`：使用內容+適配器協調生成
- 為了清晰起見，需要明確的工具選擇（無預設值）

## 能力

### 新功能

- `ai-tool-paths`：將 AI 工具 ID 對應到其專案本地技能目錄路徑的設定
- `command-generation`：通用命令產生系統，帶有用於格式化差異的工具適配器

### 修改後的功能

- `cli-artifact-workflow`：新增 `--tool` 用於設定提供者選擇命令的標誌

## 影響

- **修改的檔案**：
  - `src/core/config.ts` - 延長 `AIToolOption` 與介面 `skillsDir` 場地
  - `src/commands/artifact-workflow.ts` - 添加 `--tool` 標誌，使用提供者路徑和適配器
- **新文件**：
  - `src/core/command-generation/types.ts` - CommandContent、ToolCommandAdapter 介面
  - `src/core/command-generation/generator.ts` - 通用命令產生器
  - `src/core/command-generation/adapters/*.ts` - 每個工具適配器
- **向後相容性**：現有工作流程不受影響 - 這是一個新的命令設定功能
- **面向使用者**：必需 `--tool` 標誌開啟 `artifact-experimental-setup` command for explicit tool selection
