# CLI 参考

OpenSpec CLI（`openspec`）提供用于项目初始化、校验、状态查看与管理的终端命令。这些命令与 [Commands](commands.md) 中记录的 AI 斜杠命令（如 `/opsx:propose`）互为补充。

## 总览

| 类别 | 命令 | 用途 |
|----------|----------|---------|
| **初始化（Setup）** | `init`, `update` | 在项目中初始化并更新 OpenSpec |
| **存储（Stores，独立的 OpenSpec 仓库）** | `store setup`, `store register`, `store unregister`, `store remove`, `store list`, `store doctor` | 管理已注册的 store——你注册的独立 OpenSpec 仓库 |
| **健康检查（Health）** | `doctor` | 报告当前解析根目录的关系健康度 |
| **工作上下文（Working context）** | `context` | 组装工作集（根目录 + 引用的 store） |
| **个人工作集（Personal worksets）** | `workset create`, `workset list`, `workset open`, `workset remove` | 在你的工具中保存并打开个人化的本地工作视图 |
| **浏览（Browsing）** | `list`, `view`, `show` | 浏览变更（changes）与规约（specs） |
| **校验（Validation）** | `validate` | 检查变更与规约的问题 |
| **生命周期（Lifecycle）** | `archive` | 完成已完成的变更 |
| **工作流（Workflow）** | `new change`, `status`, `instructions`, `templates`, `schemas` | 基于 artifact 的工作流支持 |
| **模式（Schemas）** | `schema init`, `schema fork`, `schema validate`, `schema which` | 创建并管理自定义工作流 |
| **配置（Config）** | `config` | 查看与修改设置 |
| **工具（Utility）** | `feedback`, `completion` | 反馈与 shell 集成 |

---

## 人类命令与 Agent 命令

大多数 CLI 命令是为终端中的**人工使用**而设计的。部分命令也通过 JSON 输出支持**agent/脚本使用**。

### 仅限人工的命令

这些命令是交互式的，专为终端使用设计：

| 命令 | 用途 |
|---------|---------|
| `openspec init` | 初始化项目（交互式提示） |
| `openspec view` | 交互式仪表盘 |
| `openspec workset open <name>` | 打开已保存的工作集（编辑器窗口或终端 agent 会话） |
| `openspec config edit` | 在编辑器中打开配置 |
| `openspec feedback` | 通过 GitHub 提交反馈 |
| `openspec completion install` | 安装 shell 补全 |

### 兼容 Agent 的命令

这些命令支持 `--json` 输出，供 AI agent 和脚本以编程方式使用：

| 命令 | 人工使用 | Agent 使用 |
|---------|-----------|-----------|
| `openspec list` | 浏览变更/规约 | `--json` 获取结构化数据 |
| `openspec show <item>` | 读取内容 | `--json` 用于解析 |
| `openspec validate` | 检查问题 | `--all --json` 用于批量校验 |
| `openspec status` | 查看 artifact 进度 | `--json` 获取结构化状态 |
| `openspec instructions` | 获取下一步 | `--json` 获取 agent 指令 |
| `openspec templates` | 查找模板路径 | `--json` 用于路径解析 |
| `openspec schemas` | 列出可用 schema | `--json` 用于 schema 发现；`--store <id>` 选择已注册的根目录 |
| `openspec store setup <id>` | 创建并注册一个本地 store | `--json` 配合显式输入以获得结构化的设置输出 |
| `openspec store register <path>` | 注册一个已有的 store | `--json` 获得结构化的注册输出 |
| `openspec store unregister <id>` | 注销一个本地 store 注册 | `--json` 获得结构化的清理输出 |
| `openspec store remove <id>` | 删除一个已注册的本地 store 文件夹 | `--yes --json` 用于非交互式删除 |
| `openspec store list` | 浏览已注册的 store | `--json` 获得结构化的注册信息 |
| `openspec store doctor` | 检查本地 store 设置 | `--json` 获得结构化的诊断结果 |
| `openspec new change <id>` | 创建仓库本地的 change 脚手架 | `--json`，另加 `--store <id>` 以使用已注册的 store 作为 OpenSpec 根目录 |
| `openspec workset create [name]` | 组合一个个人工作视图 | `--member <path> --json` 用于非交互式组合 |
| `openspec workset list` | 浏览已保存的工作集 | `--json` 获得结构化视图 |
| `openspec workset remove <name>` | 删除一个已保存的视图 | `--yes --json` 用于非交互式移除 |

---

## 全局选项

以下选项适用于所有命令：

| 选项 | 说明 |
|--------|-------------|
| `--version`, `-V` | 显示版本号 |
| `--no-color` | 关闭彩色输出 |
| `--help`, `-h` | 显示命令帮助 |

---

## 初始化命令

### `openspec init`

在项目中初始化 OpenSpec。创建目录结构并配置 AI 工具集成。

默认行为使用全局配置默认值：profile（配置文件）为 `core`，delivery（交付方式）为 `both`，workflows（工作流）为 `propose, explore, apply, update, sync, archive`。

```
openspec init [path] [options]
```

