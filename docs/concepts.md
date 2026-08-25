# 核心概念

本指南解释 OpenSpec 背后的核心思想以及它们如何组合在一起。关于实际使用，请参阅 [Getting Started](getting-started.md) 和 [Workflows](workflows.md)。

## 设计理念

OpenSpec 围绕四条原则构建：

```
fluid not rigid         — no phase gates, work on what makes sense
iterative not waterfall — learn as you build, refine as you go
easy not complex        — lightweight setup, minimal ceremony
brownfield-first        — works with existing codebases, not just greenfield
```

### 为何这些原则很重要

**Fluid not rigid.** 传统 spec（规约）系统把你锁死在阶段里：先计划，再实现，然后就结束。OpenSpec 更灵活——你可以按任何对工作有意义的顺序创建 artifact（制品）。

**Iterative not waterfall.** 需求会变化。理解会加深。一开始看起来不错的方案，在看到代码库之后可能并不成立。OpenSpec 拥抱这一现实。

**Easy not complex.** 有些 spec 框架需要大量配置、僵化的格式或沉重的流程。OpenSpec 不挡你的路。几秒钟完成初始化，立即开始工作，只有在需要时才做定制。

**Brownfield-first.** 大多数软件工作不是从零开始，而是修改既有系统。OpenSpec 基于增量（delta）的思路，让你轻松描述对既有行为的修改，而不只是描述新系统。

## 全局概览

OpenSpec 将你的工作组织为两个主要区域：

```
┌────────────────────────────────────────────────────────────────────┐
│                        openspec/                                   │
│                                                                    │
│   ┌─────────────────────┐      ┌───────────────────────────────┐   │
│   │       specs/        │      │         changes/              │   │
│   │                     │      │                               │   │
│   │  Source of truth    │◄─────│  Proposed modifications       │   │
│   │  How your system    │ merge│  Each change = one folder     │   │
│   │  currently works    │      │  Contains artifacts + deltas  │   │
│   │                     │      │                               │   │
│   └─────────────────────┘      └───────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Specs** 是事实来源（source of truth）——它们描述你的系统当前的行为。

**Changes** 是提议的修改——它们保存在独立的文件夹中，直到你准备好合并它们。

这种分离是关键。你可以并行处理多个 change（变更）而不会产生冲突。你可以在 change 影响主 specs 之前先审查它。当你归档（archive）一个 change 时，它的增量（delta）会干净地合并进事实来源。

## Specs

Specs 使用结构化的 requirement（需求）和 scenario（场景）来描述你系统的行为。

### 结构

```
openspec/specs/
├── auth/
│   └── spec.md           # Authentication behavior
├── payments/
│   └── spec.md           # Payment processing
├── notifications/
│   └── spec.md           # Notification system
└── ui/
    └── spec.md           # UI behavior and themes
```

按域（domain）组织 specs——对系统有意义的逻辑分组。常见模式：

- **按功能领域**：`auth/`、`payments/`、`search/`
- **按组件**：`api/`、`frontend/`、`workers/`
- **按限界上下文**：`ordering/`、`fulfillment/`、`inventory/`

### Spec 格式

一个 spec 包含 requirement（需求），每个 requirement 又包含 scenario（场景）：

```markdown
# Auth Specification

## Purpose
Authentication and session management for the application.

## Requirements

### Requirement: User Authentication
The system SHALL issue a JWT token upon successful login.

#### Scenario: Valid credentials
- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard

#### Scenario: Invalid credentials
- GIVEN invalid credentials
- WHEN the user submits login form
- THEN an error message is displayed
- AND no token is issued

### Requirement: Session Expiration
The system MUST expire sessions after 30 minutes of inactivity.

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated
- AND the user must re-authenticate
```

**关键要素：**

| 元素 | 说明 |
|---------|---------|
| `## Purpose` | 对该 spec 所属域的高层描述 |
| `### Requirement:` | 系统必须具备的某一具体行为 |
| `#### Scenario:` | requirement 落地的具体示例 |
| SHALL/MUST/SHOULD | 表示需求强度的 RFC 2119 关键字 |

### 为何如此组织 Spec

**Requirement（需求）是"做什么"**——它们说明系统应该做什么，而不指定实现方式。

**Scenario（场景）是"何时"**——它们提供可被验证的具体示例。好的 scenario：
- 可测试（可以为其编写自动化测试）
- 既覆盖正常路径也覆盖边界情况
- 使用 Given/When/Then 或类似的结构化格式

