<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_pixel_dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/openspec_pixel_light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/openspec_pixel_light.svg" alt="OpenSpec logo" height="64">
    </picture>
  </a>
  
</p>
<p align="center">AI编码助手的规范驱动开发。</p>
<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="node version" src="https://img.shields.io/node/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://conventionalcommits.org"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white&style=flat-square" /></a>
</p>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

<p align="center">
  关注 <a href="https://x.com/0xTab">@0xTab on X</a> 获取更新 · 加入 <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> 获取帮助和解答。
</p>

# OpenSpec

OpenSpec 通过规范驱动开发将人类和AI编码助手对齐，因此在编写任何代码之前，您就同意要构建什么。**无需API密钥。**

## 为什么选择OpenSpec？

AI编码助手功能强大，但当需求存在于聊天历史中时却不可预测。OpenSpec添加了一个轻量级的规范工作流程，在实现之前锁定意图，为您提供确定性、可审查的输出。

主要成果：
- 人类和AI利益相关者在工作开始前就规范达成一致。
- 结构化的变更文件夹（提案、任务和规范更新）使范围明确且可审计。
- 共享对提议中、进行中或归档中的内容的可见性。
- 与您已使用的AI工具配合使用：在支持的地方使用自定义斜杠命令，其他地方使用上下文规则。

## OpenSpec比较（一目了然）

- **轻量级**：简单的工作流程，无需API密钥，最少的设置。
- **棕地优先**：在0→1之后表现优异。OpenSpec将真实来源与提案分离：`openspec/specs/`（当前真实情况）和`openspec/changes/`（提议的更新）。这使跨功能的差异保持明确和可管理。
- **变更跟踪**：提案、任务和规范差异共同存在；归档将批准的更新合并回规范中。
- **与spec-kit和Kiro比较**：那些工具在全新功能（0→1）方面表现出色。（1→n）方面也表现出色，特别是当更新跨越多个规范时。

查看完整的比较 [OpenSpec比较](#openpec比较)。

## 工作原理

```
┌────────────────────┐
│ 草拟变更       │
│ 提案           │
└────────┬───────────┘
         │ 与AI分享意图
         ▼
┌────────────────────┐
│ 审查与对齐     │
│ （编辑规范/任务） │◀──── 反馈循环 ──────┐
└────────┬───────────┘                  │
         │ 批准计划                       │
         ▼                              │
┌────────────────────┐                  │
│ 实现任务    │──────────────────────────┘
│ （AI编写代码）   │
└────────┬───────────┘
         │ 发布变更
         ▼
┌────────────────────┐
│ 归档与更新   │
│ 规范（源）     │
└────────────────────┘

1. 草拟一个变更提案，捕捉您想要的规范更新。
2. 与您的AI助手审查提案，直到每个人都同意。
3. 实现引用已同意规范的任务。
4. 归档变更以将批准的更新合并回真相来源规范中。
```

## 快速开始

### 支持的AI工具

#### 原生斜杠命令
这些工具具有内置的OpenSpec命令。提示时选择OpenSpec集成。

| 工具 | 命令 |
|------|----------|
| **Claude Code** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` |
| **CodeBuddy Code (CLI)** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.codebuddy/commands/`) — 查看 [docs](https://www.codebuddy.ai/cli) |
| **Cursor** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` |
| **Cline** | Rules in `.clinerules/` directory (`.clinerules/openspec-*.md`) |
| **Crush** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.crush/commands/openspec/`) |
| **Factory Droid** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.factory/commands/`) |
| **OpenCode** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` |
| **Kilo Code** | `/openspec-proposal.md`, `/openspec-apply.md`, `/openspec-archive.md` (`.kilocode/workflows/`) |
| **Windsurf** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.windsurf/workflows/`) |
| **Codex** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (global: `~/.codex/prompts`, auto-installed) |
| **GitHub Copilot** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.github/prompts/`) |
| **Amazon Q Developer** | `@openspec-proposal`, `@openspec-apply`, `@openspec-archive` (`.amazonq/prompts/`) |
| **Auggie (Augment CLI)** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.augment/commands/`) |
| **Qwen Code** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.qwen/commands/`) |


Kilo Code自动发现团队工作流程。将生成的文件保存在`.kilocode/workflows/`下，并从命令面板中使用`/openspec-proposal.md`、`/openspec-apply.md`或`/openspec-archive.md`触发它们。

