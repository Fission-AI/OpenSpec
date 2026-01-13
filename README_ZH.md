<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_pixel_dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/openspec_pixel_light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/openspec_pixel_light.svg" alt="OpenSpec logo" height="64">
    </picture>
  </a>
  
</p>
<p align="center">面向 AI 编程助手的规范驱动开发。</p>
<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="node version" src="https://img.shields.io/node/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://conventionalcommits.org"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white&style=flat-square" /></a>
</p>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec 仪表盘预览" width="90%">
</p>

<p align="center">
  关注 <a href="https://x.com/0xTab">@0xTab 的 X</a> 获取更新 · 加入 <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> 获取帮助和提问。
</p>

<p align="center">
  <sub>🧪 <strong>新功能：</strong> <a href="docs/experimental-workflow.md">实验性工作流 (OPSX)</a> — 基于模式、可定制、流畅。无需修改代码即可迭代工作流。</sub>
</p>

# OpenSpec

OpenSpec 通过规范驱动开发使人类和 AI 编程助手保持一致，在编写任何代码之前就达成共识。**无需 API 密钥。**

## 为什么选择 OpenSpec？

AI 编程助手功能强大，但当需求只存在于聊天记录中时，其行为难以预测。OpenSpec 添加了一个轻量级的规范工作流，在实施前锁定意图，为您提供确定性、可审查的输出。

主要成果：
- 人类和 AI 利益相关者在工作开始前就规范达成一致。
- 结构化的变更文件夹（提案、任务和规范更新）使范围明确且可审计。
- 共享对已提议、活动或已归档内容的可见性。
- 与您已经使用的 AI 工具兼容：支持的工具使用自定义斜杠命令，其他工具使用上下文规则。

## OpenSpec 对比一览

- **轻量级**：简单的工作流，无需 API 密钥，最小化设置。
- **棕地优先**：不仅适用于从零开始的项目。OpenSpec 将真实来源与提案分开：`openspec/specs/`（当前真实状态）和 `openspec/changes/`（提议的更新）。这使差异在各功能间保持明确和可管理。
- **变更跟踪**：提案、任务和规范增量放在一起；归档时将批准的更新合并回规范。
- **与 spec-kit 和 Kiro 对比**：它们在全新功能（从零开始）方面表现出色。OpenSpec 在修改现有行为（从一到多）时也同样出色，特别是当更新跨越多个规范时。

