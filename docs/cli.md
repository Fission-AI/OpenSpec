# CLI參考

OpenSpec CLI (`openspec`）提供專案設定、驗證、狀態檢查和管理的終端命令。這些命令補充了 AI 斜線命令（例如 `/opsx:propose`）記錄在 [命令](commands.md).

## 概括

| 類別 | 命令 | 目的 |
|----------|----------|---------|
| **設定** | `init`, `update` | 初始化並更新專案中的 OpenSpec |
| **瀏覽** | `list`, `view`, `show` | Explore changes and specs |
| **Validation** | `validate` | 檢查變更和規格是否有問題 |
| **生命週期** | `archive` | 完成已完成的更改 |
| **Workflow** | `status`, `instructions`, `templates`, `schemas` | 工件驅動的工作流程支援 |
| **模式** | `schema init`, `schema fork`, `schema validate`, `schema which` | 建立和管理自訂工作流程 |
| **設定** | `config` | 檢視和修改設定 |
| **公用事業** | `feedback`, `completion` | 回饋和 shell 集成 |

---

## 人類命令與代理命令

大多數 CLI 指令是為終端機中的**人類使用**而設計的。某些命令也透過 JSON 輸出支援**代理/腳本使用**。

### 僅限人類的命令

這些命令是互動式的，專為終端使用而設計：

| 命令 | 目的 |
|---------|---------|
| `openspec init` | 初始化項目（互動式提示） |
| `openspec view` | 互動式儀表板 |
| `openspec config edit` | 在編輯器中開啟設定 |
| `openspec feedback` | 透過GitHub提交回饋 |
| `openspec completion install` | 安裝 shell 補全 |

### 代理兼容指令

這些命令支援 `--json` 供 AI 代理程式和腳本程式設計使用的輸出：

| 命令 | 人類使用 | 代理使用 |
|---------|-----------|-----------|
| `openspec list` | 瀏覽變更/規格 | `--json` 對於結構化資料 |
| `openspec show <item>` | 閱讀內容 | `--json` 用於解析 |
| `openspec validate` | 檢查問題 | `--all --json` 用於批量驗證 |
| `openspec status` | 檢視工件進度 | `--json` 對於結構化狀態 |
| `openspec instructions` | 取得後續步驟 | `--json` 取得代理指示 |
| `openspec templates` | 尋找模板路徑 | `--json` 用於路徑解析 |
| `openspec schemas` | 列出可用模式 | `--json` 用於模式發現 |

---

## 全域選項

這些選項適用於所有命令：

| 選項 | 描述 |
|--------|-------------|
| `--version`, `-V` | 顯示版本號 |
| `--no-color` | 禁用顏色輸出 |
| `--help`, `-h` | 顯示命令的幫助 |

---

## 設定命令

### `openspec init`

在您的项目中初始化OpenSpec。建立資料夾結構並設定 AI 工具整合。

預設行為使用全域設定預設值：profile `core`， 送貨 `both`, 工作流程 `propose, explore, apply, archive`.

```
openspec init [path] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `path` | 不 | 目標目錄（預設：目前目錄） |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--tools <list>` | 以非互動方式設定 AI 工具。使用 `all`, `none`, 或逗號分隔的列表 |
| `--force` | 自動清理遺留文件而不提示 |
| `--profile <profile>` | 覆蓋此 init 執行的全域設定檔 (`core` 或者 `custom`) |

`--profile custom` 使用目前在全域設定中選擇的任何工作流程（`openspec config profile`).

**支援的工具 ID（`--tools`):** `amazon-q`, `antigravity`, `auggie`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `kilocode`, `kiro`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

**範例：**

```bash
# Interactive initialization
openspec init

# Initialize in a specific directory
openspec init ./my-project

# Non-interactive: configure for Claude and Cursor
openspec init --tools claude,cursor

# Configure for all supported tools
openspec init --tools all

# Override profile for this run
openspec init --profile core

# Skip prompts and auto-cleanup legacy files
openspec init --force
```

