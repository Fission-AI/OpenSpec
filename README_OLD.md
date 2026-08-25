<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_pixel_dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/openspec_pixel_light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/openspec_pixel_light.svg" alt="OpenSpec logo" height="64">
    </picture>
  </a>
  
</p>
<p align="center">面向 AI 编码助手的规约驱动开发。</p>
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
  在 <a href="https://x.com/0xTab">X 上关注 @0xTab</a> 获取更新 · 加入 <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> 获取帮助与答疑。
</p>

<p align="center">
  <sub>🧪 <strong>新功能：</strong> <a href="docs/opsx.md">OPSX 工作流</a>——以 schema 驱动、可 hack、灵活。无需改代码即可迭代工作流。</sub>
</p>

# OpenSpec

OpenSpec 用规约驱动开发让人类与 AI 编码助手保持一致，让你在任何代码写出之前就先对要构建的内容达成一致。**无需 API 密钥。**

## 为何选择 OpenSpec？

AI 编码助手功能强大，但当需求存在于聊天记录中时却难以预测。OpenSpec 增加了一套轻量的规约工作流，在实现前锁定意图，为你带来确定性、可审阅的输出。

主要成果：
- 人类与 AI 相关方在工作开始前就 specs 达成一致。
- 结构化的变更文件夹（proposals、tasks 与 spec 更新）让范围明确且可审计。
- 对"已提案、进行中、已归档"的内容拥有共享可见性。
- 兼容你已在使用的 AI 工具：在支持处使用自定义斜杠命令，在其他处使用上下文规则。

## OpenSpec 如何对比（一览）

- **轻量**：简单工作流，无需 API 密钥，配置极少。
- **遗留优先（Brownfield-first）**：在 0→1 之外同样表现出色。OpenSpec 将事实来源与提案分离：`openspec/specs/`（当前事实）与 `openspec/changes/`（拟议更新）。这让 diff 在各项功能之间清晰且可控。
- **变更追踪**：proposals、tasks 与 spec deltas 集中在一起；归档会把已批准的更新合并回 specs。
- **对比 spec-kit 与 Kiro**：它们擅长全新功能（0→1）。OpenSpec 在修改既有行为（1→n）时也表现出色，尤其是当更新横跨多个 specs 时。

