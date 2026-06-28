> **声明**：本文档由 AI 翻译，使用 `mimo-v2-pro` 进行翻译。

# 概念

本指南解释了 OpenSpec 背后的核心理念以及它们如何协作。如需实际使用说明，请参阅[快速开始](getting-started.md)和[工作流](workflows.md)。

## 理念

OpenSpec 围绕四个原则构建：

```
灵活而非僵化       — 无阶段门槛，做有意义的事
迭代而非瀑布       — 边构建边学习，持续改进
简洁而非复杂       — 轻量级设置，最低限度的流程
现有项目优先       — 适用于现有代码库，而非仅限于全新项目
```

### 为什么这些原则重要

**灵活而非僵化。** 传统的规范系统将你锁定在阶段中：先规划，再实现，然后完成。OpenSpec 更加灵活 — 你可以按照对工作有意义的任何顺序创建工件。

**迭代而非瀑布。** 需求会变化，理解会深入。开始时看似合理的方法，在查看代码库后可能不再适用。OpenSpec 接受这一现实。

**简洁而非复杂。** 一些规范框架需要大量的设置、严格的格式或重量级的流程。OpenSpec 不会妨碍你。几秒钟即可初始化，立即开始工作，仅在需要时进行自定义。

**现有项目优先。** 大多数软件工作不是从零开始构建 — 而是修改现有系统。OpenSpec 的增量式方法使得指定对现有行为的更改变得容易，而非仅仅描述新系统。

## 全局概览

OpenSpec 将你的工作组织为两个主要区域：

```
┌─────────────────────────────────────────────────────────────────┐
│                        openspec/                                 │
│                                                                  │
│   ┌─────────────────────┐      ┌──────────────────────────────┐ │
│   │       specs/        │      │         changes/              │ │
│   │                     │      │                               │ │
│   │  真实来源           │◄─────│  提议的修改                   │ │
│   │  系统当前的行为     │ 合并 │  每个更改 = 一个文件夹        │ │
│   │                     │      │  包含工件和增量规范           │ │
│   │                     │      │                               │ │
│   └─────────────────────┘      └──────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Specs** 是真实来源 — 它们描述系统当前的行为。

**Changes** 是提议的修改 — 它们位于独立的文件夹中，直到你准备合并它们。

这种分离是关键。你可以并行处理多个更改而不会冲突。你可以在更改影响主规范之前对其进行审查。当你归档一个更改时，其增量会干净地合并到真实来源中。

## 规范（Specs）

规范使用结构化的需求和场景来描述系统的行为。

### 结构

```
openspec/specs/
├── auth/
│   └── spec.md           # 认证行为
├── payments/
│   └── spec.md           # 支付处理
├── notifications/
│   └── spec.md           # 通知系统
└── ui/
    └── spec.md           # UI 行为和主题
```

按领域组织规范 — 对系统有意义的逻辑分组。常见模式：

- **按功能区域**：`auth/`、`payments/`、`search/`
- **按组件**：`api/`、`frontend/`、`workers/`
- **按限界上下文**：`ordering/`、`fulfillment/`、`inventory/`

### 规范格式

规范包含需求，每个需求都有场景：

```markdown
# 认证规范

## 目的
应用程序的认证和会话管理。

## 需求

### Requirement: 用户认证
系统 SHALL 在成功登录时签发 JWT 令牌。

#### Scenario: 有效凭证
- GIVEN 用户拥有有效凭证
- WHEN 用户提交登录表单
- THEN 返回 JWT 令牌
- AND 用户被重定向到仪表板

#### Scenario: 无效凭证
- GIVEN 无效凭证
- WHEN 用户提交登录表单
- THEN 显示错误消息
- AND 不签发令牌

### Requirement: 会话过期
系统 MUST 在 30 分钟无活动后使会话过期。

#### Scenario: 空闲超时
- GIVEN 已认证的会话
- WHEN 30 分钟无活动
- THEN 会话被无效化
- AND 用户必须重新认证
```

**关键元素：**

| 元素 | 用途 |
|------|------|
| `## Purpose` | 此规范领域的高层次描述 |
| `### Requirement:` | 系统必须具备的特定行为 |
| `#### Scenario:` | 需求在实际中的具体示例 |
| SHALL/MUST/SHOULD | RFC 2119 关键词，指示需求强度 |

### 为什么要这样结构化规范

**需求是"什么"** — 它们陈述系统应该做什么，而不指定实现方式。

**场景是"何时"** — 它们提供可验证的具体示例。好的场景：
- 可测试（你可以为其编写自动化测试）
- 覆盖正常路径和边界情况
- 使用 Given/When/Then 或类似的结构化格式