**它創造了什麼：**

```
openspec/
├── specs/              # Your specifications (source of truth)
├── changes/            # Proposed changes
└── config.yaml         # Project configuration

.claude/skills/         # Claude Code skills (if claude selected)
.cursor/skills/         # Cursor skills (if cursor selected)
.cursor/commands/       # Cursor OPSX commands (if delivery includes commands)
... (other tool configs)
```

---

### `openspec update`

升級CLI後更新OpenSpec指令檔。使用您目前的全域設定檔、選定的工作流程和交付模式重新產生 AI 工具設定檔。

```
openspec update [path] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `path` | 不 | 目標目錄（預設：目前目錄） |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--force` | 即使文件是最新的也強制更新 |

**範例：**

```bash
# Update instruction files after npm upgrade
npm update @fission-ai/openspec
openspec update
```

---

## 瀏覽命令

### `openspec list`

列出項目中的變更或規格。

```
openspec list [options]
```

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--specs` | 列出規格而不是更改 |
| `--changes` | 清單更改（預設） |
| `--sort <order>` | 排序方式 `recent` （預設）或 `name` |
| `--json` | 輸出為JSON |

**範例：**

```bash
# List all active changes
openspec list

# List all specs
openspec list --specs

# JSON output for scripts
openspec list --json
```

**輸出（文字）：**

```
Active changes:
  add-dark-mode     UI theme switching support
  fix-login-bug     Session timeout handling
```

---

### `openspec view`

顯示互動式儀表板以探索規格和變更。

```
openspec view
```

打開基於終端的介面，用於導航項目的規格和變更。

---

### `openspec show`

顯示變更或規格的詳細資訊。

```
openspec show [item-name] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `item-name` | 不 | 變更名稱或規格（如果省略則提示） |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--type <type>` | 指定類型： `change` 或者 `spec` （如果明確則自動檢測） |
| `--json` | 輸出為JSON |
| `--no-interactive` | 禁用提示 |

**更改特定選項：**

| 選項 | 描述 |
|--------|-------------|
| `--deltas-only` | 僅顯示增量規格（JSON 模式） |

**特定規格選項：**

| 選項 | 描述 |
|--------|-------------|
| `--requirements` | 僅顯示需求，排除場景（JSON模式） |
| `--no-scenarios` | 排除場景內容（JSON模式） |
| `-r, --requirement <id>` | 以從 1 開始的索引顯示具體要求（JSON 模式） |

**範例：**

```bash
# Interactive selection
openspec show

# Show a specific change
openspec show add-dark-mode

# Show a specific spec
openspec show auth --type spec

# JSON output for parsing
openspec show add-dark-mode --json
```

---

## 驗證命令

### `openspec validate`

驗證結構問題的變更和規格。

```
openspec validate [item-name] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `item-name` | 不 | 要驗證的特定項目（如果省略則提示） |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--all` | 驗證所有變更和規格 |
| `--changes` | 驗證所有更改 |
| `--specs` | 驗證所有規格 |
| `--type <type>` | 當名稱不明確時指定類型： `change` 或者 `spec` |
| `--strict` | 啟用嚴格驗證模式 |
| `--json` | 輸出為JSON |
| `--concurrency <n>` | 最大並行驗證數（預設值：6，或 `OPENSPEC_CONCURRENCY` 環境） |
| `--no-interactive` | 禁用提示 |

**範例：**

```bash
# Interactive validation
openspec validate

# Validate a specific change
openspec validate add-dark-mode

# Validate all changes
openspec validate --changes

# Validate everything with JSON output (for CI/scripts)
openspec validate --all --json

# Strict validation with increased parallelism
openspec validate --all --strict --concurrency 12
```

**輸出（文字）：**

```
Validating add-dark-mode...
  ✓ proposal.md valid
  ✓ specs/ui/spec.md valid
  ⚠ design.md: missing "Technical Approach" section