完整对比见 [OpenSpec 如何对比](#how-openspec-compares)。

## 工作原理

```
┌────────────────────┐
│ Draft Change       │
│ Proposal           │
└────────┬───────────┘
         │ share intent with your AI
         ▼
┌────────────────────┐
│ Review & Align     │
│ (edit specs/tasks) │◀──── feedback loop ──────┐
└────────┬───────────┘                          │
         │ approved plan                        │
         ▼                                      │
┌────────────────────┐                          │
│ Implement Tasks    │──────────────────────────┘
│ (AI writes code)   │
└────────┬───────────┘
         │ ship the change
         ▼
┌────────────────────┐
│ Archive & Update   │
│ Specs (source)     │
└────────────────────┘

1. Draft a change proposal that captures the spec updates you want.
2. Review the proposal with your AI assistant until everyone agrees.
3. Implement tasks that reference the agreed specs.
4. Archive the change to merge the approved updates back into the source-of-truth specs.
```

## 快速开始

### 支持的 AI 工具

<details>
<summary><strong>原生斜杠命令</strong>（点击展开）</summary>

这些工具内置了 OpenSpec 命令。在提示时选择 OpenSpec 集成。

| Tool | Commands |
|------|----------|
| **Amazon Q Developer** | `@openspec-proposal`, `@openspec-apply`, `@openspec-archive` (`.amazonq/prompts/`) |
| **Antigravity** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.agent/workflows/`) |
| **Auggie (Augment CLI)** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.augment/commands/`) |
| **Claude Code** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` |
| **Cline** | Workflows in `.clinerules/workflows/` directory (`.clinerules/workflows/openspec-*.md`) |
| **CodeBuddy Code (CLI)** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.codebuddy/commands/`) — see [docs](https://www.codebuddy.ai/cli) |
| **Codex** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (global: `~/.codex/prompts`, auto-installed) |
| **Continue** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.continue/prompts/`) |
| **CoStrict** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.cospec/openspec/commands/`) — see [docs](https://costrict.ai)|
| **Crush** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.crush/commands/openspec/`) |
| **Cursor** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` |
| **Factory Droid** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.factory/commands/`) |
| **Gemini CLI** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.gemini/commands/openspec/`) |
| **GitHub Copilot** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.github/prompts/`) |
| **iFlow (iflow-cli)** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.iflow/commands/`) |
| **Kilo Code** | `/openspec-proposal.md`, `/openspec-apply.md`, `/openspec-archive.md` (`.kilocode/workflows/`) |
| **OpenCode** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` |
| **Qoder** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.qoder/commands/openspec/`) — see [docs](https://qoder.com) |
| **Qwen Code** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.qwen/commands/`) |
| **RooCode** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.roo/commands/`) |
| **Windsurf** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.windsurf/workflows/`) |

Kilo Code 会自动发现团队工作流。将生成的文件保存在 `.kilocode/workflows/` 下，并通过命令面板用 `/openspec-proposal.md`、`/openspec-apply.md` 或 `/openspec-archive.md` 触发它们。

</details>

<details>
<summary><strong>兼容 AGENTS.md</strong>（点击展开）</summary>

这些工具会自动从 `openspec/AGENTS.md` 读取工作流指令。如果它们需要提醒，请要求它们遵循 OpenSpec 工作流。进一步了解 [AGENTS.md 约定](https://agents.md/)。

| Tools |
|-------|
| Amp • Jules • Others |

</details>

### 安装与初始化

#### 前置条件
- **Node.js >= 20.19.0** - 用 `node --version` 检查你的版本

#### 第 1 步：全局安装 CLI

**方案 A：使用 npm**

```bash
npm install -g @fission-ai/openspec@latest
```

验证安装：
```bash
openspec --version
```

**方案 B：使用 Nix（NixOS 与 Nix 包管理器）**

免安装直接运行 OpenSpec：
```bash
nix run github:Fission-AI/OpenSpec -- init
```

或安装到你的 profile：
```bash
nix profile install github:Fission-AI/OpenSpec
```

或在 `flake.nix` 中添加到你的开发环境：
```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:Fission-AI/OpenSpec";
  };

  outputs = { nixpkgs, openspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ openspec.packages.x86_64-linux.default ];
    };
  };
}
```

验证安装：
```bash
openspec --version
```

#### 第 2 步：在你的项目中初始化 OpenSpec

进入你的项目目录：
```bash
cd my-project
```

运行初始化：
```bash
openspec init
```

**初始化过程中会发生什么：**
- 系统会提示你选择任意原生支持的 AI 工具（Claude Code、CodeBuddy、Cursor、OpenCode、Qoder 等）；其他助手始终依赖共享的 `AGENTS.md` 桩文件
- OpenSpec 会为你所选的工具自动配置斜杠命令，并始终在项目根目录写入一个受管理的 `AGENTS.md` 交接文件
- 会在你的项目中创建新的 `openspec/` 目录结构

**设置完成后：**
- 主要 AI 工具无需额外配置即可触发 `/openspec` 工作流
- 运行 `openspec list` 以验证设置并查看进行中的变更
- 如果你的编码助手没有立即显示新的斜杠命令，请重启它。斜杠命令在启动时被加载，
  因此全新启动可确保它们出现

### 可选：填充项目上下文

`openspec init` 完成后，你会收到一条建议的提示词，用于帮助你填充项目上下文：

```text
Populate your project context:
"Please read openspec/project.md and help me fill it out with details about my project, tech stack, and conventions"
```

使用 `openspec/project.md` 定义项目级约定、标准、架构模式，以及应在所有变更中遵循的其他指南。

### 创建你的第一个变更

下面是一个展示完整 OpenSpec 工作流的真实示例。它适用于任何 AI 工具。具备原生斜杠命令的工具会自动识别这些快捷方式。

#### 1. 起草提案
首先请你的 AI 创建一份变更提案：

```text
You: Create an OpenSpec change proposal for adding profile search filters by role and team
     (Shortcut for tools with slash commands: /openspec:proposal Add profile search filters)

AI:  I'll create an OpenSpec change proposal for profile filters.
     *Scaffolds openspec/changes/add-profile-filters/ with proposal.md, tasks.md, spec deltas.*
