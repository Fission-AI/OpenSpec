## 修改後的要求

### 需求：ToolCommandAdapter 介面

系統應定義一個 `ToolCommandAdapter` 每個工具格式化的介面。

#### 場景：Adapter介面結構

- **何時**實施工具適配器
- **然後** `ToolCommandAdapter` 應要求：
  - `toolId`：字串標識符匹配 `AIToolOption.value`
  - `getFilePath(commandId: string)`：傳回指令的檔案路徑（相對於專案根目錄，或全域範圍工具的絕對路徑，例如 Codex）
  - `formatFile(content: CommandContent)`：返回帶有 frontmatter 的完整文件內容

#### 場景：Claude 適配器格式化

- **何時** 格式化 Claude 代碼的命令
- **那麼** 適配器應輸出 YAML frontmatter `name`, `description`, `category`, `tags` 領域
- **並且**文件路徑應遵循模式 `.claude/commands/opsx/<id>.md`

#### 場景：遊標適配器格式化

- **何時** 格式化遊標指令
- **那麼** 適配器應輸出 YAML frontmatter `name` 作為 `/opsx-<id>`, `id`, `category`, `description` 領域
- **並且**文件路徑應遵循模式 `.cursor/commands/opsx-<id>.md`

#### 場景：Windsurf 適配器格式化

- **何時** 格式化 Windsurf 指令
- **那麼** 適配器應輸出 YAML frontmatter `name`, `description`, `category`, `tags` 領域
- **並且**文件路徑應遵循模式 `.windsurf/workflows/opsx-<id>.md`

#### 場景：OpenCode 適配器格式化

- **何時** 格式化 OpenCode 指令
- **那麼** 適配器應輸出 YAML frontmatter `description` 場地
- **並且**文件路徑應遵循模式 `.opencode/commands/opsx-<id>.md` 使用 `path.join('.opencode', 'commands', ...)` 為了跨平台相容性
- **並且** 適配器應轉換基於冒號的命令引用（`/opsx:name`) 到基於連字符的 (`/opsx-name`）在體內

## 新增要求

### 需求：重新命名的 OpenCode 指令目錄的舊版清理

遺留清理模組應檢測並刪除先前的單數中的舊 OpenCode 命令文件 `.opencode/command/` 目錄路徑。

#### 場景：偵測舊的單一路徑 OpenCode 命令文件

- **何時** 在檔案相符的專案上執行遺留工件偵測 `.opencode/command/opsx-*.md` 或者 `.opencode/command/openspec-*.md`
- **那麼**系統應透過以下方式將這些檔案包含在舊斜線命令檔案清單中 `LEGACY_SLASH_COMMAND_PATHS`
- **和** `LegacySlashCommandPattern.pattern` 應接受 `string | string[]` 每個工具支援多種全域模式

#### 場景：在 init 上清理舊的 OpenCode 命令文件

- **何時** 使用者執行 `openspec init` 在一個舊的項目中 `.opencode/command/` 文物
- **那麼**系統將刪除舊文件
- **並且**在以下位置產生新的命令文件 `.opencode/commands/`

#### 場景：在非互動模式下自動清理遺留工件

- **何時** 使用者執行 `openspec init` 在非互動模式下（例如，CI）並且偵測到遺留工件
- **那麼**系統將自動清理遺留工件，而不需要 `--force`
- **和** 舊斜線命令檔案（100% OpenSpec-託管）應被刪除
- **和** 設定檔清理應僅刪除 OpenSpec 標記（絕不刪除使用者檔案）