1 warning found
```

**輸出（JSON）：**

```json
{
  "version": "1.0.0",
  "results": {
    "changes": [
      {
        "name": "add-dark-mode",
        "valid": true,
        "warnings": ["design.md: missing 'Technical Approach' section"]
      }
    ]
  },
  "summary": {
    "total": 1,
    "valid": 1,
    "invalid": 0
  }
}
```

---

## 生命週期命令

### `openspec archive`

歸檔已完成的變更並將增量規格合併到主要規格中。

```
openspec archive [change-name] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 變更為存檔（如果省略則提示） |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `-y, --yes` | 跳過確認提示 |
| `--skip-specs` | 跳過規格更新（針對基礎設施/工具/僅文件變更） |
| `--no-validate` | 跳過驗證（需要確認） |

**範例：**

```bash
# Interactive archive
openspec archive

# Archive specific change
openspec archive add-dark-mode

# Archive without prompts (CI/scripts)
openspec archive add-dark-mode --yes

# Archive a tooling change that doesn't affect specs
openspec archive update-ci-config --skip-specs
```

**它的作用：**

1. 驗證更改（除非 `--no-validate`)
2. 提示確認（除非 `--yes`)
3. 將 delta 規格合併到 `openspec/specs/`
4. 將更改資料夾移至 `openspec/changes/archive/YYYY-MM-DD-<name>/`

---

## 工作流程指令

這些命令支援工件驅動的 OPSX 工作流程。它們對於人類檢查進度和代理確定後續步驟都很有用。

### `openspec status`

顯示變更的工件完成狀態。

```
openspec status [options]
```

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--change <id>` | 更改名稱（如果省略則提示） |
| `--schema <name>` | 架構覆蓋（從更改的設定自動偵測） |
| `--json` | 輸出為JSON |

**範例：**

```bash
# Interactive status check
openspec status

# Status for specific change
openspec status --change add-dark-mode

# JSON for agent use
openspec status --change add-dark-mode --json
```

**輸出（文字）：**

```
Change: add-dark-mode
Schema: spec-driven
Progress: 2/4 artifacts complete

[x] proposal
[ ] design
[x] specs
[-] tasks (blocked by: design)
```

**輸出（JSON）：**

```json
{
  "changeName": "add-dark-mode",
  "schemaName": "spec-driven",
  "isComplete": false,
  "applyRequires": ["tasks"],
  "artifacts": [
    {"id": "proposal", "outputPath": "proposal.md", "status": "done"},
    {"id": "design", "outputPath": "design.md", "status": "ready"},
    {"id": "specs", "outputPath": "specs/**/*.md", "status": "done"},
    {"id": "tasks", "outputPath": "tasks.md", "status": "blocked", "missingDeps": ["design"]}
  ]
}
```

---

### `openspec instructions`

取得有關建立工件或應用任務的豐富說明。人工智慧代理使用它來瞭解下一步要建立什麼。

```
openspec instructions [artifact] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `artifact` | 不 | 工件 ID： `proposal`, `specs`, `design`, `tasks`， 或者 `apply` |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--change <id>` | 更改名稱（非互動模式下需要） |
| `--schema <name>` | 架構覆蓋 |
| `--json` | 輸出為JSON |

**特殊情況：**使用 `apply` 作為獲取任務執行指令的神器。

**範例：**

```bash
# Get instructions for next artifact
openspec instructions --change add-dark-mode

# Get specific artifact instructions
openspec instructions design --change add-dark-mode

# Get apply/implementation instructions
openspec instructions apply --change add-dark-mode

# JSON for agent consumption
openspec instructions design --change add-dark-mode --json
```

**輸出包括：**

- 工件的模板內容
- 來自設定的項目上下文
- 來自依賴項的內容
- 設定中的每個工件規則

---

### `openspec templates`

顯示架構中所有工件的已解析範本路徑。

```
openspec templates [options]
```

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--schema <name>` | 要檢查的架構（預設： `spec-driven`) |
| `--json` | 輸出為JSON |