**RFC 2119 关键字**（SHALL、MUST、SHOULD、MAY）传达意图：
- **MUST/SHALL** — 绝对要求
- **SHOULD** — 推荐，但允许例外
- **MAY** — 可选

### Spec 是什么（以及不是什么）

spec 是一份**行为契约**，而非实现计划。

好的 spec 内容：
- 用户或下游系统依赖的可观测行为
- 输入、输出与错误条件
- 外部约束（安全、隐私、可靠性、兼容性）
- 可被测试或明确验证的 scenario（场景）

spec 中应避免：
- 内部类/函数名
- 库或框架选择
- 逐步的实现细节
- 详细的执行计划（这些属于 `design.md` 或 `tasks.md`）

快速检验：
- 如果实现可以在不改变对外可见行为的情况下变动，那它就很可能不属于 spec。

### 保持轻量：渐进式严谨

OpenSpec 旨在避免官僚化。使用仍能让你验证 change（变更）的最轻量级别。

**精简 spec（默认）：**
- 简短的、行为优先的 requirement（需求）
- 清晰的范围与非目标
- 少量具体的验收检查

**完整 spec（用于更高风险）：**
- 跨团队或跨仓库的变更
- API/契约变更、迁移、安全/隐私相关
- 含糊不清很可能造成昂贵返工的场景

大多数 change 应保持在精简模式。

### 人与 Agent 协作

在许多团队中，由人探索、由 agent 起草 artifact（制品）。期望的循环是：

1. 人提供意图、上下文和约束。
2. Agent 将其转换为行为优先的 requirement（需求）和 scenario（场景）。
3. Agent 将实现细节保留在 `design.md` 和 `tasks.md` 中，而非 `spec.md`。
4. 验证在实现前确认结构与清晰度。

这样能让 spec 对人可读、对 agent 一致。

## Changes（变更）

change 是对你系统提议的修改，打包为一个文件夹，包含理解和实现它所需的全部内容。

### Change 结构

```
openspec/changes/add-dark-mode/
├── proposal.md           # Why and what
├── design.md             # How (technical approach)
├── tasks.md              # Implementation checklist
├── .openspec.yaml        # Change metadata (optional): schema, created, skip_specs, retire_capabilities
└── specs/                # Delta specs
    └── ui/
        └── spec.md       # What's changing in ui/spec.md
```

每个 change 都是自包含的。它包含：
- **Artifacts（制品）**——记录意图、设计和任务的文档
- **Delta specs（增量规约）**——描述正在新增、修改或删除内容的规约
- **Metadata（元数据）**——针对该特定 change 的可选配置

### 为何 Change 是文件夹

将 change 打包为文件夹有几个好处：

1. **一切都在一处。** proposal、design、tasks 和 specs 都放在同一个地方。无需在不同位置翻找。

2. **并行工作。** 多个 change 可以同时存在而互不冲突。在 `fix-auth-bug` 进行中的同时处理 `add-dark-mode`。

3. **清晰的历史。** 归档时，change 会连同其完整上下文一起移动到 `changes/archive/`。你可以回顾并理解不仅是改了什么，还有为什么改。

4. **便于审查。** change 文件夹易于审查——打开它，阅读 proposal，检查 design，查看 spec 增量。

## Artifacts（制品）

artifact（制品）是 change 中指导工作的文档。

### Artifact 流转

```
proposal ──────► specs ──────► design ──────► tasks ──────► implement
    │               │             │              │
   why            what           how          steps
 + scope        changes       approach      to take
```

artifact 彼此建立在前一个之上。每个 artifact 为下一个提供上下文。

### Artifact 类型

#### Proposal（`proposal.md`）

proposal 在高层捕获**意图（intent）**、**范围（scope）**和**方案（approach）**。

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage and match system preferences.

## Scope
In scope:
- Theme toggle in settings
- System preference detection
- Persist preference in localStorage

Out of scope:
- Custom color themes (future work)
- Per-page theme overrides

## Approach
Use CSS custom properties for theming with a React context
for state management. Detect system preference on first load,
allow manual override.
```

**何时更新 proposal：**
- 范围变化（收窄或扩大）
- 意图澄清（对问题有了更好的理解）
- 方案发生根本性转变

#### Specs（`specs/` 中的 delta specs）

delta specs 描述相对于当前 specs 的**变化内容**。参见下面的 [Delta Specs](#delta-specs)。

#### Design（`design.md`）

design 捕获**技术方案**和**架构决策**。

````markdown
# Design: Add Dark Mode

## Technical Approach
Theme state managed via React Context to avoid prop drilling.
CSS custom properties enable runtime switching without class toggling.

## Architecture Decisions

### Decision: Context over Redux
Using React Context for theme state because:
- Simple binary state (light/dark)
- No complex state transitions
- Avoids adding Redux dependency

### Decision: CSS Custom Properties
Using CSS variables instead of CSS-in-JS because:
- Works with existing stylesheet
- No runtime overhead
- Browser-native solution

## Data Flow
```
ThemeProvider (context)
       │
       ▼