**RFC 2119 关键词**（SHALL、MUST、SHOULD、MAY）传达意图：
- **MUST/SHALL** — 绝对需求
- **SHOULD** — 推荐，但存在例外
- **MAY** — 可选

### 规范是什么（和不是什么）

规范是**行为契约**，而非实现计划。

好的规范内容：
- 用户或下游系统依赖的可观察行为
- 输入、输出和错误条件
- 外部约束（安全性、隐私、可靠性、兼容性）
- 可测试或可明确验证的场景

规范中应避免：
- 内部类名/函数名
- 库或框架选择
- 逐步实现细节
- 详细的执行计划（这些属于 `design.md` 或 `tasks.md`）

快速检验：
- 如果实现可以在不改变外部可见行为的情况下更改，它可能不属于规范。

### 保持轻量：渐进式严谨

OpenSpec 旨在避免官僚主义。使用最轻量的级别，同时仍保持更改的可验证性。

**精简规范（默认）：**
- 简短的以行为优先的需求
- 清晰的范围和非目标
- 一些具体的验收检查

**完整规范（用于更高风险）：**
- 跨团队或跨仓库的更改
- API/契约更改、迁移、安全/隐私问题
- 歧义可能导致昂贵返工的更改

大多数更改应保持在精简模式。

### 人类 + Agent 协作

在许多团队中，人类探索，Agent 起草工件。预期的循环是：

1. 人类提供意图、上下文和约束。
2. Agent 将其转化为以行为优先的需求和场景。
3. Agent 将实现细节保留在 `design.md` 和 `tasks.md` 中，而非 `spec.md`。
4. 验证在实现前确认结构和清晰度。

这使规范对人类可读，对 Agent 保持一致。

## 更改（Changes）

更改是对系统的提议修改，打包为一个文件夹，包含理解和实现它所需的一切。

### 更改结构

```
openspec/changes/add-dark-mode/
├── proposal.md           # 为什么和做什么
├── design.md             # 怎么做（技术方案）
├── tasks.md              # 实现清单
├── .openspec.yaml        # 更改元数据（可选）
└── specs/                # 增量规范
    └── ui/
        └── spec.md       # ui/spec.md 中的变化
```

每个更改是自包含的。它包含：
- **工件（Artifacts）** — 捕获意图、设计和任务的文档
- **增量规范（Delta specs）** — 正在添加、修改或删除的内容的规范
- **元数据（Metadata）** — 此特定更改的可选配置

### 为什么更改是文件夹

将更改打包为文件夹有几个好处：

1. **一切集中在一起。** 提案、设计、任务和规范在一个地方。无需在不同位置搜索。

2. **并行工作。** 多个更改可以同时存在而不会冲突。在 `add-dark-mode` 工作的同时，`fix-auth-bug` 也可以在进行中。

3. **清晰的历史记录。** 归档时，更改会移动到 `changes/archive/`，并保留其完整上下文。你可以回顾并理解不仅是什么变了，还有为什么变。

4. **便于审查。** 更改文件夹易于审查 — 打开它，阅读提案，检查设计，查看规范增量。

## 工件（Artifacts）

工件是更改中指导工作的文档。

### 工件流程

```
proposal ──────► specs ──────► design ──────► tasks ──────► implement
    │               │             │              │
   why            what           how          steps
 + scope        changes       approach      to take
```

工件相互构建。每个工件为下一个工件提供上下文。

### 工件类型

#### 提案（`proposal.md`）

提案捕获高层次的**意图**、**范围**和**方法**。

```markdown
# Proposal: 添加深色模式

## Intent
用户要求添加深色模式选项，以减少夜间使用时的眼睛疲劳，并匹配系统偏好。

## Scope
范围内：
- 设置中的主题切换
- 系统偏好检测
- 在 localStorage 中持久化偏好

范围外：
- 自定义颜色主题（未来工作）
- 每页主题覆盖

## Approach
使用 CSS 自定义属性进行主题化，结合 React Context 进行状态管理。首次加载时检测系统偏好，允许手动覆盖。
```

**何时更新提案：**
- 范围变化（缩小或扩大）
- 意图明确（更好地理解问题）
- 方法根本性转变

#### 规范（`specs/` 中的增量规范）