**範例：**

```bash
# Show template paths for default schema
openspec templates

# Show templates for custom schema
openspec templates --schema my-workflow

# JSON for programmatic use
openspec templates --json
```

**輸出（文字）：**

```
Schema: spec-driven

Templates:
  proposal  → ~/.openspec/schemas/spec-driven/templates/proposal.md
  specs     → ~/.openspec/schemas/spec-driven/templates/specs.md
  design    → ~/.openspec/schemas/spec-driven/templates/design.md
  tasks     → ~/.openspec/schemas/spec-driven/templates/tasks.md
```

---

### `openspec schemas`

列出可用的工作流程模式及其描述和工件流程。

```
openspec schemas [options]
```

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--json` | 輸出為JSON |

**範例：**

```bash
openspec schemas
```

**輸出：**

```
Available schemas:

  spec-driven (package)
    The default spec-driven development workflow
    Flow: proposal → specs → design → tasks

  my-custom (project)
    Custom workflow for this project
    Flow: research → proposal → tasks
```

---

## 架構命令

用於建立和管理自訂工作流程架構的命令。

### `openspec schema init`

建立一個新的專案本地架構。

```
openspec schema init <name> [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `name` | 是的 | 架構名稱（kebab-case） |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--description <text>` | 架構描述 |
| `--artifacts <list>` | 以逗號分隔的工件 ID（預設值： `proposal,specs,design,tasks`) |
| `--default` | 設定為專案預設架構 |
| `--no-default` | Don't prompt to set as default |
| `--force` | 覆蓋現有架構 |
| `--json` | 輸出為JSON |

**範例：**

```bash
# Interactive schema creation
openspec schema init research-first

# Non-interactive with specific artifacts
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**它創造了什麼：**

```
openspec/schemas/<name>/
├── schema.yaml           # Schema definition
└── templates/
    ├── proposal.md       # Template for each artifact
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `openspec schema fork`

將現有架構複製到您的專案中以進行自訂。

```
openspec schema fork <source> [name] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `source` | 是的 | 要複製的架構 |
| `name` | 不 | 新架構名稱（預設： `<source>-custom`) |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--force` | 涵蓋現有目的地 |
| `--json` | 輸出為JSON |

**範例：**

```bash
# Fork the built-in spec-driven schema
openspec schema fork spec-driven my-workflow
```

---

### `openspec schema validate`

驗證架構的結構和模板。

```
openspec schema validate [name] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `name` | 不 | Schema to validate (validates all if omitted) |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--verbose` | 顯示詳細的驗證步驟 |
| `--json` | 輸出為JSON |

**範例：**

```bash
# Validate a specific schema
openspec schema validate my-workflow