ThemeToggle ◄──► localStorage
       │
       ▼
CSS Variables (applied to :root)
```

## File Changes
- `src/contexts/ThemeContext.tsx` (new)
- `src/components/ThemeToggle.tsx` (new)
- `src/styles/globals.css` (modified)
````

**何时更新 design：**
- 实现暴露出该方案行不通
- 发现了更好的方案
- 依赖或约束发生变化

#### Tasks（`tasks.md`）

tasks 是**实现清单**——带勾选框的具体步骤。

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence
- [ ] 1.4 Add system preference detection

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
- [ ] 3.3 Test contrast ratios for accessibility
```

**Task 最佳实践：**
- 将相关 task 归在标题下
- 使用层级编号（1.1、1.2 等）
- 让 task 足够小，能在一个工作时段内完成
- 完成后勾掉对应 task

## Delta Specs（增量规约）

delta specs 是让 OpenSpec 适用于棕地（brownfield）开发的关键概念。它们描述**变化内容**，而非重述整个 spec。

### 格式

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST support TOTP-based two-factor authentication.

#### Scenario: 2FA enrollment
- GIVEN a user without 2FA enabled
- WHEN the user enables 2FA in settings
- THEN a QR code is displayed for authenticator app setup
- AND the user must verify with a code before activation

#### Scenario: 2FA login
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented
- AND login completes only after valid OTP

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 15 minutes of inactivity.
(Previously: 30 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 15 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA. Users should re-authenticate each session.)
```

### Delta 区块

| 区块 | 含义 | 归档时发生什么 |
|---------|---------|------------------------|
| `## ADDED Requirements` | 新增行为 | 追加到主 spec |
| `## MODIFIED Requirements` | 修改的行为 | 替换既有 requirement |
| `## REMOVED Requirements` | 弃用的行为 | 从主 spec 中删除；当 change 声明 `retire_capabilities: true` 时，删除最后一个 requirement 会停用该能力并删除其 spec 文件 |
| `## Purpose` | 全新能力的用途 | 作为所创建主 spec 的 Purpose 种子；当 spec 已存在时被忽略 |

### 为何用 Delta 而非完整 Spec

**清晰。** delta 精确展示变化内容。阅读完整 spec 时，你得在脑中把它和当前版本做 diff。

**避免冲突。** 两个 change 可以触达同一个 spec 文件而不冲突，只要它们修改的是不同的 requirement。

**审查高效。** 审查者看到的是变化，而非未变的上下文。聚焦要紧之处。

**适配棕地。** 大多数工作都是修改既有行为。delta 让修改成为一等公民，而非事后补充。

## Schemas（模式）

schema 定义了一个工作流中的 artifact（制品）类型及其依赖关系。

### Schema 如何运作

```yaml
# openspec/schemas/spec-driven/schema.yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []              # No dependencies, can create first

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]      # Needs proposal before creating

  - id: design
    generates: design.md
    requires: [proposal]      # Can create in parallel with specs

  - id: tasks
    generates: tasks.md
    requires: [specs, design] # Needs both specs and design first
```

**Artifacts 构成一个依赖图：**

```
                    proposal
                   (root node)
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
      specs                       design
   (requires:                  (requires:
    proposal)                   proposal)
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
                    tasks
                (requires:
                specs, design)
```

**依赖是促成者，而非关卡。** 它们表明可以创建什么，而非你必须下一步创建什么。如果不需要 design，可以跳过。你可以先创建 specs 再创建 design，或反之——两者都只依赖 proposal。

### 内置 Schema

**spec-driven**（默认）

规约驱动开发的标准工作流：

```
proposal → specs → design → tasks → implement
```

最适合：大多数希望在实现前就 specs 达成一致的功能开发。

### 自定义 Schema

为团队的流程创建自定义 schema：

```bash
# Create from scratch
openspec schema init research-first

# Or fork an existing one
openspec schema fork spec-driven research-first
```

**自定义 schema 示例：**