增量规范描述相对于当前规范的**变化内容**。参见下面的[增量规范](#增量规范)。

#### 设计（`design.md`）

设计捕获**技术方案**和**架构决策**。

````markdown
# Design: 添加深色模式

## Technical Approach
通过 React Context 管理主题状态以避免属性钻取。CSS 自定义属性实现运行时切换而无需类切换。

## Architecture Decisions

### Decision: Context 优于 Redux
使用 React Context 管理主题状态的原因：
- 简单的二元状态（亮/暗）
- 无复杂的状态转换
- 避免添加 Redux 依赖

### Decision: CSS 自定义属性
使用 CSS 变量而非 CSS-in-JS 的原因：
- 与现有样式表兼容
- 无运行时开销
- 浏览器原生解决方案

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

**何时更新设计：**
- 实现发现方案不可行
- 发现更好的解决方案
- 依赖或约束发生变化

#### 任务（`tasks.md`）

任务是**实现清单** — 带复选框的具体步骤。

```markdown
# Tasks

## 1. 主题基础设施
- [ ] 1.1 创建具有亮/暗状态的 ThemeContext
- [ ] 1.2 添加颜色的 CSS 自定义属性
- [ ] 1.3 实现 localStorage 持久化
- [ ] 1.4 添加系统偏好检测

## 2. UI 组件
- [ ] 2.1 创建 ThemeToggle 组件
- [ ] 2.2 在设置页面添加切换
- [ ] 2.3 更新 Header 以包含快速切换

## 3. 样式
- [ ] 3.1 定义深色主题调色板
- [ ] 3.2 更新组件以使用 CSS 变量
- [ ] 3.3 测试对比度以确保可访问性
```

**任务最佳实践：**
- 将相关任务分组在标题下
- 使用层次编号（1.1、1.2 等）
- 保持任务足够小，可在一次会话中完成
- 完成任务后勾选复选框

## 增量规范（Delta Specs）

增量规范是使 OpenSpec 适用于现有项目开发的关键概念。它们描述**变化内容**，而非重述整个规范。

### 格式

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: 双因素认证
系统 MUST 支持基于 TOTP 的双因素认证。

#### Scenario: 2FA 注册
- GIVEN 用户未启用 2FA
- WHEN 用户在设置中启用 2FA
- THEN 显示用于身份验证器应用设置的 QR 码
- AND 用户必须在激活前使用代码验证

#### Scenario: 2FA 登录
- GIVEN 用户已启用 2FA
- WHEN 用户提交有效凭证
- THEN 呈现 OTP 质询
- AND 仅在有效 OTP 后完成登录

## MODIFIED Requirements

### Requirement: 会话过期
系统 MUST 在 15 分钟无活动后使会话过期。
（之前：30 分钟）

#### Scenario: 空闲超时
- GIVEN 已认证的会话
- WHEN 15 分钟无活动
- THEN 会话被无效化

## REMOVED Requirements

### Requirement: 记住我
（已弃用，改用 2FA。用户应在每个会话中重新认证。）
```

### 增量部分

| 部分 | 含义 | 归档时的操作 |
|------|------|-------------|
| `## ADDED Requirements` | 新行为 | 追加到主规范 |
| `## MODIFIED Requirements` | 修改的行为 | 替换现有需求 |
| `## REMOVED Requirements` | 弃用的行为 | 从主规范中删除 |

### 为什么使用增量而非完整规范

**清晰度。** 增量精确显示变化内容。阅读完整规范，你需要在脑中与当前版本进行对比。

**避免冲突。** 两个更改可以触及同一个规范文件而不会冲突，只要它们修改不同的需求。

**审查效率。** 审查者看到的是更改，而非未更改的上下文。关注重要的部分。

**适用于现有项目。** 大多数工作修改现有行为。增量使修改成为一等公民，而非事后补充。

## 模式（Schemas）

模式定义工作流的工件类型及其依赖关系。

### 模式如何工作

```yaml
# openspec/schemas/spec-driven/schema.yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []              # 无依赖，可以首先创建

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]      # 需要先有 proposal

  - id: design
    generates: design.md
    requires: [proposal]      # 可以与 specs 并行创建

  - id: tasks
    generates: tasks.md
    requires: [specs, design] # 需要 specs 和 design
```

**工件形成依赖图：**

```
                    proposal
                   （根节点）
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
      specs                       design
  （依赖：proposal）          （依赖：proposal）
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
                    tasks
              （依赖：specs, design）
```

**依赖是启用器，而非门槛。** 它们显示可以创建什么，而非你接下来必须创建什么。如果不需要，可以跳过 design。可以在 design 之前或之后创建 specs — 两者都只依赖于 proposal。

### 内置模式

**spec-driven**（默认）

规范驱动开发的标准工作流：

```
proposal → specs → design → tasks → implement
```

适用于：大多数功能工作，你希望在实现前就规范达成一致。

### 自定义模式

为你的团队工作流创建自定义模式：

```bash
# 从头创建
openspec schema init research-first

# 或 fork 现有模式
openspec schema fork spec-driven research-first
```

**自定义模式示例：**

```yaml
# openspec/schemas/research-first/schema.yaml
name: research-first
artifacts:
  - id: research
    generates: research.md
    requires: []           # 先做研究

  - id: proposal
    generates: proposal.md
    requires: [research]   # 基于研究的提案

  - id: tasks
    generates: tasks.md
    requires: [proposal]   # 跳过 specs/design，直接进入 tasks
```

有关创建和使用自定义模式的完整详细信息，请参阅[自定义](customization.md)。

## 归档（Archive）

归档通过将增量规范合并到主规范中并为历史保留更改来完成更改。

### 归档时会发生什么

```
归档前：

openspec/
├── specs/
│   └── auth/
│       └── spec.md ◄────────────────┐
└── changes/                         │
    └── add-2fa/                     │
        ├── proposal.md              │
        ├── design.md                │ 合并
        ├── tasks.md                 │
        └── specs/                   │
            └── auth/                │
                └── spec.md ─────────┘


归档后：

openspec/
├── specs/
│   └── auth/
│       └── spec.md        # 现在包含 2FA 需求
└── changes/
    └── archive/
        └── 2025-01-24-add-2fa/    # 为历史保留
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── auth/
                    └── spec.md
```

### 归档过程

1. **合并增量。** 每个增量规范部分（ADDED/MODIFIED/REMOVED）被应用到相应的主规范。

2. **移动到归档。** 更改文件夹移动到 `changes/archive/`，带有日期前缀以按时间顺序排列。

3. **保留上下文。** 所有工件在归档中保持完整。你可以随时回顾以理解更改的原因。

### 为什么归档很重要

**干净的状态。** 活跃更改（`changes/`）只显示进行中的工作。已完成的工作移出视野。

**审计跟踪。** 归档保留每个更改的完整上下文 — 不仅是什么变了，还有解释为什么的提案、解释如何做的设计以及展示完成工作的任务。

**规范演进。** 随着更改被归档，规范有机增长。每次归档都合并其增量，逐步构建全面的规范。

## 整体协作方式

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENSPEC 流程                                   │
│                                                                              │
│   ┌────────────────┐                                                         │
│   │  1. 开始       │  /opsx:propose (core) 或 /opsx:new (expanded)           │
│   │     变更       │                                                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  2. 创建       │  /opsx:ff 或 /opsx:continue (扩展工作流)                 │
│   │     工件       │  创建 proposal → specs → design → tasks                 │
│   │                │  （基于模式依赖关系）                                    │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  3. 实现       │  /opsx:apply                                            │
│   │     任务       │  执行任务，完成即勾选                                    │
│   │                │◄──── 在学习过程中更新工件                                │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  4. 验证       │  /opsx:verify（可选）                                    │
│   │     工作       │  检查实现是否符合规范                                    │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐     ┌──────────────────────────────────────────────┐   │
│   │  5. 归档       │────►│  增量规范合并到主规范                         │   │
│   │     变更       │     │  变更文件夹移动到 archive/                   │   │
│   └────────────────┘     │  规范成为更新后的真实来源                     │   │
│                          └──────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**良性循环：**

1. 规范描述当前行为
2. 更改提议修改（作为增量）
3. 实现使更改变为现实
4. 归档将增量合并到规范中
5. 规范现在描述新行为
6. 下一个更改基于更新后的规范构建

## 术语表

| 术语 | 定义 |
|------|------|
| **工件（Artifact）** | 更改中的文档（提案、设计、任务或增量规范） |
| **归档（Archive）** | 完成更改并将其增量合并到主规范的过程 |
| **更改（Change）** | 对系统的提议修改，打包为包含工件的文件夹 |
| **增量规范（Delta spec）** | 描述相对于当前规范的变化（ADDED/MODIFIED/REMOVED）的规范 |
| **领域（Domain）** | 规范的逻辑分组（例如，`auth/`、`payments/`） |
| **需求（Requirement）** | 系统必须具备的特定行为 |
| **场景（Scenario）** | 需求的具体示例，通常采用 Given/When/Then 格式 |
| **模式（Schema）** | 工件类型及其依赖关系的定义 |
| **规范（Spec）** | 描述系统行为的规范，包含需求和场景 |
| **真实来源（Source of truth）** | `openspec/specs/` 目录，包含当前一致认可的行为 |

## 后续步骤

- [快速开始](getting-started.md) - 实际的第一步
- [工作流](workflows.md) - 常见模式及使用时机
- [命令](commands.md) - 完整的命令参考
- [自定义](customization.md) - 创建自定义模式和配置项目
