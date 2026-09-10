> **声明**：本文档由 AI 翻译，使用 `mimo-v2-pro` 进行翻译。

# CLI 参考

OpenSpec CLI (`openspec`) 提供了用于项目设置、验证、状态检查和管理的终端命令。这些命令是对 AI 斜杠命令（如 `/opsx:propose`）的补充，详见 [Commands](commands.md)。

## 概览

| 类别 | 命令 | 用途 |
|------|------|------|
| **初始化** | `init`、`update` | 在项目中初始化和更新 OpenSpec |
| **浏览** | `list`、`view`、`show` | 探索变更和规格 |
| **验证** | `validate` | 检查变更和规格的问题 |
| **生命周期** | `archive` | 完成变更的归档 |
| **工作流** | `status`、`instructions`、`templates`、`schemas` | 工件驱动的工作流支持 |
| **Schema** | `schema init`、`schema fork`、`schema validate`、`schema which` | 创建和管理工作流 |
| **配置** | `config` | 查看和修改设置 |
| **工具** | `feedback`、`completion` | 反馈和 Shell 集成 |

---

## 人工 vs 代理命令

大多数 CLI 命令设计为在终端中供**人工使用**。部分命令也通过 JSON 输出支持**代理/脚本使用**。

### 仅人工命令

这些命令是交互式的，专为终端使用设计：

| 命令 | 用途 |
|------|------|
| `openspec init` | 初始化项目（交互式提示） |
| `openspec view` | 交互式仪表盘 |
| `openspec config edit` | 在编辑器中打开配置 |
| `openspec feedback` | 通过 GitHub 提交反馈 |
| `openspec completion install` | 安装 Shell 补全 |

### 代理兼容命令

这些命令支持 `--json` 输出，供 AI 代理和脚本以编程方式使用：

| 命令 | 人工使用 | 代理使用 |
|------|----------|----------|
| `openspec list` | 浏览变更/规格 | `--json` 获取结构化数据 |
| `openspec show <item>` | 读取内容 | `--json` 用于解析 |
| `openspec validate` | 检查问题 | `--all --json` 用于批量验证 |
| `openspec status` | 查看工件进度 | `--json` 获取结构化状态 |
| `openspec instructions` | 获取下一步 | `--json` 获取代理指令 |
| `openspec templates` | 查找模板路径 | `--json` 用于路径解析 |
| `openspec schemas` | 列出可用 schema | `--json` 用于 schema 发现 |

---

## 全局选项

这些选项适用于所有命令：

| 选项 | 描述 |
|------|------|
| `--version`、`-V` | 显示版本号 |
| `--no-color` | 禁用彩色输出 |
| `--help`、`-h` | 显示命令帮助 |

---

## 初始化命令

### `openspec init`

在项目中初始化 OpenSpec。创建文件夹结构并配置 AI 工具集成。

默认行为使用全局配置默认值：profile `core`、delivery `both`、workflows `propose, explore, apply, archive`。

```
openspec init [path] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `path` | 否 | 目标目录（默认：当前目录） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--tools <list>` | 非交互式配置 AI 工具。使用 `all`、`none` 或逗号分隔的列表 |
| `--force` | 自动清理旧文件，不提示 |
| `--profile <profile>` | 为此初始化运行覆盖全局 profile（`core` 或 `custom`） |

`--profile custom` 使用全局配置中当前选定的工作流（`openspec config profile`）。

**支持的工具 ID（`--tools`）：** `amazon-q`、`antigravity`、`auggie`、`claude`、`cline`、`codex`、`codebuddy`、`continue`、`costrict`、`crush`、`cursor`、`factory`、`gemini`、`github-copilot`、`iflow`、`kilocode`、`kiro`、`opencode`、`pi`、`qoder`、`qwen`、`roocode`、`trae`、`windsurf`

**示例：**

```bash
# 交互式初始化
openspec init

# 在指定目录中初始化
openspec init ./my-project

# 非交互式：配置 Claude 和 Cursor
openspec init --tools claude,cursor

# 配置所有支持的工具
openspec init --tools all

# 覆盖本次运行的 profile
openspec init --profile core

# 跳过提示并自动清理旧文件
openspec init --force
```

**创建的内容：**

```
openspec/
├── specs/              # 规格说明（事实来源）
├── changes/            # 提议的变更
└── config.yaml         # 项目配置

.claude/skills/         # Claude Code skills（如果选择了 claude）
.cursor/skills/         # Cursor skills（如果选择了 cursor）
.cursor/commands/       # Cursor OPSX 命令（如果 delivery 包含 commands）
...（其他工具配置）
```

---

### `openspec update`