```

#### 2. 验证与审阅
检查变更是否正确创建，并审阅提案：

```bash
$ openspec list                             # Confirm the change folder exists
$ openspec validate add-profile-filters     # Validate spec formatting
$ openspec show add-profile-filters         # Review proposal, tasks, and spec delta
```

#### 3. 细化 Specs
反复打磨规约，直到符合你的需求：

```text
You: Can you add acceptance criteria for the role and team filters?

AI:  I'll update the spec delta with scenarios for role and team filters.
     *Edits openspec/changes/add-profile-filters/specs/profile/spec.md and tasks.md.*
```

#### 4. 实现变更
一旦 specs 看起来合适，就开始实现：

```text
You: The specs look good. Let's implement this change.
     (Shortcut for tools with slash commands: /openspec:apply add-profile-filters)

AI:  I'll work through the tasks in the add-profile-filters change.
     *Implements tasks from openspec/changes/add-profile-filters/tasks.md*
     *Marks tasks complete: Task 1.1 ✓, Task 1.2 ✓, Task 2.1 ✓...*
```

#### 5. 归档已完成的变更
实现完成后，归档该变更：

```text
AI:  All tasks are complete. The implementation is ready.

You: Please archive the change
     (Shortcut for tools with slash commands: /openspec:archive add-profile-filters)

AI:  I'll archive the add-profile-filters change.
    *Runs: openspec archive add-profile-filters --yes*
     ✓ Change archived successfully. Specs updated. Ready for the next feature!
```

或在终端自行运行命令：
```bash
$ openspec archive add-profile-filters --yes  # Archive the completed change without prompts
```

**注意：** 具备原生斜杠命令的工具（Claude Code、CodeBuddy、Cursor、Codex、Qoder、RooCode）可使用所示快捷方式。所有其他工具通过自然语言请求来"创建 OpenSpec 提案"、"应用 OpenSpec 变更"或"归档变更"。

## 命令参考

```bash
openspec list               # View active change folders
openspec view               # Interactive dashboard of specs and changes
openspec show <change>      # Display change details (proposal, tasks, spec updates)
openspec validate <change>  # Check spec formatting and structure
openspec archive <change> [--yes|-y]   # Move a completed change into archive/ (non-interactive with --yes)
```

## 示例：AI 如何创建 OpenSpec 文件

当你要求你的 AI 助手"添加双因素认证"时，它会创建：

```
openspec/
├── specs/
│   └── auth/
│       └── spec.md           # Current auth spec (if exists)
└── changes/
    └── add-2fa/              # AI creates this entire structure
        ├── proposal.md       # Why and what changes
        ├── tasks.md          # Implementation checklist
        ├── design.md         # Technical decisions (optional)
        └── specs/
            └── auth/
                └── spec.md   # Delta showing additions
```

### AI 生成的 Spec（创建于 `openspec/specs/auth/spec.md`）：

```markdown
# Auth Specification

## Purpose
Authentication and session management.

## Requirements
### Requirement: User Authentication
The system SHALL issue a JWT on successful login.

#### Scenario: Valid credentials
- WHEN a user submits valid credentials
- THEN a JWT is returned
```

### AI 生成的变更 Delta（创建于 `openspec/changes/add-2fa/specs/auth/spec.md`）：

```markdown
# Delta for Auth

## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- WHEN a user submits valid credentials
- THEN an OTP challenge is required
```

### AI 生成的任务（创建于 `openspec/changes/add-2fa/tasks.md`）：

```markdown
## 1. Database Setup
- [ ] 1.1 Add OTP secret column to users table
- [ ] 1.2 Create OTP verification logs table

## 2. Backend Implementation  
- [ ] 2.1 Add OTP generation endpoint
- [ ] 2.2 Modify login flow to require OTP
- [ ] 2.3 Add OTP verification endpoint

## 3. Frontend Updates
- [ ] 3.1 Create OTP input component
- [ ] 3.2 Update login flow UI
```

**重要：** 你无需手动创建这些文件。你的 AI 助手会根据你的需求与现有代码库生成它们。

## 理解 OpenSpec 文件

### Delta 格式

Deltas 是展示 specs 如何变化的"补丁"：

- **`## ADDED Requirements`** - 新增能力
- **`## MODIFIED Requirements`** - 被修改的行为（包含完整的更新文本）
- **`## REMOVED Requirements`** - 已弃用的功能