```yaml
# openspec/schemas/research-first/schema.yaml
name: research-first
artifacts:
  - id: research
    generates: research.md
    requires: []           # Do research first

  - id: proposal
    generates: proposal.md
    requires: [research]   # Proposal informed by research

  - id: tasks
    generates: tasks.md
    requires: [proposal]   # Skip specs/design, go straight to tasks
```

关于创建和使用自定义 schema 的完整细节，请参阅 [Customization](customization.md)。

## Archive（归档）

归档通过将其 delta specs 合并进主 specs，并保留该 change 的历史记录，来完结一个 change。

### 归档时发生了什么

```
Before archive:

openspec/
├── specs/
│   └── auth/
│       └── spec.md ◄────────────────┐
└── changes/                         │
    └── add-2fa/                     │
        ├── proposal.md              │
        ├── design.md                │ merge
        ├── tasks.md                 │
        └── specs/                   │
            └── auth/                │
                └── spec.md ─────────┘


After archive:

openspec/
├── specs/
│   └── auth/
│       └── spec.md        # Now includes 2FA requirements
└── changes/
    └── archive/
        └── 2025-01-24-add-2fa/    # Preserved for history
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── auth/
                    └── spec.md
```

### 归档流程

1. **合并 delta。** 每个 delta spec 区块（ADDED/MODIFIED/REMOVED）被应用到对应的主 spec。

2. **移动到 archive。** change 文件夹移动到 `changes/archive/`，带有日期前缀以便按时间排序。

3. **保留上下文。** 所有 artifact 完整保留在 archive 中。你随时可以回看，理解一个 change 为何被做出。

### 归档为何重要

**干净的状态。** 活动 change（`changes/`）只显示进行中的工作。已完成的工作被移开。

**审计轨迹。** archive 保留了每个 change 的完整上下文——不仅是改了什么，还有解释原因的 proposal、解释方式的 design，以及展示已完成工作的 tasks。

**Spec 演进。** 随着 change 被归档，specs 有机地增长。每次归档都会合并其 delta，随时间构建出一份全面的规约。

## 它们如何组合在一起

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              OPENSPEC FLOW                                   │
│                                                                              │
│   ┌────────────────┐                                                         │
│   │  1. START      │  /opsx:propose (core) or /opsx:new (expanded)           │
│   │     CHANGE     │                                                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  2. CREATE     │  /opsx:ff or /opsx:continue (expanded workflow)         │
│   │     ARTIFACTS  │  Creates proposal → specs → design → tasks              │
│   │                │  (based on schema dependencies)                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  3. IMPLEMENT  │  /opsx:apply                                            │
│   │     TASKS      │  Work through tasks, checking them off                  │
│   │                │◄──── Update artifacts as you learn                      │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  4. VERIFY     │  /opsx:verify (optional)                                │
│   │     WORK       │  Check implementation matches specs                     │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐     ┌──────────────────────────────────────────────┐    │
│   │  5. ARCHIVE    │────►│  Delta specs merge into main specs           │    │
│   │     CHANGE     │     │  Change folder moves to archive/             │    │
│   └────────────────┘     │  Specs are now the updated source of truth   │    │
│                          └──────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**良性循环：**

1. Specs 描述当前行为
2. Changes 提议修改（以 delta 形式）
3. 实现让修改变为现实
4. Archive 将 delta 合并进 specs
5. Specs 现在描述新行为
6. 下一个 change 在更新后的 specs 之上构建

## 术语表

| 术语 | 定义 |
|------|------------|
| **Artifact** | change 内部的一份文档（proposal、design、tasks 或 delta specs） |
| **Archive** | 完结一个 change 并将其 delta 合并进主 specs 的过程 |
| **Change** | 对系统提议的修改，打包为带有 artifacts 的文件夹 |
| **Delta spec** | 描述相对于当前 specs 的变化（ADDED/MODIFIED/REMOVED）的 spec |
| **Domain** | 用于组织 specs 的逻辑分组（如 `auth/`、`payments/`） |
| **Requirement** | 系统必须具备的具体行为 |
| **Scenario** | requirement 的具体示例，通常采用 Given/When/Then 格式 |
| **Schema** | artifact 类型及其依赖关系的定义 |
| **Spec** | 描述系统行为的规约，包含 requirements 和 scenarios |
| **Source of truth** | `openspec/specs/` 目录，包含当前已达成一致的行为 |

## 后续步骤

- [Getting Started](getting-started.md) - 实用的第一步
- [Workflows](workflows.md) - 常见模式及各自适用场景
- [Commands](commands.md) - 完整命令参考
- [Customization](customization.md) - 创建自定义 schema 并配置你的项目