升级 CLI 后更新 OpenSpec 指令文件。使用当前全局 profile、选定的工作流和 delivery 模式重新生成 AI 工具配置文件。

```
openspec update [path] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `path` | 否 | 目标目录（默认：当前目录） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--force` | 即使文件是最新的也强制更新 |

**示例：**

```bash
# npm 升级后更新指令文件
npm update @fission-ai/openspec
openspec update
```

---

## 浏览命令

### `openspec list`

列出项目中的变更或规格。

```
openspec list [options]
```

**选项：**

| 选项 | 描述 |
|------|------|
| `--specs` | 列出规格而非变更 |
| `--changes` | 列出变更（默认） |
| `--sort <order>` | 按 `recent`（默认）或 `name` 排序 |
| `--json` | 输出为 JSON |

**示例：**

```bash
# 列出所有活跃变更
openspec list

# 列出所有规格
openspec list --specs

# 脚本使用的 JSON 输出
openspec list --json
```

**输出（文本）：**

```
Active changes:
  add-dark-mode     UI theme switching support
  fix-login-bug     Session timeout handling
```

---

### `openspec view`

显示用于浏览规格和变更的交互式仪表盘。

```
openspec view
```

打开终端界面，用于导航项目的规格说明和变更。

---

### `openspec show`

显示变更或规格的详细信息。

```
openspec show [item-name] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `item-name` | 否 | 变更或规格名称（省略时提示选择） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--type <type>` | 指定类型：`change` 或 `spec`（无歧义时自动检测） |
| `--json` | 输出为 JSON |
| `--no-interactive` | 禁用提示 |

**变更专用选项：**

| 选项 | 描述 |
|------|------|
| `--deltas-only` | 仅显示增量规格（JSON 模式） |

**规格专用选项：**

| 选项 | 描述 |
|------|------|
| `--requirements` | 仅显示需求，排除场景（JSON 模式） |
| `--no-scenarios` | 排除场景内容（JSON 模式） |
| `-r`、`--requirement <id>` | 按 1 起始索引显示特定需求（JSON 模式） |

**示例：**

```bash
# 交互式选择
openspec show

# 显示特定变更
openspec show add-dark-mode

# 显示特定规格
openspec show auth --type spec

# 用于解析的 JSON 输出
openspec show add-dark-mode --json
```

---

## 验证命令

### `openspec validate`

验证变更和规格的结构问题。

```
openspec validate [item-name] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `item-name` | 否 | 要验证的特定项目（省略时提示选择） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--all` | 验证所有变更和规格 |
| `--changes` | 验证所有变更 |
| `--specs` | 验证所有规格 |
| `--type <type>` | 名称有歧义时指定类型：`change` 或 `spec` |
| `--strict` | 启用严格验证模式 |
| `--json` | 输出为 JSON |
| `--concurrency <n>` | 最大并行验证数（默认：6，或 `OPENSPEC_CONCURRENCY` 环境变量） |
| `--no-interactive` | 禁用提示 |

**示例：**

```bash
# 交互式验证
openspec validate

# 验证特定变更
openspec validate add-dark-mode

# 验证所有变更
openspec validate --changes

# 验证所有内容并输出 JSON（用于 CI/脚本）
openspec validate --all --json

# 严格验证并增加并行度
openspec validate --all --strict --concurrency 12
```

**输出（文本）：**

```
Validating add-dark-mode...
  ✓ proposal.md valid
  ✓ specs/ui/spec.md valid
  ⚠ design.md: missing "Technical Approach" section

1 warning found
```

**输出（JSON）：**

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

## 生命周期命令

### `openspec archive`

归档已完成的变更并将增量规格合并到主规格中。

```
openspec archive [change-name] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `change-name` | 否 | 要归档的变更（省略时提示选择） |

**选项：**

| 选项 | 描述 |
|------|------|
| `-y`、`--yes` | 跳过确认提示 |
| `--skip-specs` | 跳过规格更新（用于基础设施/工具/仅文档变更） |
| `--no-validate` | 跳过验证（需要确认） |

**示例：**

```bash
# 交互式归档
openspec archive

# 归档特定变更
openspec archive add-dark-mode

# 无提示归档（CI/脚本）
openspec archive add-dark-mode --yes

# 归档不影响规格的工具变更
openspec archive update-ci-config --skip-specs
```

**功能说明：**

1. 验证变更（除非使用 `--no-validate`）
2. 提示确认（除非使用 `--yes`）
3. 将增量规格合并到 `openspec/specs/`
4. 将变更文件夹移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`

---

## 工作流命令

这些命令支持工件驱动的 OPSX 工作流。对于检查进度的人员和确定下一步的代理都非常有用。

### `openspec status`

显示变更的工件完成状态。

```
openspec status [options]
```

**选项：**