使用 `--language <language>` 可为新项目的 `openspec/config.yaml` 添加语言说明。对于已有项目，请编辑配置中的 `context` 字段，这样 OpenSpec 就不会覆盖项目特定的指引。

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `path` | 否 | 目标目录（默认：当前目录） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--tools <list>` | 以非交互方式配置 AI 工具。使用 `all`、`none` 或逗号分隔的列表 |
| `--language <language>` | 创建新配置时以该语言编写 artifact |
| `--force` | 自动清理遗留文件而不提示 |
| `--profile <profile>` | 覆盖本次 init 运行的全局 profile（`core` 或 `custom`） |
| `--no-animation` | 显示静态欢迎界面，而非动画界面 |
| `--copilot-cloud` | 在无需提示的情况下设置 GitHub Copilot [cloud coding-agent files](supported-tools.md#github-copilot-cloud-coding-agent) |
| `--no-copilot-cloud` | 跳过 GitHub Copilot cloud coding-agent 文件，无需提示 |

`--profile custom` 使用当前在全局配置中选中的工作流（`openspec config profile`）。

当设置了 `OPENSPEC_NO_ANIMATION` 环境变量（任意值，包括空值）、`NO_COLOR` 被设为非空值，或操作系统启用了“减弱动态效果”偏好（macOS 的 Reduce Motion、GNOME 关闭动画）时，欢迎动画也会跳过。

**支持的 tool ID（`--tools`）** —— `windsurf` 也可作为 `devin` 的别名被接受：`amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `command-code`, `codeartsagent`, `codex`, `devin`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `hermes`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `lingma`, `minimax-code`, `vibe`, `oh-my-pi`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `zed`, `zcode`, `agents`

> 该列表与 `src/core/config.ts` 中的 `AI_TOOLS` 一致。各工具的 skill 与命令路径见 [Supported Tools](supported-tools.md)。

**示例：**

```bash
# Interactive initialization
openspec init

# Initialize in a specific directory
openspec init ./my-project

# Non-interactive: configure for Claude and Cursor
openspec init --tools claude,cursor

# Non-interactive: configure global MiniMax Code skills
openspec init --tools minimax-code

# Configure for all supported tools
openspec init --tools all

# Override profile for this run
openspec init --profile core

# Skip prompts and auto-cleanup legacy files
openspec init --force
```

**它创建的内容：**

```
openspec/
├── specs/              # Your specifications (source of truth)
├── changes/            # Proposed changes
└── config.yaml         # Project configuration

.claude/skills/         # Claude Code skills (if claude selected)
.cursor/skills/         # Cursor skills (if cursor selected)
.cursor/commands/       # Cursor OPSX commands (if delivery includes commands)
.agents/skills/         # Shared skills for AGENTS.md-compatible tools (if agents selected)
... (other tool configs)
```

---

### `openspec update`

升级 CLI 后更新 OpenSpec 指令文件。使用当前的全局 profile、所选工作流与交付模式重新生成 AI 工具配置文件。

```
openspec update [path] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `path` | 否 | 目标目录（默认：当前目录） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--force` | 即使文件已是最新也强制更新 |

**示例：**

```bash
# Update instruction files after npm upgrade
npm install -g @fission-ai/openspec@latest
openspec update
```

请先升级软件包。指令文件由已安装的 CLI 生成，因此针对过时的安装运行 `openspec update` 会报告一切已是最新，而不会加入新版本所带来的工作流。

为了让这一点可见，`openspec update` 会询问 npm registry 是否已发布更新的 CLI。当你的版本落后时，它会提供升级：

```text
A newer OpenSpec CLI is available (v1.6.0 → v1.7.0).
  Running from: /usr/local/lib/node_modules/@fission-ai/openspec
? Upgrade to v1.7.0 now? (Y/n)
```

回答 yes 会运行 `npm install -g @fission-ai/openspec@latest`，然后用新 CLI 重新运行更新，使新工作流在同一条命令中生效。它通过询问已安装二进制的版本来确认升级，而非信任 npm 的退出码；因此，如果 `PATH` 中更早位置的另一个安装仍在响应，它会如实告知你，而不是谎报成功。回答 no 则会打印命令，并用你现有的 CLI 进行更新。Ctrl-C 会停止该命令。

该提示仅出现在交互式终端中，且只有当 npm 拥有该安装时——也就是 `npm install -g` 真正能修复的唯一情形。其余情况则给出与安装方式相匹配的命令：

| OpenSpec 的安装方式 | 你会得到 |
|---------------------------|--------------|
| 全局 npm 安装 | 在交互式终端中会出现提示，并为你运行升级；管道输出则改为打印命令 |
| 全局 pnpm、bun、yarn 或 volta 安装 | 对应包管理器的命令：`pnpm add -g …@latest`、`bun add -g …@latest`、`yarn global add …@latest` 或 `volta install …@latest` |
| 作为项目的依赖 | 提示更新该依赖，因为其包管理器拥有 lockfile |
| `npx` / `dlx` 缓存 | `npx @fission-ai/openspec@latest update` —— 该命令本身就是更新，因此没有第二步 |
| git 克隆 | 无 —— 你的版本就是分支所指向的版本 |

无论打印什么，它都会指明运行中的 CLI 是从哪个目录加载的——当你已完成升级但过时的 shim 仍占据你的 `PATH` 时，这正是需要检查的地方。