完整对比请参见 [OpenSpec 对比](#openspec-对比)。

## 工作原理

```
┌────────────────────┐
│ 草拟变更           │
│ 提案               │
└────────┬───────────┘
         │ 与 AI 分享意图
         ▼
┌────────────────────┐
│ 审查与对齐         │
│ (编辑规范/任务)    │◀──── 反馈循环 ──────┐
└────────┬───────────┘                     │
         │ 批准的计划                       │
         ▼                                  │
┌────────────────────┐                      │
│ 实施任务           │──────────────────────┘
│ (AI 编写代码)      │
└────────┬───────────┘
         │ 交付变更
         ▼
┌────────────────────┐
│ 归档并更新         │
│ 规范（来源）       │
└────────────────────┘

1. 草拟一个变更提案，捕获您想要的规范更新。
2. 与您的 AI 助手一起审查提案，直到各方达成一致。
3. 实施引用已商定规范的任务。
4. 归档变更，将批准的更新合并回真实来源规范。
```

## 快速开始

### 支持的 AI 工具

<details>
<summary><strong>原生斜杠命令</strong>（点击展开）</summary>

这些工具内置了 OpenSpec 命令。在提示时选择 OpenSpec 集成。

| 工具 | 命令 |
|------|------|
| **Amazon Q Developer** | `@openspec-proposal`、`@openspec-apply`、`@openspec-archive`（`.amazonq/prompts/`） |
| **Antigravity** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.agent/workflows/`） |
| **Auggie (Augment CLI)** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.augment/commands/`） |
| **Claude Code** | `/openspec:proposal`、`/openspec:apply`、`/openspec:archive` |
| **Cline** | `.clinerules/workflows/` 目录中的工作流（`.clinerules/workflows/openspec-*.md`） |
| **CodeBuddy Code (CLI)** | `/openspec:proposal`、`/openspec:apply`、`/openspec:archive`（`.codebuddy/commands/`）— 参见 [文档](https://www.codebuddy.ai/cli) |
| **Codex** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（全局：`~/.codex/prompts`，自动安装） |
| **Continue** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.continue/prompts/`） |
| **CoStrict** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.cospec/openspec/commands/`）— 参见 [文档](https://costrict.ai) |
| **Crush** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.crush/commands/openspec/`） |
| **Cursor** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive` |
| **Factory Droid** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.factory/commands/`） |
| **Gemini CLI** | `/openspec:proposal`、`/openspec:apply`、`/openspec:archive`（`.gemini/commands/openspec/`） |
| **GitHub Copilot** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.github/prompts/`） |
| **iFlow (iflow-cli)** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.iflow/commands/`） |
| **Kilo Code** | `/openspec-proposal.md`、`/openspec-apply.md`、`/openspec-archive.md`（`.kilocode/workflows/`） |
| **OpenCode** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive` |
| **Qoder (CLI)** | `/openspec:proposal`、`/openspec:apply`、`/openspec:archive`（`.qoder/commands/openspec/`）— 参见 [文档](https://qoder.com/cli) |
| **Qwen Code** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.qwen/commands/`） |
| **RooCode** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.roo/commands/`） |
| **Windsurf** | `/openspec-proposal`、`/openspec-apply`、`/openspec-archive`（`.windsurf/workflows/`） |

Kilo Code 自动发现团队工作流。将生成的文件保存在 `.kilocode/workflows/` 下，然后从命令面板使用 `/openspec-proposal.md`、`/openspec-apply.md` 或 `/openspec-archive.md` 触发它们。

</details>

<details>
<summary><strong>AGENTS.md 兼容</strong>（点击展开）</summary>

这些工具自动从 `openspec/AGENTS.md` 读取工作流指令。如果需要提醒，可以让它们遵循 OpenSpec 工作流。了解更多关于 [AGENTS.md 约定](https://agents.md/)。

| 工具 |
|------|
| Amp • Jules • 其他 |

</details>

### 安装与初始化

#### 前提条件
- **Node.js >= 20.19.0** - 使用 `node --version` 检查您的版本

#### 步骤 1：全局安装 CLI

```bash
npm install -g @fission-ai/openspec@latest
```

验证安装：
```bash
openspec --version
```

#### 步骤 2：在项目中初始化 OpenSpec

导航到您的项目目录：
```bash
cd my-project
```

运行初始化：
```bash
openspec init
```

**初始化过程中发生的事情：**
- 系统会提示您选择任何原生支持的 AI 工具（Claude Code、CodeBuddy、Cursor、OpenCode、Qoder 等）；其他助手始终依赖共享的 `AGENTS.md` 存根
- OpenSpec 自动为您选择的工具配置斜杠命令，并始终在项目根目录写入托管的 `AGENTS.md` 交接文件
- 在您的项目中创建一个新的 `openspec/` 目录结构

**设置后：**
- 主要 AI 工具可以在无需额外配置的情况下触发 `/openspec` 工作流
- 运行 `openspec list` 验证设置并查看任何活动变更
- 如果您的编程助手没有立即显示新的斜杠命令，请重启它。斜杠命令在启动时加载，因此重新启动可确保它们出现

### 可选：填充项目上下文

`openspec init` 完成后，您将收到一个建议的提示来帮助填充项目上下文：

```text
填充您的项目上下文：
"请阅读 openspec/project.md 并帮我填写有关我的项目、技术栈和约定的详细信息"
```

使用 `openspec/project.md` 定义项目级别的约定、标准、架构模式和其他应在所有变更中遵循的指南。

### 创建您的第一个变更

这是一个展示完整 OpenSpec 工作流的真实示例。这适用于任何 AI 工具。具有原生斜杠命令的工具会自动识别快捷方式。

#### 1. 草拟提案
首先让您的 AI 创建一个变更提案：

```text
您：创建一个 OpenSpec 变更提案，添加按角色和团队过滤的个人资料搜索
    （具有斜杠命令的工具的快捷方式：/openspec:proposal 添加个人资料搜索过滤器）

AI：我将为个人资料过滤器创建一个 OpenSpec 变更提案。
    *在 openspec/changes/add-profile-filters/ 中创建 proposal.md、tasks.md 和规范增量。*
```

#### 2. 验证与审查
检查变更是否正确创建并审查提案：

```bash
$ openspec list                             # 确认变更文件夹存在
$ openspec validate add-profile-filters     # 验证规范格式
$ openspec show add-profile-filters         # 审查提案、任务和规范增量
```

#### 3. 完善规范
迭代规范直到满足您的需求：

```text
您：您能为角色和团队过滤器添加验收标准吗？

AI：我将用角色和团队过滤器的场景更新规范增量。
    *编辑 openspec/changes/add-profile-filters/specs/profile/spec.md 和 tasks.md。*
```

#### 4. 实施变更
规范看起来不错后，开始实施：

```text
您：规范看起来不错。让我们实施这个变更。
    （具有斜杠命令的工具的快捷方式：/openspec:apply add-profile-filters）

AI：我将处理 add-profile-filters 变更中的任务。
    *实施来自 openspec/changes/add-profile-filters/tasks.md 的任务*
    *标记任务完成：任务 1.1 ✓、任务 1.2 ✓、任务 2.1 ✓...*
```

#### 5. 归档已完成的变更
实施完成后，归档变更：

```text
AI：所有任务已完成。实施已就绪。

您：请归档变更
    （具有斜杠命令的工具的快捷方式：/openspec:archive add-profile-filters）

AI：我将归档 add-profile-filters 变更。
    *运行：openspec archive add-profile-filters --yes*
    ✓ 变更归档成功。规范已更新。准备好下一个功能！
```

或者在终端中自己运行命令：
```bash
$ openspec archive add-profile-filters --yes  # 无提示归档已完成的变更
```

**注意：** 具有原生斜杠命令的工具（Claude Code、CodeBuddy、Cursor、Codex、Qoder、RooCode）可以使用显示的快捷方式。所有其他工具都可以使用自然语言请求"创建 OpenSpec 提案"、"应用 OpenSpec 变更"或"归档变更"。

## 命令参考

```bash
openspec list               # 查看活动变更文件夹
openspec view               # 规范和变更的交互式仪表盘
openspec show <change>      # 显示变更详情（提案、任务、规范更新）
openspec validate <change>  # 检查规范格式和结构
openspec archive <change> [--yes|-y]   # 将已完成的变更移入 archive/（使用 --yes 实现非交互式）
```

## 示例：AI 如何创建 OpenSpec 文件

当您让 AI 助手"添加双因素认证"时，它会创建：

```
openspec/
├── specs/
│   └── auth/
│       └── spec.md           # 当前认证规范（如果存在）
└── changes/
    └── add-2fa/              # AI 创建整个结构
        ├── proposal.md       # 为什么以及什么变更
        ├── tasks.md          # 实施清单
        ├── design.md         # 技术决策（可选）
        └── specs/
            └── auth/
                └── spec.md   # 显示新增内容的增量
```

### AI 生成的规范（在 `openspec/specs/auth/spec.md` 中创建）：

```markdown
# 认证规范

## 目的
认证和会话管理。

## 需求
### 需求：用户认证
系统应在成功登录时发放 JWT。

#### 场景：有效凭证
- 当用户提交有效凭证时
- 则返回 JWT
```

### AI 生成的变更增量（在 `openspec/changes/add-2fa/specs/auth/spec.md` 中创建）：

```markdown
# 认证增量

## 新增需求
### 需求：双因素认证
系统必须在登录期间要求第二因素。

#### 场景：需要 OTP
- 当用户提交有效凭证时
- 则需要 OTP 验证
```

### AI 生成的任务（在 `openspec/changes/add-2fa/tasks.md` 中创建）：

```markdown
## 1. 数据库设置
- [ ] 1.1 在用户表中添加 OTP 密钥列
- [ ] 1.2 创建 OTP 验证日志表

## 2. 后端实现
- [ ] 2.1 添加 OTP 生成端点
- [ ] 2.2 修改登录流程以要求 OTP
- [ ] 2.3 添加 OTP 验证端点

## 3. 前端更新
- [ ] 3.1 创建 OTP 输入组件
- [ ] 3.2 更新登录流程 UI
```

**重要：** 您不需要手动创建这些文件。您的 AI 助手会根据您的需求和现有代码库生成它们。

## 理解 OpenSpec 文件

### 增量格式

增量是显示规范如何变化的"补丁"：

- **`## 新增需求`** - 新功能
- **`## 修改需求`** - 更改的行为（包含完整的更新文本）
- **`## 删除需求`** - 已弃用的功能

**格式要求：**
- 使用 `### 需求：<名称>` 作为标题
- 每个需求至少需要一个 `#### 场景：` 块
- 在需求文本中使用"应"/"必须"

## OpenSpec 对比

### 与 spec-kit 对比
OpenSpec 的双文件夹模型（`openspec/specs/` 用于当前真实状态，`openspec/changes/` 用于提议的更新）将状态和差异分开。当您修改现有功能或涉及多个规范时，这可以很好地扩展。spec-kit 在绑定/从零开始方面很强大，但在跨规范更新和功能演进方面提供的结构较少。

### 与 Kiro.dev 对比
OpenSpec 将功能的每个变更分组在一个文件夹中（`openspec/changes/feature-name/`），使相关规范、任务和设计的跟踪变得容易。Kiro 将更新分散在多个规范文件夹中，这可能使功能跟踪变得更困难。

### 与无规范对比
没有规范时，AI 编程助手会根据模糊的提示生成代码，通常会遗漏需求或添加不需要的功能。OpenSpec 通过在编写任何代码之前就期望的行为达成一致来带来可预测性。

## 团队采用

1. **初始化 OpenSpec** – 在您的仓库中运行 `openspec init`。
2. **从新功能开始** – 让您的 AI 将即将进行的工作捕获为变更提案。
3. **逐步增长** – 每个变更都会归档到记录您系统的活文档规范中。
4. **保持灵活** – 不同的团队成员可以使用 Claude Code、CodeBuddy、Cursor 或任何与 AGENTS.md 兼容的工具，同时共享相同的规范。

每当有人切换工具时运行 `openspec update`，以便您的代理获取最新的指令和斜杠命令绑定。

## 更新 OpenSpec

1. **升级包**
   ```bash
   npm install -g @fission-ai/openspec@latest
   ```
2. **刷新代理指令**
   - 在每个项目中运行 `openspec update` 以重新生成 AI 指导并确保最新的斜杠命令处于活动状态。

## 实验性功能

<details>
<summary><strong>🧪 OPSX：流畅、迭代的工作流</strong>（仅限 Claude Code）</summary>

**为什么存在这个功能：**
- 标准工作流是锁定的 — 您无法调整指令或自定义
- 当 AI 输出不佳时，您无法自己改进提示
- 每个人都使用相同的工作流，无法匹配您团队的工作方式

**有什么不同：**
- **可定制** — 自己编辑模板和模式，立即测试，无需重建
- **细粒度** — 每个工件都有自己的指令，单独测试和调整
- **可自定义** — 定义您自己的工作流、工件和依赖关系
- **流畅** — 没有阶段门，随时更新任何工件

```
您可以随时回退：

  提案 ──→ 规范 ──→ 设计 ──→ 任务 ──→ 实施
     ▲          ▲         ▲                   │
     └──────────┴─────────┴───────────────────┘
```

| 命令 | 功能 |
|------|------|
| `/opsx:new` | 开始新变更 |
| `/opsx:continue` | 创建下一个工件（基于已就绪的内容） |
| `/opsx:ff` | 快进（一次性完成所有规划工件） |
| `/opsx:apply` | 实施任务，根据需要更新工件 |
| `/opsx:archive` | 完成后归档 |

**设置：** `openspec artifact-experimental-setup`

[完整文档 →](docs/experimental-workflow.md)

</details>

<details>
<summary><strong>遥测</strong> – OpenSpec 收集匿名使用统计（退出：<code>OPENSPEC_TELEMETRY=0</code>）</summary>

我们仅收集命令名称和版本以了解使用模式。不收集参数、路径、内容或个人身份信息。在 CI 中自动禁用。

**退出：** `export OPENSPEC_TELEMETRY=0` 或 `export DO_NOT_TRACK=1`

</details>

## 贡献

- 安装依赖：`pnpm install`
- 构建：`pnpm run build`
- 测试：`pnpm test`
- 本地开发 CLI：`pnpm run dev` 或 `pnpm run dev:cli`
- 常规提交（单行）：`type(scope): subject`

## 许可证

MIT