| 选项 | 描述 |
|------|------|
| `--change <id>` | 变更名称（省略时提示选择） |
| `--schema <name>` | Schema 覆盖（从变更的配置自动检测） |
| `--json` | 输出为 JSON |

**示例：**

```bash
# 交互式状态检查
openspec status

# 特定变更的状态
openspec status --change add-dark-mode

# 代理使用的 JSON
openspec status --change add-dark-mode --json
```

**输出（文本）：**

```
Change: add-dark-mode
Schema: spec-driven
Progress: 2/4 artifacts complete

[x] proposal
[ ] design
[x] specs
[-] tasks (blocked by: design)
```

**输出（JSON）：**

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

获取创建工件或应用任务的丰富指令。AI 代理使用此命令了解接下来要创建的内容。

```
openspec instructions [artifact] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `artifact` | 否 | 工件 ID：`proposal`、`specs`、`design`、`tasks` 或 `apply` |

**选项：**

| 选项 | 描述 |
|------|------|
| `--change <id>` | 变更名称（非交互模式下必需） |
| `--schema <name>` | Schema 覆盖 |
| `--json` | 输出为 JSON |

**特殊情况：** 使用 `apply` 作为工件以获取任务实施指令。

**示例：**

```bash
# 获取下一个工件的指令
openspec instructions --change add-dark-mode

# 获取特定工件的指令
openspec instructions design --change add-dark-mode

# 获取 apply/实施指令
openspec instructions apply --change add-dark-mode

# 代理消费的 JSON
openspec instructions design --change add-dark-mode --json
```

**输出包含：**

- 工件的模板内容
- 来自配置的项目上下文
- 依赖工件的内容
- 来自配置的每工件规则

---

### `openspec templates`

显示 schema 中所有工件的已解析模板路径。

```
openspec templates [options]
```

**选项：**

| 选项 | 描述 |
|------|------|
| `--schema <name>` | 要检查的 schema（默认：`spec-driven`） |
| `--json` | 输出为 JSON |

**示例：**

```bash
# 显示默认 schema 的模板路径
openspec templates

# 显示自定义 schema 的模板
openspec templates --schema my-workflow

