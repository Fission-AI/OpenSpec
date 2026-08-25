# 快速上手 (Getting Started)

本指南讲解在安装并初始化 OpenSpec 之后，它是如何工作的。如需安装说明，请参阅[主 README](../README.md#quick-start) 或[安装指南](installation.md)。整套文档还没看全？[文档首页](README.md) 为你梳理了全部内容。

> **这些命令该在哪里输入？** 只有两个地方，而把它们搞混是最常见的早期失误。
>
> - `openspec ...` 命令（如 `openspec init`）在**终端**中运行。
> - `/opsx:...` 命令（如 `/opsx:propose`）在你的 **AI 助手的聊天框**中运行，也就是你让它写代码的同一个输入框。
>
> 没有需要单独启动的"交互模式"。你只需在聊天里输入斜杠命令，助手就会接管后续工作。完整说明见[命令工作原理](how-commands-work.md)。

## 最初的五分钟

整个循环，每一步都标注了发生的位置：

```text
TERMINAL   $ npm install -g @fission-ai/openspec@latest
TERMINAL   $ cd your-project && openspec init
AI CHAT      /opsx:explore                    (optional: think it through first)
AI CHAT      /opsx:propose add-dark-mode      (AI drafts the plan; you review it)
AI CHAT      /opsx:apply                      (AI builds it)
AI CHAT      /opsx:archive                    (specs updated, change filed away)
```

只需两步终端操作完成设置，之后你基本都待在聊天里。本指南的其余部分会逐一拆解每个步骤的作用，以及你会看到什么。

**不想自己动手敲终端命令？** 把[安装提示词](installation.md#install-with-your-ai-assistant) 粘贴给你的助手，它会处理这两行命令，然后汇报它创建了什么。

> **还不确定要构建什么？从 `/opsx:explore` 开始。** 它是一个零风险的思想伙伴，会阅读你的代码库、权衡各种方案，并在任何 artifact 或代码产生之前，把一个模糊的想法打磨成具体的计划。思路清晰后，它会把工作移交给 `/opsx:propose`。这是与 AI 协作时最好的一个习惯，否则它很可能会自信地把东西做错。参见[探索指南](explore.md)。

## 工作原理

OpenSpec 帮助你和你的 AI 编码助手在写任何代码之前，先就"要构建什么"达成一致。

**默认快速路径（core 配置文件）：**

```text
/opsx:explore ──► /opsx:propose ──► /opsx:apply ──► /opsx:sync ──► /opsx:archive
   (optional)
```

当你还在琢磨要做什么时，从 `/opsx:explore` 开始；如果已经心中有数，就直接跳到 `/opsx:propose`。Explore 包含在默认 profile 中，所以你随时都能用到它。

**扩展路径（自定义工作流选择）：**

```text
/opsx:new ──► /opsx:ff or /opsx:continue ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

默认的全局 profile 是 `core`，包含 `propose`、`explore`、`apply`、`update`、`sync` 和 `archive`。你可以用 `openspec config profile` 启用扩展工作流命令，然后再运行 `openspec update`。

## OpenSpec 会创建什么

运行 `openspec init` 之后，你的项目会呈现如下结构：

```
openspec/
├── specs/              # Source of truth (your system's behavior)
│   └── <domain>/
│       └── spec.md
├── changes/            # Proposed updates (one folder per change)
│   └── <change-name>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # Delta specs (what's changing)
│           └── <domain>/
│               └── spec.md
└── config.yaml         # Project configuration (optional)
```

**两个关键目录：**

- **`specs/`** —— 事实来源（source of truth）。这些 spec 描述你的系统当前的行为。按 domain 组织（如 `specs/auth/`、`specs/payments/`）。

- **`changes/`** —— 拟议的修改。每个 change 都有自己独立的文件夹，包含相关的所有 artifact。当某个 change 完成时，它的 spec 会合并进主 `specs/` 目录。

## 理解 Artifacts

每个 change 文件夹都包含引导工作的 artifacts：

| Artifact | 作用 |
|----------|------|
| `proposal.md` | "为什么"和"做什么" —— 记录意图、范围与方案 |
| `specs/` | 展示 ADDED/MODIFIED/REMOVED 需求的 delta spec |
| `design.md` | "怎么做" —— 技术方案与架构决策 |
| `tasks.md` | 带勾选框的实现清单 |

**Artifacts 相互依赖：**

```
proposal ──► specs ──► design ──► tasks ──► implement
   ▲           ▲          ▲                    │
   └───────────┴──────────┴────────────────────┘
            update as you learn
```

在实现过程中你随时可以回过头，根据新学到的信息完善早期的 artifact。

## Delta Spec 如何工作

Delta spec 是 OpenSpec 的核心概念。它们展示了相对于当前 spec 正在发生的变化。

### 格式

Delta spec 使用不同的小节来标明变更类型：

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes of inactivity.
(Previously: 60 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

### Archive 时会发生什么

当你 archive 一个 change 时：

1. **ADDED** 需求会被追加到主 spec
2. **MODIFIED** 需求会替换已有版本
3. **REMOVED** 需求会从主 spec 中删除

该 change 文件夹会移动到 `openspec/changes/archive/` 以保留审计历史。

## 示例：你的第一个 Change

我们一步步来看如何给应用添加暗色模式。

### 1. 开始 Change（默认方式）

```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!
```

如果你启用了扩展工作流 profile，也可以分两步完成：先 `/opsx:new`，再 `/opsx:ff`（或增量式地 `/opsx:continue`）。

### 2. 会创建什么

**proposal.md** —— 记录意图：

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage.

## Scope
- Add theme toggle in settings
- Support system preference detection
- Persist preference in localStorage

## Approach
Use CSS custom properties for theming with a React context
for state management.
```

**specs/ui/spec.md** —— 展示新需求的 delta：

```markdown
# Delta for UI

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

#### Scenario: System preference
- GIVEN a user with no saved preference
- WHEN the application loads
- THEN the system's preferred color scheme is used
```

**tasks.md** —— 实现清单：

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
```

### 3. 实现

```
You: /opsx:apply

AI:  Working through tasks...
     ✓ 1.1 Created ThemeContext with light/dark state
     ✓ 1.2 Added CSS custom properties to globals.css
     ✓ 1.3 Implemented localStorage persistence
     ✓ 2.1 Created ThemeToggle component
     ...
     All tasks complete!
```

实现过程中，如果你发现设计需要调整，只需更新对应 artifact 然后继续。

### 4. Archive

```
You: /opsx:archive

AI:  Archiving add-dark-mode...
     ✓ Merged specs into openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/
     Done! Ready for the next feature.
```

你的 delta spec 现在已成为主 spec 的一部分，记录着系统的工作方式。

## 验证与审查

使用 CLI 来查看你的 change：

```bash
# List active changes
openspec list

# View change details
openspec show add-dark-mode

# Validate spec formatting
openspec validate add-dark-mode

# Interactive dashboard
openspec view
```

## 后续步骤

- [先探索](explore.md) —— 用 `/opsx:explore` 在动手前把想法想清楚
- [审查 Change](reviewing-changes.md) —— 在写任何代码之前，检查 AI 起草的计划要看什么
- [编写优秀的 Spec](writing-specs.md) —— 一条有力的 requirement 和 scenario 长什么样
- [在既有项目中使用 OpenSpec](existing-projects.md) —— 从大型遗留（brownfield）代码库起步
- [编辑与迭代 Change](editing-changes.md) —— 更新 artifact、回退、协调手动修改
- [核心概念一览](overview.md) —— 一页纸掌握完整的思维模型
- [示例与配方](examples.md) —— 真实的 change，从开始到结束
- [工作流](workflows.md) —— 常见模式以及何时使用各命令
- [命令](commands.md) —— 所有斜杠命令的完整参考
- [概念](concepts.md) —— 更深入理解 spec、change 和 schema
- [自定义配置](customization.md) —— 让 OpenSpec 按你的方式工作
- [Stores](stores-beta/user-guide.md) —— 需要跨越仓库或团队的规划？把它放在独立的仓库里（beta）
- [FAQ](faq.md) 与[排障](troubleshooting.md) —— 遇到卡点时查看