#### AGENTS.md 兼容
这些工具自动从`openspec/AGENTS.md`读取工作流程说明。如果需要提醒，要求它们遵循OpenSpec工作流程。了解更多关于 [AGENTS.md 约定](https://agents.md/)。

| 工具 |
|-------|
| Amp • Jules • Gemini CLI • 其他 |

### 安装与初始化

#### 先决条件
- **Node.js >= 20.19.0** - 使用`node --version`检查您的版本

#### 步骤1：全局安装CLI

```bash
npm install -g @fission-ai/openspec@latest
```

验证安装：
```bash
openspec --version
```

#### 步骤2：在项目中初始化OpenSpec

导航到您的项目目录：
```bash
cd my-project
```

运行初始化：
```bash
openspec init
```

**初始化期间发生的事情：**
- 您将被提示选择任何原生支持的AI工具（Claude Code、CodeBuddy、Cursor、OpenCode等）；其他助手始终依赖共享的`AGENTS.md`存根
- OpenSpec自动为所选工具配置斜杠命令，并始终在项目根目录写入一个管理的`AGENTS.md`交接
- 在项目中创建新的`openspec/`目录结构

**设置后：**
- 主要AI工具可以在无需额外配置的情况下触发`/openspec`工作流程
- 运行`openspec list`以验证设置并查看任何活动变更
- 如果您的编码助手没有立即显示新的斜杠命令，请重新启动它。斜杠命令在启动时加载，
所以新鲜启动确保它们出现

### 可选：填充项目上下文

`openspec init`完成后，您将收到一个建议的提示来帮助填充您的项目上下文：

```text
填充您的项目上下文：
"请阅读 openspec/project.md 并帮助我填写有关我的项目、技术栈和约定的详细信息"
```

使用`openspec/project.md`定义项目级约定、标准、架构模式和其他应在所有变更中遵循的指南。

### 创建您的第一个变更

这是一个显示完整OpenSpec工作流程的真实示例。这适用于任何AI工具。具有原生斜杠命令的工具将自动识别快捷方式。

#### 1. 草拟提案
首先要求您的AI创建变更提案：

```text
您：为按角色和团队添加资料搜索过滤器创建一个OpenSpec变更提案
     （具有斜杠命令的工具的快捷方式：/openspec:proposal 添加资料搜索过滤器）

AI： 我将为资料过滤器创建一个OpenSpec变更提案。
     *搭建 openspec/changes/add-profile-filters/，包含 proposal.md、tasks.md、规范差异。*
```

#### 2. 验证与审查
检查变更是否正确创建并审查提案：

```bash
$ openspec list                             # 确认变更文件夹存在
$ openspec validate add-profile-filters     # 验证规范格式
$ openspec show add-profile-filters         # 审查提案、任务和规范差异
```

#### 3. 精炼规范
迭代规范，直到它们符合您的需求：

```text
您：您能为角色和团队过滤器添加验收标准吗？

AI： 我将在规范差异中使用角色和团队过滤器的场景更新它。
     *编辑 openspec/changes/add-profile-filters/specs/profile/spec.md 和 tasks.md。*
```

#### 4. 实施变更
一旦规范看起来不错，开始实施：

```text
您：规范看起来不错。让我们实施这个变更。
     （具有斜杠命令的工具的快捷方式：/openspec:apply add-profile-filters）

AI： 我将处理 add-profile-filters 变更中的任务。
     *从 openspec/changes/add-profile-filters/tasks.md 实施任务*
     *标记任务完成：任务 1.1 ✓，任务 1.2 ✓，任务 2.1 ✓...*
```

#### 5. 归档已完成的变更
实施完成后，归档变更：

```text
AI： 所有任务都完成了。实施已准备就绪。

您：请归档变更
     （具有斜杠命令的工具的快捷方式：/openspec:archive add-profile-filters）

AI： 我将归档 add-profile-filters 变更。
    *运行：openspec archive add-profile-filters --yes*
     ✓ 变更已成功归档。规范已更新。为下一个功能准备就绪！
```

或者在终端中自己运行命令：
```bash
$ openspec archive add-profile-filters --yes  # 在无提示的情况下归档已完成的变更
```

**注意：** 具有原生斜杠命令的工具（Claude Code、CodeBuddy、Cursor、Codex）可以使用所示的快捷方式。所有其他工具都可通过自然语言请求"创建OpenSpec提案"、"应用OpenSpec变更"或"归档变更"来工作。

## 命令参考

```bash
openspec list               # 查看活动变更文件夹
openspec view               # 规范和变更的交互式仪表板
openspec show <change>      # 显示变更详情（提案、任务、规范更新）
openspec validate <change>  # 检查规范格式和结构
openspec archive <change> [--yes|-y]   # 将已完成的变更移动到archive/（使用--yes为非交互式）
```

## 示例：AI如何创建OpenSpec文件

当您要求AI助手"添加双因素身份验证"时，它会创建：

```
openspec/
├── specs/
│   └── auth/
│       └── spec.md           # 当前auth规范（如果存在）
└── changes/
    └── add-2fa/              # AI创建此整个结构
        ├── proposal.md       # 为什么和什么变更
        ├── tasks.md          # 实施清单
        ├── design.md         # 技术决策（可选）
        └── specs/
            └── auth/
                └── spec.md   # 显示添加的差异
```

### AI生成的规范（在`openspec/specs/auth/spec.md`中创建）：

```markdown
# 认证规范

## 目的
身份验证和会话管理。

## 要求
### 要求：用户身份验证
系统应在成功登录时发布JWT。

#### 场景：有效凭据
- 当用户提交有效凭据时
- 然后返回JWT
```

### AI生成的变更差异（在`openspec/changes/add-2fa/specs/auth/spec.md`中创建）：

```markdown
# 认证差异

## 已添加要求
### 要求：双因素身份验证
系统在登录期间必须要求第二个因素。

#### 场景：需要OTP
- 当用户提交有效凭据时
- 然后需要OTP挑战
```

### AI生成的任务（在`openspec/changes/add-2fa/tasks.md`中创建）：

```markdown
## 1. 数据库设置
- [ ] 1.1 在用户表中添加OTP密钥列
- [ ] 1.2 创建OTP验证日志表

## 2. 后端实施  
- [ ] 2.1 添加OTP生成端点
- [ ] 2.2 修改登录流程以要求OTP
- [ ] 2.3 添加OTP验证端点

## 3. 前端更新
- [ ] 3.1 创建OTP输入组件
- [ ] 3.2 更新登录流程UI
```

**重要：** 您不会手动创建这些文件。您的AI助手根据您的需求和现有代码库生成它们。

## 理解OpenSpec文件

### 差异格式

差异是显示规范如何变化的"补丁"：

- **`## ADDED Requirements`** - 新功能
- **`## MODIFIED Requirements`** - 更改的行为（包含完整的更新文本）
- **`## REMOVED Requirements`** - 已弃用的功能

**格式要求：**
- 使用`### Requirement: <name>`作为标题
- 每个要求至少需要一个`#### Scenario:`块
- 在要求文本中使用SHALL/MUST

## OpenSpec比较

### 与spec-kit相比
OpenSpec的双文件夹模型（`openspec/specs/`用于当前真实情况，`openspec/changes/`用于提议的更新）将状态和差异分离。这在修改现有功能或触摸多个规范时扩展。spec-kit在绿地/0→1方面很强，但在跨规范更新和演变功能方面提供较少结构。

### 与Kiro.dev相比
OpenSpec在单个文件夹中分组每个功能的所有变更（`openspec/changes/feature-name/`），使跟踪相关规范、任务和设计变得容易。Kiro将更新分散到多个规范文件夹中，这可能使功能跟踪变得更加困难。

### 与无规范相比
没有规范，AI编码助手从模糊的提示生成代码，经常错过要求或添加不需要的功能。OpenSpec通过在编写任何代码之前就所需行为达成一致来带来可预测性。

## 团队采用

1. **初始化OpenSpec** – 在您的仓库中运行`openspec init`。
2. **从新功能开始** – 要求您的AI将即将到来的工作捕获为变更提案。
3. **逐步增长** – 每个变更归档到记录您系统的活动规范中。
4. **保持灵活** – 不同的团队成员可以使用Claude Code、CodeBuddy、Cursor或任何AGENTS.md兼容的工具，同时共享相同的规范。

每当有人切换工具时运行`openspec update`，以便您的代理获取最新的说明和斜杠命令绑定。

## 更新OpenSpec

1. **升级包**
   ```bash
   npm install -g @fission-ai/openspec@latest
   ```
2. **刷新代理说明**
   - 在每个项目中运行`openspec update`以重新生成AI指导并确保最新的斜杠命令处于活动状态。

## 贡献

- 安装依赖项：`pnpm install`
- 构建：`pnpm run build`
- 测试：`pnpm test`
- 本地开发CLI：`pnpm run dev`或`pnpm run dev:cli`
- 约定提交（单行）：`type(scope): subject`

## 许可证

MIT