当 npm 导出了 `npm_config_registry` 时，它会向该 registry 询问，否则使用 `https://registry.npmjs.org`。它不会读取任何 `.npmrc`：让文件内容决定出站请求的去向是应当避免的做法，而且项目的 `.npmrc` 会随仓库一起传播。在私有镜像上，请导出 `npm_config_registry`——或设置 `OPENSPEC_NO_UPDATE_CHECK` 以完全跳过检查。当 `CI` 被设为除明确的关闭值（`false`、`0`、`no`、`off` 或空值）以外的任何值、处于 `NODE_ENV=test` 下，或只要设置了 `OPENSPEC_NO_UPDATE_CHECK`（任意值）、`DO_NOT_TRACK=1` 或 `OPENSPEC_TELEMETRY=0` 时，检查都会被跳过。它在更新之前运行，最多会使更新延迟 1.5 秒——即使网络静默丢包，超过该时间后它也会放弃，并在 registry 不可达时保持安静。

**“最新”如何判定：** skill 文件会记录生成它们的版本，因此 OpenSpec 将其与已安装的 CLI 进行比对。command 文件不带版本戳，因此对于既有 commands 又没有 skills 的工具（交付方式 `commands`），OpenSpec 会将文件内容与当前将生成的内容进行比对——对这些文件的手动编辑会被视为偏移并被覆盖。在交付方式 `skills` 或 `both` 下，只检查记录的版本，因此手编辑过但版本仍匹配的文件会被保留；使用 `--force` 可重写它。无论哪种情况，生成的文件由 OpenSpec 所有——把你自己的指令放在别处。

---

## 存储（Stores，独立的 OpenSpec 仓库）

> **Beta（测试版）。** 存储（Stores）以及基于它们构建的功能（references 引用、working context 工作上下文、worksets 工作集）都是新功能；命令名、标志、文件格式与 JSON 输出在版本之间可能会变化。如需以问题为导向的导览，请参阅 [stores guide](stores-beta/user-guide.md)。

store 是你在本机注册的一个独立的 OpenSpec 仓库——例如一个规划仓库或契约仓库。注册一个 store 后，普通命令（`list`、`show`、`status`、`validate`、`new change`、`archive` 等）就可以通过传入 `--store <id>` 在任何位置作用于它。

### `openspec store setup`

创建并注册一个本地 store。在终端中不带参数时，OpenSpec 会引导用户完成设置。agent 和脚本应传入明确的输入并使用 `--json`。

```bash
openspec store setup [id] [options]
```

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--path <path>` | store 所在的文件夹（例如 `~/openspec/<id>`） |
| `--remote <url>` | 在新的 store 的 `store.yaml` 中记录规范化远程地址 |
| `--init-git` | 初始化一个带初始提交的 Git 仓库（默认） |
| `--no-init-git` | 跳过所有 Git 操作：不初始化、不创建初始提交 |
| `--json` | 输出 JSON |

非交互式运行（`--json`、脚本、agent）必须同时传入 store id 和 `--path`。在交互式终端中，设置会以可编辑的建议位置（例如 `~/openspec/<id>`）提示存放位置，且该位置位于可见的、用户拥有的地方；它绝不会默认使用 OpenSpec 托管的数据目录。

示例：

```bash
openspec store setup
openspec store setup team-context
openspec store setup team-context --path ~/openspec/team-context --no-init-git
openspec store setup team-context --path ~/openspec/team-context --no-init-git --json
```

### `openspec store register`

注册一个已存在的本地 store 文件夹。在 stores 测试期间，一个根目录可以在不存在任何 change、尚未应用 spec 或尚未归档 change 之前就被注册；这种情况下，`openspec/changes/`、`openspec/specs/` 和 `openspec/changes/archive/` 可能会缺失，直到普通命令创建它们。一个仅含配置、声明了 `store: <id>` 的仓库仍然是指向另一个 store 的指针，除非移除该指针，否则不会被注册为 store 根目录。

```bash
openspec store register [path] [options]
```

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--id <id>` | store id；默认为 store 元数据或文件夹名称 |
| `--yes` | 确认为一个健康的 OpenSpec 根目录创建 store 身份元数据 |
| `--json` | 输出 JSON |

### `openspec store unregister`

取消本地 store 的注册，但不删除文件。

```bash
openspec store unregister <id> [--json]
```

当某个 store 被移动、克隆到其他位置，或不应再在本机的 OpenSpec 中显示时使用。

### `openspec store remove`

取消本地 store 的注册，并删除其本地文件夹。

```bash
openspec store remove <id> [--yes] [--json]
```

`remove` 在交互式终端中会在删除前显示确切的文件夹。agent、脚本与 JSON 调用方必须传入 `--yes` 以确认删除。OpenSpec 拒绝删除不含匹配 store 元数据的文件夹。

### `openspec store list`

列出本地注册的 store。

```bash
openspec store list [--json]
openspec store ls [--json]
```

### `openspec store doctor`

检查本地 store 的注册、元数据与 Git 状态。

```bash
openspec store doctor [id] [--json]
```

doctor 仅用于诊断；它报告缺失的根目录、元数据不匹配以及无效的本地 registry 状态，但不会修改 store。

### 从项目引用 store

项目仓库可以在 `openspec/config.yaml` 中声明其工作所依赖的 store：