# 编程使用的 JSON
openspec templates --json
```

**输出（文本）：**

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

列出可用的工作流 schema 及其描述和工件流程。

```
openspec schemas [options]
```

**选项：**

| 选项 | 描述 |
|------|------|
| `--json` | 输出为 JSON |

**示例：**

```bash
openspec schemas
```

**输出：**

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

## Schema 命令

用于创建和管理自定义工作流 schema 的命令。

### `openspec schema init`

创建新的项目本地 schema。

```
openspec schema init <name> [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `name` | 是 | Schema 名称（kebab-case） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--description <text>` | Schema 描述 |
| `--artifacts <list>` | 逗号分隔的工件 ID（默认：`proposal,specs,design,tasks`） |
| `--default` | 设置为项目默认 schema |
| `--no-default` | 不提示设置为默认 |
| `--force` | 覆盖已存在的 schema |
| `--json` | 输出为 JSON |

**示例：**

```bash
# 交互式 schema 创建
openspec schema init research-first

# 非交互式，指定工件
openspec schema init rapid \
  --description "快速迭代工作流" \
  --artifacts "proposal,tasks" \
  --default
```

**创建的内容：**

```
openspec/schemas/<name>/
├── schema.yaml           # Schema 定义
└── templates/
    ├── proposal.md       # 每个工件的模板
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `openspec schema fork`

复制现有 schema 到项目中进行自定义。

```
openspec schema fork <source> [name] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `source` | 是 | 要复制的 schema |
| `name` | 否 | 新 schema 名称（默认：`<source>-custom`） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--force` | 覆盖已存在的目标 |
| `--json` | 输出为 JSON |

**示例：**

```bash
# Fork 内置的 spec-driven schema
openspec schema fork spec-driven my-workflow
```

---

### `openspec schema validate`

验证 schema 的结构和模板。

```
openspec schema validate [name] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `name` | 否 | 要验证的 schema（省略时验证所有） |

**选项：**

| 选项 | 描述 |
|------|------|
| `--verbose` | 显示详细验证步骤 |
| `--json` | 输出为 JSON |

**示例：**

```bash
# 验证特定 schema
openspec schema validate my-workflow

# 验证所有 schema
openspec schema validate
```

---

### `openspec schema which`

显示 schema 的解析来源（对调试优先级很有用）。

```
openspec schema which [name] [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `name` | 否 | Schema 名称 |

**选项：**

| 选项 | 描述 |
|------|------|
| `--all` | 列出所有 schema 及其来源 |
| `--json` | 输出为 JSON |

**示例：**

```bash
# 检查 schema 的来源
openspec schema which spec-driven
```

**输出：**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@fission-ai/openspec/schemas/spec-driven
```

**Schema 优先级：**

1. 项目级：`openspec/schemas/<name>/`
2. 用户级：`~/.local/share/openspec/schemas/<name>/`
3. 包级：内置 schema

---

## 配置命令

### `openspec config`

查看和修改全局 OpenSpec 配置。

```
openspec config <subcommand> [options]
```

**子命令：**

| 子命令 | 描述 |
|--------|------|
| `path` | 显示配置文件位置 |
| `list` | 显示所有当前设置 |
| `get <key>` | 获取特定值 |
| `set <key> <value>` | 设置值 |
| `unset <key>` | 移除键 |
| `reset` | 重置为默认值 |
| `edit` | 在 `$EDITOR` 中打开 |
| `profile [preset]` | 交互式或通过预设配置工作流 profile |

**示例：**

```bash
# 显示配置文件路径
openspec config path

# 列出所有设置
openspec config list

# 获取特定值
openspec config get telemetry.enabled

# 设置值
openspec config set telemetry.enabled false

# 显式设置字符串值
openspec config set user.name "My Name" --string

# 移除自定义设置
openspec config unset user.name

# 重置所有配置
openspec config reset --all --yes

# 在编辑器中编辑配置
openspec config edit

# 使用基于操作的向导配置 profile
openspec config profile

# 快速预设：将工作流切换到 core（保留 delivery 模式）
openspec config profile core
```

`openspec config profile` 首先显示当前状态摘要，然后让你选择：
- 更改 delivery + 工作流
- 仅更改 delivery
- 仅更改工作流
- 保留当前设置（退出）

如果保留当前设置，不会写入任何更改，也不会显示更新提示。
如果没有配置更改但当前项目文件与全局 profile/delivery 不同步，OpenSpec 将显示警告并建议运行 `openspec update`。
按 `Ctrl+C` 也会干净地取消流程（无堆栈跟踪）并以代码 `130` 退出。
在工作流清单中，`[x]` 表示该工作流在全局配置中已选中。要将这些选择应用到项目文件，请运行 `openspec update`（或在项目中选择"立即将更改应用到此项目？"）。

**交互式示例：**

```bash
# 仅更新 delivery
openspec config profile
# 选择: 仅更改 delivery
# 选择 delivery: Skills only

# 仅更新工作流
openspec config profile
# 选择: 仅更改工作流
# 在清单中切换工作流，然后确认
```

---

## 工具命令

### `openspec feedback`

提交关于 OpenSpec 的反馈。创建 GitHub issue。

```
openspec feedback <message> [options]
```

**参数：**

| 参数 | 必需 | 描述 |
|------|------|------|
| `message` | 是 | 反馈消息 |

**选项：**

| 选项 | 描述 |
|------|------|
| `--body <text>` | 详细描述 |

**要求：** 必须安装并认证 GitHub CLI (`gh`)。

**示例：**

```bash
openspec feedback "添加对自定义工件类型的支持" \
  --body "我希望定义自己的工件类型，而不局限于内置类型。"
```

---

### `openspec completion`

管理 OpenSpec CLI 的 Shell 补全。

```
openspec completion <subcommand> [shell]
```

**子命令：**

| 子命令 | 描述 |
|--------|------|
| `generate [shell]` | 输出补全脚本到 stdout |
| `install [shell]` | 为你的 Shell 安装补全 |
| `uninstall [shell]` | 移除已安装的补全 |

**支持的 Shell：** `bash`、`zsh`、`fish`、`powershell`

**示例：**

```bash
# 安装补全（自动检测 Shell）
openspec completion install

# 为特定 Shell 安装
openspec completion install zsh

# 生成脚本以手动安装
openspec completion generate bash > ~/.bash_completion.d/openspec

# 卸载
openspec completion uninstall
```

---

## 退出码

| 代码 | 含义 |
|------|------|
| `0` | 成功 |
| `1` | 错误（验证失败、文件缺失等） |

---

## 环境变量

| 变量 | 描述 |
|------|------|
| `OPENSPEC_CONCURRENCY` | 批量验证的默认并发数（默认：6） |
| `EDITOR` 或 `VISUAL` | `openspec config edit` 使用的编辑器 |
| `NO_COLOR` | 设置时禁用彩色输出 |

---

## 相关文档

- [Commands](commands.md) - AI 斜杠命令（`/opsx:propose`、`/opsx:apply` 等）
- [Workflows](workflows.md) - 常见模式及何时使用每个命令
- [Customization](customization.md) - 创建自定义 schema 和模板
- [Getting Started](getting-started.md) - 首次设置指南