# Validate all schemas
openspec schema validate
```

---

### `openspec schema which`

顯示架構從何處解析（對於偵錯優先權很有用）。

```
openspec schema which [name] [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `name` | 不 | 模式名稱 |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--all` | 列出所有模式及其來源 |
| `--json` | 輸出為JSON |

**範例：**

```bash
# Check where a schema comes from
openspec schema which spec-driven
```

**輸出：**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@fission-ai/openspec/schemas/spec-driven
```

**架構優先權：**

1. 專案: `openspec/schemas/<name>/`
2. 用戶： `~/.local/share/openspec/schemas/<name>/`
3. 包：內建模式

---

## 設定命令

### `openspec config`

檢視和修改全域OpenSpec設定。

```
openspec config <subcommand> [options]
```

**子命令：**

| 子命令 | 描述 |
|------------|-------------|
| `path` | 顯示設定檔位置 |
| `list` | 顯示所有目前設定 |
| `get <key>` | 取得特定值 |
| `set <key> <value>` | 設定一個值 |
| `unset <key>` | 移除一把鑰匙 |
| `reset` | 重設為預設值 |
| `edit` | 打開於 `$EDITOR` |
| `profile [preset]` | 以互動方式或透過預設設定工作流程設定檔 |

**範例：**

```bash
# Show config file path
openspec config path

# List all settings
openspec config list

# Get a specific value
openspec config get telemetry.enabled

# Set a value
openspec config set telemetry.enabled false

# Set a string value explicitly
openspec config set user.name "My Name" --string

# Remove a custom setting
openspec config unset user.name

# Reset all configuration
openspec config reset --all --yes

# Edit config in your editor
openspec config edit

# Configure profile with action-based wizard
openspec config profile

# Fast preset: switch workflows to core (keeps delivery mode)
openspec config profile core
```

`openspec config profile` 從目前狀態摘要開始，然後讓您選擇：
- 改變交付+工作流程
- 僅更改交付
- 僅更改工作流程
- 保留目前設定（退出）

如果保留目前設置，則不會寫入任何更改，也不會顯示更新提示。
如果沒有設定更改，但當前專案檔案與您的全域設定檔/交付不同步，OpenSpec 將顯示警告並建議執行 `openspec update`.
緊迫 `Ctrl+C` 也乾淨地取消流程（無堆疊追蹤）並使用程式碼退出 `130`.
在工作流程清單中， `[x]` 表示在全域設定中選擇工作流程。若要將這些選擇套用到專案文件，請執行 `openspec update` （或選擇 `Apply changes to this project now?` 當項目內出現提示時）。

**互動範例：**

```bash
# Delivery-only update
openspec config profile
# choose: Change delivery only
# choose delivery: Skills only

# Workflows-only update
openspec config profile
# choose: Change workflows only
# toggle workflows in the checklist, then confirm
```

---

## 實用命令

### `openspec feedback`

提交關於OpenSpec的回饋。建立 GitHub 問題。

```
openspec feedback <message> [options]
```

**參數：**

| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `message` | 是的 | 回饋留言 |

**選項：**

| 選項 | 描述 |
|--------|-------------|
| `--body <text>` | 詳細說明 |

**要求：** GitHub CLI (`gh`) 必須安裝並經過身份驗證。

**範例：**

```bash
openspec feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `openspec completion`

管理 OpenSpec CLI 的 shell 完成情況。

```
openspec completion <subcommand> [shell]
```

**子命令：**

| 子命令 | 描述 |
|------------|-------------|
| `generate [shell]` | 將完成腳本輸出到 stdout |
| `install [shell]` | 為您的 shell 安裝完成 |
| `uninstall [shell]` | 刪除已安裝的完成項 |

**支援的外殼：** `bash`, `zsh`, `fish`, `powershell`

**範例：**

```bash
# Install completions (auto-detects shell)
openspec completion install

# Install for specific shell
openspec completion install zsh

# Generate script for manual installation
openspec completion generate bash > ~/.bash_completion.d/openspec

# Uninstall
openspec completion uninstall
```

---

## 退出代碼

| 程式碼 | 意義 |
|------|---------|
| `0` | 成功 |
| `1` | 錯誤（驗證失敗、檔案遺失等） |

---

## 環境變數

| 多變的 | 描述 |
|----------|-------------|
| `OPENSPEC_CONCURRENCY` | 批次驗證的預設並發數（預設值：6） |
| `EDITOR` 或者 `VISUAL` | 編輯為 `openspec config edit` |
| `NO_COLOR` | 設定後禁用顏色輸出 |

---

## 相關文件

- [命令](commands.md) - AI斜線指令（`/opsx:propose`, `/opsx:apply`， ETC。 ）
- [工作流程](workflows.md) - 常見模式以及何時使用每個命令
- [客製化](customization.md) - 建立自訂架構和模板
- [入門](getting-started.md) - 首次設定指南