```yaml
schema: spec-driven
references:
  - team-context
```

此后，该仓库中 `openspec instructions` 的输出（包括每个 artifact 和 `apply` 两个层面，JSON 与人类可读模式）都会携带每个被引用 store 的 spec 索引——spec id、来自每个 spec 的 Purpose 章节的一行摘要，以及获取命令（`openspec show <spec-id> --type spec --store <id>`）。该索引在每次运行时从已注册的 checkout 实时构建；spec 内容绝不会被复制到输出中。

references 是只读上下文。它们永远不会改变命令的作用位置：工作仍停留在仓库自身的根目录中，写入被引用的 store 仍是一项明确的 `--store` 操作。无法解析的引用（例如本机未注册的 store）会降级为索引中的一条警告，并附带确切的修复方法，而 instructions 仍会生成。`openspec doctor` 会在一处报告引用健康度。

### 记录 store 的克隆来源

store 可以在其已提交的身份文件中记录其规范化的克隆来源，这样新成员接入时就不会卡在“注册 store”这一步：

```bash
openspec store setup team-context --path ~/openspec/team-context \
  --remote git@github.com:acme/team-context.git
```

该远程地址会写入初始提交内的 `.openspec-store/store.yaml`，因此每次克隆都会自带这一信息。对于已有的 store，请手动编辑 `store.yaml` 并提交。`store doctor` 会显示记录的远程地址（以及 checkout 实际观测到的 Git origin）；setup/register 的共享指引会显示它；而 register 会把 checkout 的 origin 记录到机器本地的 registry 中。

引用声明也可以携带克隆来源，这样尚未拥有该 store 的同事就能得到一条完整、可直接粘贴的修复命令（`git clone <remote> <path> && openspec store register <path> --id <id>`）：

```yaml
references:
  - { id: team-context, remote: "git@github.com:acme/team-context.git" }
```

记录远程地址并不等于同步：OpenSpec 永远不会自行 clone、pull 或 push。

### 声明默认 store

一个将规划完全外置——即没有本地 `openspec/specs/` 或 `openspec/changes/`——的仓库，可以一次性声明其 store，而无需在每条命令上都传入 `--store`：

```yaml
# openspec/config.yaml (the only file under openspec/)
store: team-context
```

此后普通命令会自动解析到声明的 store；根目录横幅与 JSON 的 `root` 块会报告 `source: "declared"` 以及 store id，打印的提示仍会带有 `--store <id>`。该声明是一种回退，而非覆盖：显式的 `--store` 始终优先；而带有真实规划文件夹的目录会忽略该指针（并给出警告）。要将一个指针仓库转换为本地 OpenSpec 根目录，请移除 `store:` 行并运行 `openspec init`——只要声明存在，init 就会拒绝搭建脚手架。

机器级别的变体可一次覆盖所有仓库：`openspec config set defaultStore <id>`（见配置）。它仅在 `--store`、本地根目录与项目指针都无法解析之后才会被查阅；届时根目录横幅与 JSON 的 `root` 块会报告 `source: "global_default"`。

## Doctor（关系健康度）

一个只读的问题，一个去处：OpenSpec 根目录是否健康，以及它引用的 store 在本机是否可用？

```bash
openspec doctor [--store <id>] [--json]
```

报告将根目录健康度、store 元数据健康度（包括当记录的远程地址与 checkout 的 origin 不一致时的提示，以及当 store checkout 落后于其上一次拉取的上游跟踪引用时的提示）与引用健康度（与 instructions 显示相同的诊断信息，并附带针对未解析引用的克隆修复）分开。任何严重程度的健康发现都以退出码 0 结束——agent 读取 `status` 数组；只有命令失败（无根目录、未知 store）才以退出码 1 结束。doctor 永远不会 clone、sync 或修复。若要获取组装后的集合本身而非其健康度，请使用 `openspec context`。

## 工作上下文（组装后的集合）

本工作通过 OpenSpec 声明所关联的一切，都在同一个工作集中：即 OpenSpec 根目录与它引用的 store。

```bash
openspec context [--store <id>] [--json] [--code-workspace <path> [--force]]
```

JSON 摘要可供 agent 消费（每个可用的被引用 store 都携带其获取配方；未能解析的成员携带与 instructions 和 doctor 相同的修复方法）。`--code-workspace` 会额外写入一个 VS Code 工作区文件，其中包含根目录与可用的被引用 store（`ref:<id>` 文件夹）——这是该命令执行的唯一一次写入，若文件已存在且未加 `--force` 则会被拒绝。不可用的成员会被报告，而绝不会被臆测。

“Working context”是组装后的集合；而 `openspec/config.yaml` 中的 `context:` 字段是注入到 instructions 中的项目背景——这是两件不同的事。`openspec doctor` 回答的是该集合是否健康；`openspec context` 回答的是该集合是什么。

## 个人工作集（Personal worksets）