**格式要求：**
- 使用 `### Requirement: <name>` 作为标题
- 每个 requirement 至少需要一个 `#### Scenario:` 块
- 在 requirement 文本中使用 SHALL/MUST

## OpenSpec 如何对比

### 对比 spec-kit
OpenSpec 的双文件夹模型（`openspec/specs/` 为当前事实，`openspec/changes/` 为拟议更新）将状态与 diff 分离。当你修改既有功能或触及多个 specs 时，它能良好扩展。spec-kit 在全新开发（greenfield/0→1）方面表现出色，但对跨 spec 更新和演进中的功能提供的结构较少。

### 对比 Kiro.dev
OpenSpec 将一项功能的每次变更集中在一个文件夹（`openspec/changes/feature-name/`）中，便于一起追踪相关的 specs、tasks 和 designs。Kiro 将更新分散在多个 spec 文件夹中，可能让功能追踪更困难。

### 对比"无 Specs"
没有 specs，AI 编码助手会从模糊的提示词生成代码，常常遗漏需求或添加不需要的功能。OpenSpec 通过在任何代码写出之前就所需行为达成一致，带来可预测性。

## 团队采用

1. **初始化 OpenSpec** – 在仓库中运行 `openspec init`。
2. **从新功能开始** – 请你的 AI 将即将开展的工作记录为变更提案。
3. **渐进式增长** – 每次变更都会归档进"活"的 specs，记录你的系统。
4. **保持灵活** – 不同团队成员可以使用 Claude Code、CodeBuddy、Cursor 或任何兼容 AGENTS.md 的工具，同时共享同一份 specs。

当有人切换工具时，运行 `openspec update`，以便你的 agents 获取最新指令与斜杠命令绑定。

## 更新 OpenSpec

1. **升级软件包**
   ```bash
   npm install -g @fission-ai/openspec@latest
   ```
2. **刷新 agent 指引**
   - 在每个项目中运行 `openspec update`，以重新生成 AI 指引并确保最新的斜杠命令生效。

## 实验性特性

<details>
<summary><strong>🧪 OPSX：灵活、迭代式工作流</strong>（仅限 Claude Code）</summary>

**为何存在：**
- 标准工作流被锁定——你无法调整指令或进行自定义
- 当 AI 输出不佳时，你无法自行改进提示词
- 对所有人采用相同工作流，无法贴合你团队的运作方式

**有何不同：**
- **可 hack**——自行编辑模板与 schemas，立即测试，无需重建
- **细粒度**——每个 artifact 都有各自的指令，可单独测试与调整
- **可自定义**——定义你自己的工作流、artifacts 与依赖
- **灵活**——没有阶段门禁，随时更新任何 artifact

```
You can always go back:

  proposal ──→ specs ──→ design ──→ tasks ──→ implement
     ▲           ▲          ▲                    │
     └───────────┴──────────┴────────────────────┘
```

| 命令 | 作用 |
|---------|--------------|
| `/opsx:new` | 开始一个新变更 |
| `/opsx:continue` | 创建下一个 artifact（基于已就绪的内容） |
| `/opsx:ff` | 快进（一次性生成所有规划 artifact） |
| `/opsx:apply` | 实现任务，按需更新 artifacts |
| `/opsx:archive` | 完成后归档 |

**设置：** `openspec experimental`

[完整文档 →](docs/opsx.md)

</details>

<details>
<summary><strong>遥测（Telemetry）</strong> – OpenSpec 收集匿名用量统计（退出：<code>OPENSPEC_TELEMETRY=0</code>）</summary>

我们仅收集命令名称和版本，以了解使用模式。不收集参数、路径、内容或个人身份信息（PII）。在 CI 中自动禁用。

**退出：** `export OPENSPEC_TELEMETRY=0` 或 `export DO_NOT_TRACK=1`

</details>

## 贡献

- 安装依赖：`pnpm install`
- 构建：`pnpm run build`
- 测试：`pnpm test`
- 本地开发 CLI：`pnpm run dev` 或 `pnpm run dev:cli`
- 约定式提交（单行）：`type(scope): subject`

<details>
<summary><strong>维护者与顾问</strong></summary>

有关帮助指导项目的核心维护者与顾问名单，请参见 [MAINTAINERS.md](MAINTAINERS.md)。

</details>

## 许可证

MIT