> **Beta（测试版）。** 工作集（worksets）是新测试版界面的一部分；命令、标志与文件格式在版本之间可能会变化。如需导览，请参阅 [stores guide](stores-beta/user-guide.md#worksets-reopen-the-folders-you-work-on-together)。

工作集（workset）是你一起工作的文件夹的一个个人化的、具名的视图——一个规划根目录加上你选择的任何其他内容——保存在你的机器上，并可在工具中按名称重新打开。它是纯本地的：从不提交、从不共享、从不从声明派生，且删除一个工作集永远不会触及成员文件夹。

```bash
openspec workset create [name] [--member <path> | --member <name>=<path>]... [--tool <id>] [--json]
openspec workset list [--json]
openspec workset open <name> [--tool <id>]
openspec workset remove <name> [--yes] [--json]
```

`create` 会运行一个简短的引导流程（或以非交互方式接受 `--member` 标志；第一个成员是主成员——会话从那里开始）。`open` 会启动所选的工具：编辑器（VS Code、Cursor）会打开一个包含所有成员的窗口并返回；CLI agent（Claude Code、codex）会接管本终端作为一个会话，附加所有成员且不预填提示，在你退出时结束。打开时缺失的成员文件夹会被跳过并附带说明；其余成员正常打开。已保存的工具偏好可在每次打开时通过 `--tool` 覆盖。

支持新工具是配置，而非代码。每个工具都是两种启动风格之一——`workspace-file`（用生成的 `.code-workspace` 启动）或 `attach-dirs`（每个成员一个 attach 标志）——全局 `config.json` 中的 `openers` 键（用 `openspec config edit` 打开它）可以添加工具或按字段调整内置工具：

```json
{
  "openers": {
    "zed": { "style": "workspace-file" },
    "claude": { "attach_flag": "--dir" }
  }
}
```

所有工作集状态都位于全局数据目录下的 `worksets/` 文件夹中（保存的视图以及生成的 `<name>.code-workspace` 文件，每次打开都会重新生成）；删除该文件夹会移除所有痕迹。

---

## 浏览命令

### `openspec list`

列出项目中的变更（changes）或规约（specs）。

```
openspec list [options]
```

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--specs` | 列出 spec 而非 change |
| `--changes` | 列出 change（默认） |
| `--sort <order>` | 按 `recent`（默认）或 `name` 排序 |
| `--json` | 以 JSON 输出 |

**示例：**

```bash
# List all active changes
openspec list

# List all specs
openspec list --specs

# JSON output for scripts
openspec list --json
```

**输出（文本）：**

```
Changes:
  add-dark-mode     No tasks      just now
```

---

### `openspec view`

显示一个用于浏览 spec 与 change 的交互式仪表盘。

```
openspec view
```

打开一个基于终端的界面，用于浏览项目的规范（specs）与变更（changes）。

---

### `openspec show`

显示某个 change 或 spec 的详细信息。

```
openspec show [item-name] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `item-name` | 否 | change 或 spec 的名称（省略时提示） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--type <type>` | 指定类型：`change` 或 `spec`（明确时自动检测） |
| `--json` | 以 JSON 输出 |
| `--no-interactive` | 禁用提示 |

**change 专属选项：**

| 选项 | 说明 |
|--------|-------------|
| `--deltas-only` | 只显示 delta spec（JSON 模式） |

**spec 专属选项：**

| 选项 | 说明 |
|--------|-------------|
| `--requirements` | 只显示 requirement，排除 scenario（JSON 模式） |
| `--no-scenarios` | 排除 scenario 内容（JSON 模式） |
| `-r, --requirement <id>` | 按 1 起始的索引显示特定 requirement（JSON 模式） |

**示例：**

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

## 校验命令

### `openspec validate`

校验 change 与 spec 的结构性问题，并将 change 中被 MODIFIED 的 requirement 与它们将替换的主 spec 进行比对。

```
openspec validate [item-name] [options]
```

一个没有任何 spec delta 的 change 会导致校验失败，除非其 `.openspec.yaml` 声明了 `skip_specs: true`（适用于纯粹的重构、工具或文档工作——见 [Recipe 5](examples.md#recipe-5-a-refactor-with-no-behavior-change)）。

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `item-name` | 否 | 要校验的具体项（省略时提示） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--all` | 校验所有 change 与 spec |
| `--changes` | 校验所有 change |
| `--specs` | 校验所有 spec |
| `--archived` | 校验已归档的 change 是否已完成全部任务（用于提交前 lint） |
| `--type <type>` | 名称有歧义时指定类型：`change` 或 `spec` |
| `--strict` | 启用严格校验模式 |
| `--json` | 以 JSON 输出 |
| `--concurrency <n>` | 最大并行校验数（默认：6，或 `OPENSPEC_CONCURRENCY` 环境变量） |
| `--no-interactive` | 禁用提示 |

`--archived` 是独立的作用域：它不校验 spec delta（在归档时已经应用），而是核实 `changes/archive/` 下的每个 change 是否都已勾选其 `tasks.md` 中的所有复选框，若有未勾选项则以非零状态退出。这能捕获带着未完成工作被归档的 change——在提交前钩子中很实用。

**示例：**

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

# Fail if any archived change still has unchecked tasks
openspec validate --archived
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

归档一个已完成的 change，并将 delta spec 合并进主 spec。

```
openspec archive [change-name] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要归档的 change（省略时提示；当没有可回答提示的输入时必填） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `-y, --yes` | 跳过确认提示。当没有可回答提示的输入时必填——例如 AI agent、CI 任务，或任何关闭了 stdin 的运行 |
| `--skip-specs` | 在某次归档运行中跳过 spec 更新。一个永久没有 spec delta 的 change 应在其 `.openspec.yaml` 中声明 `skip_specs: true`——这样它会不带任何标志地归档 |
| `--no-validate` | 跳过校验（需确认）。同时禁用 capability 退役——没有校验结论，就不会退役任何 capability |

**示例：**

```bash
# Interactive archive (asks which change, then confirms)
openspec archive

# Archive specific change
openspec archive add-dark-mode

# Archive without prompts (agents, CI, scripts)
openspec archive add-dark-mode --yes

# Archive a tooling change that doesn't affect specs
openspec archive update-ci-config --skip-specs
```

**它执行的操作：**

1. 校验该 change（除非 `--no-validate`）
2. 提示确认（除非 `--yes`）
3. 在改动任何主 spec 之前先占住归档目标位置
4. 校验并将活动 delta spec 合并进 `openspec/specs/`——被该 change 移除最后一个 requirement 的 capability 会被退役，其 spec 文件被删除，但这仅在 change 的 `.openspec.yaml` 在其 `schema:` 旁声明了 `retire_capabilities: true` 时才会发生
5. 将 change 文件夹移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`
6. 若在获得完整归档之前某个 spec 变更或最终移动失败，则恢复 spec，并将 change 留在或退回其活动路径
7. 若已验证的回退副本已完成，但暂存源清理失败，则保留完整的归档与已提交的 spec 状态以便恢复

**无终端时：** AI agent、CI 任务或任何关闭了 stdin 的运行都无法回答第 2 步，因此 archive 会在触碰任何内容之前停止，以退出码 1 结束，并告知需重新运行的命令——`openspec archive <name> --yes`，并带上你传入的其他标志。提前传入 `--yes`（以及 change 名称）可跳过这一往返。

---

## 工作流命令

这些命令支持以 artifact 驱动的 OPSX 工作流。它们既便于人工查看进度，也便于 agent 确定下一步。

### `openspec new change`

在解析得到的 OpenSpec 根目录中创建一个 change 目录以及可选的、已提交的元数据。

```bash
openspec new change <name> [options]
```

change 名称必须使用小写 kebab-case：小写字母、数字以及单个连字符。不能包含空格、下划线、大写字母、连续连字符，或前导/尾随连字符。允许以数字开头，因此你可以为名称添加前缀来排序或分级 change，例如 `100-add-feature` 或 `00001-add-auth`。

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--description <text>` | 添加到 `README.md` 的描述 |
| `--goal <text>` | 随 change 一起存储的可选目标元数据 |
| `--schema <name>` | 要使用的工作流 schema |
| `--store <id>` | 用作 OpenSpec 根目录的 store id（store 是你注册的独立 OpenSpec 仓库） |
| `--json` | 输出 JSON |

示例：

```bash
openspec new change add-billing-api
openspec new change add-billing-api --store team-context --json
```

### `openspec status`

显示某个 change 的 artifact 完成状态。

```
openspec status [options]
```

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--change <id>` | change 名称（省略时提示） |
| `--schema <name>` | schema 覆盖（从 change 的配置自动检测） |
| `--json` | 以 JSON 输出 |

**示例：**

```bash
# Interactive status check
openspec status

# Status for specific change
openspec status --change add-dark-mode

# JSON for agent use
openspec status --change add-dark-mode --json
```

**输出（文本）：**

```
Change: add-dark-mode
Schema: spec-driven
Progress: 2/4 artifacts complete

[x] proposal
[x] specs
[ ] design
[-] tasks (blocked by: design)
```

声明了 `skip_specs: true` 的 change 会将其 specs 阶段显示为 `[~] specs (skipped: change declares skip_specs)`，并将其排除在进度计数之外。

**输出（JSON）：**

```json
{
  "changeName": "add-dark-mode",
  "schemaName": "spec-driven",
  "isPlanningComplete": false,
  "isComplete": false,
  "applyRequires": ["tasks"],
  "artifacts": [
    {"id": "proposal", "outputPath": "proposal.md", "status": "done", "requires": []},
    {"id": "specs", "outputPath": "specs/**/*.md", "status": "done", "requires": ["proposal"]},
    {"id": "design", "outputPath": "design.md", "status": "ready", "requires": ["proposal"]},
    {"id": "tasks", "outputPath": "tasks.md", "status": "blocked", "requires": ["specs", "design"], "missingDeps": ["design"]}
  ]
}
```

`isPlanningComplete` 报告是否每个未被跳过的规划 artifact 都已存在；被跳过的 artifact 视为已满足，而无需被创建。它不报告实现任务是否完成。`isComplete` 作为具有相同值的兼容性别名保留。

artifact 按依赖顺序列出——依赖项绝不会出现在需要它的项之后——而同时变为就绪的 artifact（spec-driven 的 `specs` 和 `design` 都只需 `proposal`）会保持 schema 声明它们的顺序，而非字母顺序。因此第一个 `ready` 条目就是接下来要编写的 artifact。

---

### `openspec instructions`

获取用于创建 artifact 或应用任务的增强指令。AI agent 用它来理解接下来要创建什么。

```
openspec instructions [artifact] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `artifact` | 否 | artifact ID，或工作流输入界面：`apply` 或 `archive` |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--change <id>` | change 名称（非交互模式下必填） |
| `--schema <name>` | schema 覆盖 |
| `--json` | 以 JSON 输出 |

**特殊情况：** 使用 `apply` 获取任务实现指令。使用 `archive` 获取一个有效 change 当前的、只读的归档输入（`context` 和 `operationGuidance`）；它不会归档或变更任何内容。

**示例：**

```bash
# Get instructions for next artifact
openspec instructions --change add-dark-mode

# Get specific artifact instructions
openspec instructions design --change add-dark-mode

# Get apply/implementation instructions
openspec instructions apply --change add-dark-mode

# Get current archive operation inputs without archiving
openspec instructions archive --change add-dark-mode --json

# JSON for agent consumption
openspec instructions design --change add-dark-mode --json
```

**输出包含：**

- 该 artifact 的模板内容
- 来自配置的 project context
- 来自依赖 artifact 的内容
- 来自配置的逐 artifact 规则
- 当前的 project context 以及 `apply`/`archive` 匹配的 operation guidance

operation 输入在每次调用时都从解析得到的仓库或所选 store 读取。project context 是必需的 prompt 级输入：agent 读取它并应用相关的项目事实、约定与约束。operation guidance 是可选的附加建议：agent 会考虑每一条，但只遵循适用且与内置工作流兼容的条目。这两个字段都与明确的用户选择、CLI 控制的状态、内置指令以及 artifact 规则保持分离。冲突的 context 会被报告；冲突或不适用的 guidance 不会被遵循，并会说明原因。这些是面向生成 agent 的行为契约，而非可强制执行的 CLI 检查。`instructions archive` 只返回所选 change、可选输入与根目录元数据；它不包含静态的 archive 工作流。

对于通过 `skip_specs: true` 跳过的 artifact，输出仅为一条警告（JSON 会增加 `skipped`/`warning` 字段）——该 artifact 不得被创建。

---

### `openspec templates`

显示某个 schema 中所有 artifact 的已解析模板路径。

```
openspec templates [options]
```

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--schema <name>` | 要检查的 schema（默认：`spec-driven`） |
| `--json` | 以 JSON 输出 |

**示例：**

```bash
# Show template paths for default schema
openspec templates

# Show templates for custom schema
openspec templates --schema my-workflow

# JSON for programmatic use
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

列出可用的工作流 schema 及其描述与 artifact 流程。

```
openspec schemas [options]
```

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--json` | 以 JSON 输出 |
| `--store <id>` | 使用一个已注册的 store 作为 OpenSpec 根目录 |

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

## 模式（Schema）命令

用于创建和管理自定义工作流 schema 的命令。

### `openspec schema init`

创建一个新的项目级本地 schema。

```
openspec schema init <name> [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `name` | 是 | schema 名称（kebab-case） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--description <text>` | schema 描述 |
| `--artifacts <list>` | 逗号分隔的 artifact ID（默认：`proposal,specs,design,tasks`） |
| `--default` | 设为项目默认 schema |
| `--no-default` | 不提示设为默认 |
| `--force` | 覆盖已有的 schema |
| `--json` | 输出 JSON |

**示例：**

```bash
# Interactive schema creation
openspec schema init research-first

# Non-interactive with specific artifacts
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**它创建的内容：**

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

复制一个已有的 schema 到你的项目以便定制。

```
openspec schema fork <source> [name] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `source` | 是 | 要复制的 schema |
| `name` | 否 | 新 schema 名称（默认：`<source>-custom`） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--force` | 覆盖已有的目标 |
| `--json` | 输出 JSON |

**示例：**

```bash
# Fork the built-in spec-driven schema
openspec schema fork spec-driven my-workflow
```

---

### `openspec schema validate`

校验一个 schema 的结构与模板。

```
openspec schema validate [name] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `name` | 否 | 要校验的 schema（省略则校验全部） |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--verbose` | 显示详细的校验步骤 |
| `--json` | 输出 JSON |

**示例：**

```bash
# Validate a specific schema
openspec schema validate my-workflow

# Validate all schemas
openspec schema validate
```

---

### `openspec schema which`

显示某个 schema 从何处解析而来（便于调试优先级）。

```
openspec schema which [name] [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `name` | 否 | schema 名称 |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--all` | 列出所有 schema 及其来源 |
| `--json` | 输出 JSON |

**示例：**

```bash
# Check where a schema comes from
openspec schema which spec-driven
```

**输出：**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@fission-ai/openspec/schemas/spec-driven
```

**schema 优先级：**

1. 项目：`openspec/schemas/<name>/`
2. 用户：`~/.local/share/openspec/schemas/<name>/`
3. 包：内置 schema

---

## 配置命令

### `openspec config`

查看并修改全局 OpenSpec 配置。

```
openspec config <subcommand> [options]
```

**子命令：**

| 子命令 | 说明 |
|------------|-------------|
| `path` | 显示配置文件位置 |
| `list` | 显示所有当前设置 |
| `get <key>` | 获取特定值 |
| `set <key> <value>` | 设置一个值 |
| `unset <key>` | 移除一个键 |
| `reset` | 重置为默认值 |
| `edit` | 在 `$EDITOR` 中打开 |
| `profile [preset]` | 以交互方式或通过预设配置工作流 profile |

**示例：**

```bash
# Show config file path
openspec config path

# List all settings
openspec config list

# Get a specific value
openspec config get telemetry.enabled

# Set a value (disable anonymous usage telemetry)
openspec config set telemetry.enabled false

# Set a string value explicitly
openspec config set user.name "My Name" --string

# Remove a custom setting
openspec config unset user.name

# Set a machine-level default store (fallback root when no --store,
# local root, or project store: pointer resolves)
openspec config set defaultStore team-plans

# Reset all configuration
openspec config reset --all --yes

# Edit config in your editor
openspec config edit

# Configure profile with action-based wizard
openspec config profile

# Fast preset: switch workflows to core (keeps delivery mode)
openspec config profile core
```

**退出遥测（Telemetry opt-out）：** `telemetry.enabled` 在未设置时默认为开启（选择退出模型）。将其设为 `false` 可禁用匿名使用统计与 `openspec update` 的版本检查。环境变量优先于配置：`OPENSPEC_TELEMETRY=0`、`DO_NOT_TRACK=1`，以及一个为真值的 `CI`（例如 `true`/`1`/`yes`）无论配置值如何都会禁用遥测。

`openspec config profile` 先给出当前状态摘要，然后让你选择：
- 更改 delivery + workflows
- 仅更改 delivery
- 仅更改 workflows
- 保留当前设置（退出）

如果保留当前设置，则不会写入任何更改，也不会显示更新提示。如果没有任何配置更改，但当前项目文件与你的全局 profile/delivery 不同步，OpenSpec 会显示警告并建议 `openspec update`。按下 `Ctrl+C` 也会干净地取消该流程（无堆栈跟踪），并以退出码 `130` 结束。在工作流清单中，`[x]` 表示该工作流已在全局配置中被选中。要将这些选择应用到项目文件，请运行 `openspec update`（或在项目内被提示时选择 `Apply changes to this project now?`）。

**交互式示例：**

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

## 工具命令

### `openspec feedback`

提交关于 OpenSpec 的反馈。会创建一个 GitHub issue。

```
openspec feedback <message> [options]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `message` | 是 | 反馈摘要；长文本会在 issue 标题中被缩短，并在正文中保留 |

**选项：**

| 选项 | 说明 |
|--------|-------------|
| `--body <text>` | 摘要之后包含的额外详情 |

**要求：** GitHub CLI（`gh`）必须已安装并通过认证。

**示例：**

```bash
openspec feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `openspec completion`

管理 OpenSpec CLI 的 shell 补全。

```
openspec completion <subcommand> [shell]
```

**子命令：**

| 子命令 | 说明 |
|------------|-------------|
| `generate [shell]` | 将补全脚本输出到 stdout |
| `install [shell]` | 为你的 shell 安装补全 |
| `uninstall [shell]` | 移除已安装的补全 |

**支持的 shell：** `bash`, `zsh`, `fish`, `powershell`

**示例：**

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

补全是选择启用的。CLI 会在你第一次于交互式终端运行命令时，通过 stderr 提及一次，之后不再提及——如果你已安装补全，它也会保持安静。设置 `OPENSPEC_NO_COMPLETIONS=1` 可完全抑制该提示。

---

## 退出码

| 码 | 含义 |
|------|---------|
| `0` | 成功 |
| `1` | 错误（校验失败、文件缺失等） |

---

## 环境变量

| 变量 | 说明 |
|----------|-------------|
| `OPENSPEC_TELEMETRY` | 设为 `0` 可禁用遥测与 `openspec update` 的版本检查（覆盖全局配置中的 `telemetry.enabled`） |
| `DO_NOT_TRACK` | 设为 `1` 可禁用遥测与 `openspec update` 的版本检查（标准 DNT 信号；覆盖配置） |
| `OPENSPEC_CONCURRENCY` | 批量校验的默认并发数（默认：6） |
| `EDITOR` 或 `VISUAL` | `openspec config edit` 使用的编辑器 |
| `NO_COLOR` | 设置时禁用彩色输出 |
| `OPENSPEC_NO_ANIMATION` | 设置时禁用 `openspec init` 的欢迎动画 |
| `OPENSPEC_NO_COMPLETIONS` | 设为 `1` 可抑制关于 shell 补全的一次性提示 |
| `OPENSPEC_NO_UPDATE_CHECK` | 设置时（任意值，包括空值）禁用 `openspec update` 对更新的已发布 CLI 的检查。当 `CI` 被设置（除非为 `false`/`0`/`no`/`off`）或 `NODE_ENV=test` 时也会跳过 |
| `npm_config_registry` | `openspec update` 版本检查所询问的 registry。必须是 `http(s)` URL，否则回退到 `https://registry.npmjs.org`。不会读取任何 `.npmrc` 文件 |

---

## 相关文档

- [Commands](commands.md) - AI 斜杠命令（`/opsx:propose`、`/opsx:apply` 等）
- [Workflows](workflows.md) - 常见模式以及何时使用各命令
- [Customization](customization.md) - 创建自定义 schema 与模板
- [Getting Started](getting-started.md) - 首次设置指南
