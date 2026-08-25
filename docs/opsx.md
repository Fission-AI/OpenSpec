# OPSX 工作流

> 欢迎在 [Discord](https://discord.gg/YctCnvvshC) 上提出反馈。

## 它是什么？

OPSX 现在是 OpenSpec 的标准工作流。

它是面向 OpenSpec change 的一个**流动、迭代式的工作流**。不再有僵化的阶段——只有你可以随时采取的行动。

## 它为何存在

遗留的 OpenSpec 工作流能用，但它是**锁死的**：

- **指令是硬编码的** —— 埋在 TypeScript 里，你无法更改
- **全有或全无** —— 一条大命令创建一切，无法单独测试各个部分
- **固定结构** —— 对所有人都是同一套工作流，无法定制
- **黑盒** —— 当 AI 输出糟糕时，你无法微调 prompt

**OPSX 把它打开了。** 现在任何人都能：

1. **试验指令** —— 编辑一个模板，看 AI 是否做得更好
2. **细粒度测试** —— 独立校验每个 artifact 的指令
3. **定制工作流** —— 定义你自己的 artifact 与依赖
4. **快速迭代** —— 改一个模板，立即测试，无需重新构建

```
Legacy workflow:                      OPSX:
┌────────────────────────┐           ┌────────────────────────┐
│  Hardcoded in package  │           │  schema.yaml           │◄── You edit this
│  (can't change)        │           │  templates/*.md        │◄── Or this
│        ↓               │           │        ↓               │
│  Wait for new release  │           │  Instant effect        │
│        ↓               │           │        ↓               │
│  Hope it's better      │           │  Test it yourself      │
└────────────────────────┘           └────────────────────────┘
```

**这是为所有人准备的：**
- **团队** —— 创建契合你们实际工作方式的工作流
- **高级用户** —— 调整 prompt 以获得更适合你代码库的 AI 输出
- **OpenSpec 贡献者** —— 无需发布新版本即可试验新方法

我们都还在学习什么最有效。OPSX 让我们共同学习。

## 用户体验

**线性工作流的问题：**
你“处于规划阶段”，然后“处于实现阶段”，然后“完成”。但真实的工作并非如此运作。你实现某些东西，意识到设计错了，需要更新 spec，继续实现。线性阶段与工作的实际发生方式相抵触。

**OPSX 的思路：**
- **行动，而非阶段** —— 创建、实现、更新、归档 —— 随时可以做其中任何一件
- **依赖是助推器** —— 它们展示什么是可能的，而非下一步必须做什么

```
  proposal ──→ specs ──→ design ──→ tasks ──→ implement
```

## 设置

```bash
# Make sure you have openspec installed — skills are automatically generated
openspec init
```

这会在 `.claude/skills/`（或等价位置）中创建 skill，供 AI 编码助手自动检测。

默认情况下，OpenSpec 使用 `core` 工作流 profile（`propose`、`explore`、`apply`、`update`、`sync`、`archive`）。如果你想要扩展工作流命令（`new`、`continue`、`ff`、`verify`、`bulk-archive`、`onboard`），请用 `openspec config profile` 配置它们，并用 `openspec update` 应用。

在设置过程中，会提示你创建一个**项目配置**（`openspec/config.yaml`）。这是可选的，但推荐。

## 项目配置

项目配置让你可以设置默认值，并向所有 artifact 注入项目特定的上下文。

### 创建配置

配置在 `openspec init` 期间创建，或手动创建：

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  API conventions: RESTful, JSON responses
  Testing: Vitest for unit tests, Playwright for e2e
  Style: ESLint with Prettier, strict TypeScript

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format for scenarios
  design:
    - Include sequence diagrams for complex flows
```

### 配置字段

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `schema` | string | 新 change 的默认 schema（例如 `spec-driven`） |
| `context` | string | 注入到所有 artifact 指令中的项目上下文 |
| `rules` | object | 逐 artifact 规则，以 artifact ID 为键 |

### 它如何工作

**schema 优先级**（从高到低）：
1. CLI 标志（`--schema <name>`）
2. change 元数据（change 目录中的 `.openspec.yaml`）
3. 项目配置（`openspec/config.yaml`）
4. 默认（`spec-driven`）

**上下文注入：**
- 上下文被前置到每个 artifact 的指令之前
- 包裹在 `<context>...</context>` 标签中
- 帮助 AI 理解你项目的约定

**规则注入：**
- 规则只注入到匹配的 artifact 中
- 包裹在 `<rules>...</rules>` 标签中
- 出现在上下文之后、模板之前

### 按 schema 划分的 artifact ID

**spec-driven**（默认）：
- `proposal` —— Change proposal（变更提案）
- `specs` —— Specifications（规约）
- `design` —— Technical design（技术设计）
- `tasks` —— Implementation tasks（实现任务）

### 配置校验

- `rules` 中未知的 artifact ID 会生成警告
- schema 名称会根据可用 schema 进行校验
- 上下文有 50KB 的大小限制
- 无效的 YAML 会附带行号报告

### 故障排查

**"rules 中存在未知的 artifact ID: X"**
- 检查 artifact ID 是否与你的 schema 匹配（见上方列表）
- 运行 `openspec schemas --json` 查看每个 schema 的 artifact ID

**配置未被应用：**
- 确保文件位于 `openspec/config.yaml`（而非 `.yml`）
- 用校验器检查 YAML 语法
- 配置更改会立即生效（无需重启）

**上下文过大：**
- 上下文限制为 50KB
- 改为摘要或链接到外部文档

## 命令

| 命令 | 它执行的操作 |
|---------|--------------|
| `/opsx:propose` | 一步创建 change 并生成规划 artifact（默认快速路径） |
| `/opsx:explore` | 理清思路、调查问题、澄清 requirement |
| `/opsx:new` | 开始一个新的 change 脚手架（扩展工作流） |
| `/opsx:continue` | 创建下一个 artifact（扩展工作流） |
| `/opsx:ff` | 快进规划 artifact（扩展工作流） |
| `/opsx:apply` | 实现任务，按需更新 artifact |
| `/opsx:update` | 修订 change 的规划 artifact 并保持一致 |
| `/opsx:verify` | 对照 artifact 校验实现（扩展工作流） |
| `/opsx:sync` | 将 delta spec 合并进主 spec（可选） |
| `/opsx:archive` | 完成后归档 |
| `/opsx:bulk-archive` | 归档多个已完成的 change（扩展工作流） |
| `/opsx:onboard` | 端到端 change 的引导式走查（扩展工作流） |

## 用法

### 探索一个想法
```
/opsx:explore
```
理清思路、调查问题、比较方案。无需任何结构——只是一个思路伙伴。当洞见成熟时，过渡到 `/opsx:propose`（默认）或 `/opsx:new`/`/opsx:ff`（扩展）。

### 开始一个新的 change
```
/opsx:propose
```
创建 change 并生成实现前所需的规划 artifact。

如果你已启用扩展工作流，可以改用：

```text
/opsx:new        # scaffold only
/opsx:continue   # create one artifact at a time
/opsx:ff         # create all planning artifacts at once
```

### 创建 artifact
```
/opsx:continue
```
根据依赖显示哪些已就绪可创建，然后创建一个 artifact。反复使用以渐进式构建你的 change。

```
/opsx:ff add-dark-mode
```
一次性创建所有规划 artifact。当你对要构建的内容有清晰图景时使用。

### 实现（流动的部分）
```
/opsx:apply
```
逐条处理任务，边做边勾选。如果你在同时处理多个 change，可以运行 `/opsx:apply <name>`；否则它应从对话中推断，若无法判断则提示你选择。

### 更新一个 change
```
/opsx:update add-dark-mode - we're storing the theme in a cookie now
```
修订 change 现有的规划 artifact 并保持一致——以任意方向（对 design 的编辑可能回荡到 proposal）。仅限规划 artifact：它从不编辑代码，也从不创建缺失的 artifact（那是 `/opsx:continue`）。每次编辑都会先与你确认。如果 change 已经实现，它会建议 `/opsx:apply`，使代码赶上修订后的计划。若你的修订改变了 change 的*意图*，请改为从头开始——见 [何时更新 vs. 从头开始](#when-to-update-vs-start-fresh)。

### 同步 delta spec
```text
/opsx:sync
```
将当前 change 的 delta spec 合并进你的主 `openspec/specs/`，而不归档——change 保持活动状态。它会应用整个 delta：`## REMOVED` 下的 requirement 会从主 spec 中删除，被重命名的 requirement 会就地改标题，而 delta 未提及的内容则保持不动。sync 是可选的——如果尚未 sync，archive 会先提示你 sync。当你想在归档前更新主 spec、当某个并行 change 需要构建在刚添加的 spec 之上，或想在归档前审查合并后的主 spec 时，可以使用它。

### 收尾
```
/opsx:archive   # Move to archive when done (prompts to sync specs if needed)
```

## 何时更新 vs. 从头开始

在实现之前，你随时可以编辑 proposal 或 specs。但精修何时变成“这是不同的工作”？

### 提案捕获了什么

一个 proposal 定义了三件事：
1. **意图（Intent）** —— 你在解决什么问题？
2. **范围（Scope）** —— 哪些在内、哪些在外？
3. **方法（Approach）** —— 你将如何解决它？

问题是：哪个变了，变了多少？

### 在以下情况更新现有 change：

**意图相同，执行被细化**
- 你发现了之前未考虑的边界情况
- 方法需要调整，但目标未变
- 实现揭示设计稍有偏差

**范围收窄**
- 你意识到完整范围太大，想先交付 MVP
- “Add dark mode” → “Add dark mode toggle (system preference in v2)”

**学习驱动的修正**
- 代码库的结构与你设想的不同
- 某个依赖不如预期那样工作
- “Use CSS variables” → “Use Tailwind's dark: prefix instead”

### 在以下情况开始新 change：

**意图根本改变**
- 问题本身现在不同了
- “Add dark mode” → “Add comprehensive theme system with custom colors, fonts, spacing”

**范围爆炸**
- change 增长太多，本质上变成了不同的工作
- 原始提案在更新后将无法辨认
- “Fix login bug” → “Rewrite auth system”

**原始 change 可完成**
- 原始 change 可以被标记为“done”
- 新工作独立存在，而非一次精修
- 完成 “Add dark mode MVP” → 归档 → 新 change “Enhance dark mode”

### 启发式方法

```
                        ┌─────────────────────────────────────┐
                        │     Is this the same work?          │
                        └──────────────┬──────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
             Same intent?      >50% overlap?      Can original
             Same problem?     Same scope?        be "done" without
                    │                  │          these changes?
                    │                  │                  │
          ┌────────┴────────┐  ┌──────┴──────┐   ┌───────┴───────┐
          │                 │  │             │   │               │
         YES               NO YES           NO  NO              YES
          │                 │  │             │   │               │
          ▼                 ▼  ▼             ▼   ▼               ▼
       UPDATE            NEW  UPDATE       NEW  UPDATE          NEW
```

| 测试 | 更新 | 新 change |
|------|--------|------------|
| **身份（Identity）** | “同一件事，被细化” | “不同的工作” |
| **范围重叠（Scope overlap）** | 重叠 >50% | 重叠 <50% |
| **完成度（Completion）** | 没有这些更改就无法“done” | 可以完成原始工作，新工作独立存在 |
| **叙事（Story）** | 更新链讲述连贯的故事 | 补丁会比澄清造成更多混乱 |

### 原则

> **更新保留上下文。新 change 提供清晰度。**
>
> 当你思考的历史有价值时，选择更新。
> 当重新开始会比打补丁更清晰时，选择新的 change。

把它想象成 git 分支：
- 在同一功能上工作时持续提交
- 当确实是全新工作时，开启一个新分支
- 有时合并一个部分功能，并为第二阶段从头开始

## 有什么不同？

| | 遗留（`/openspec:proposal`） | OPSX（`/opsx:*`） |
|---|---|---|
| **结构** | 一份庞大的提案文档 | 带有依赖的离散 artifact |
| **工作流** | 线性阶段：plan → implement → archive | 流动的行动 —— 随时做任意事情 |
| **迭代** | 回头很别扭 | 边学边更新 artifact |
| **定制** | 固定结构 | schema 驱动（定义你自己的 artifact） |

**关键洞见：** 工作不是线性的。OPSX 不再假装它是。

## 架构深入解析

本节解释 OPSX 在底层如何运作，以及它与遗留工作流的区别。
本节中的示例使用扩展命令集（`new`、`continue` 等）；默认 `core` 用户可以将相同的流程映射到 `propose → apply → sync → archive`。

### 理念：阶段 vs. 行动

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEGACY WORKFLOW                                      │
│                    (Phase-Locked, All-or-Nothing)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │             │
│   │    PHASE     │      │    PHASE     │      │    PHASE     │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│   /openspec:proposal   /openspec:apply      /openspec:archive              │
│                                                                             │
│   • Creates ALL artifacts at once                                          │
│   • Can't go back to update specs during implementation                    │
│   • Phase gates enforce linear progression                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                            OPSX WORKFLOW                                     │
│                      (Fluid Actions, Iterative)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              ┌────────────────────────────────────────────┐                 │
│              │           ACTIONS (not phases)             │                 │
│              │                                            │                 │
│              │   new ◄──► continue ◄──► apply ◄──► archive │                 │
│              │    │          │           │           │    │                 │
│              │    └──────────┴───────────┴───────────┘    │                 │
│              │              any order                     │                 │
│              └────────────────────────────────────────────┘                 │
│                                                                             │
│   • Create artifacts one at a time OR fast-forward                         │
│   • Update specs/design/tasks during implementation                        │
│   • Dependencies enable progress, phases don't exist                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 组件架构

**遗留工作流** 使用 TypeScript 中硬编码的模板：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEGACY WORKFLOW COMPONENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Hardcoded Templates (TypeScript strings)                                  │
│                    │                                                        │
│                    ▼                                                        │
│   Tool-specific configurators/adapters                                      │
│                    │                                                        │
│                    ▼                                                        │
│   Generated Command Files (.claude/commands/openspec/*.md)                  │
│                                                                             │
│   • Fixed structure, no artifact awareness                                  │
│   • Change requires code modification + rebuild                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**OPSX** 使用外部 schema 和一个依赖图引擎：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPSX COMPONENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Schema Definitions (YAML)                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  name: spec-driven                                                  │   │
│   │  artifacts:                                                         │   │
│   │    - id: proposal                                                   │   │
│   │      generates: proposal.md                                         │   │
│   │      requires: []              ◄── Dependencies                     │   │
│   │    - id: specs                                                      │   │
│   │      generates: specs/**/*.md  ◄── Glob patterns                    │   │
│   │      requires: [proposal]      ◄── Enables after proposal           │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Artifact Graph Engine                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • Topological sort (dependency ordering)                           │   │
│   │  • State detection (filesystem existence)                           │   │
│   │  • Rich instruction generation (templates + context)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Skill Files (.claude/skills/openspec-*/SKILL.md)                          │
│                                                                             │
│   • Cross-editor compatible (Claude Code, Cursor, Devin)                    │
│   • Skills query CLI for structured data                                    │
│   • Fully customizable via schema files                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 依赖图模型

artifact 构成有向无环图（DAG）。依赖是**助推器**，而非关卡：

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
                                  │
                                  ▼
                          ┌──────────────┐
                          │ APPLY PHASE  │
                          │ (requires:   │
                          │  tasks)      │
                          └──────────────┘
```

**状态转换：**

```
   BLOCKED ────────────────► READY ────────────────► DONE
      │                        │                       │
   Missing                  All deps               File exists
   dependencies             are DONE               on filesystem
```

### 信息流

**遗留工作流** —— agent 接收静态指令：

```
  User: "/openspec:proposal"
           │
           ▼
  ┌─────────────────────────────────────────┐
  │  Static instructions:                   │
  │  • Create proposal.md                   │
  │  • Create tasks.md                      │
  │  • Create design.md                     │
  │  • Create delta spec files              │
  │                                         │
  │  No awareness of what exists or         │
  │  dependencies between artifacts         │
  └─────────────────────────────────────────┘
           │
           ▼
  Agent creates ALL artifacts in one go
```

**OPSX** —— agent 查询丰富的上下文：

```
  User: "/opsx:continue"
           │
           ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Step 1: Query current state                                             │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec status --change "add-auth" --json                      │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "artifacts": [                                                  │  │
  │  │      {"id": "proposal", "status": "done"},                         │  │
  │  │      {"id": "specs", "status": "ready"},      ◄── First ready      │  │
  │  │      {"id": "design", "status": "ready"},                          │  │
  │  │      {"id": "tasks", "status": "blocked",                          │  │
  │  │       "missingDeps": ["specs", "design"]}                          │  │
  │  │    ]                                                               │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 2: Get rich instructions for ready artifact                        │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec instructions specs --change "add-auth" --json          │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "template": "# Specification\n\n## ADDED Requirements...",      │  │
  │  │    "dependencies": [{"id": "proposal", "path": "...", "done": true}│  │
  │  │    "unlocks": ["tasks"]                                            │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 3: Read dependencies → Create ONE artifact → Show what's unlocked  │
  └──────────────────────────────────────────────────────────────────────────┘
```

### 迭代模型

**遗留工作流** —— 迭代很别扭：

```
  ┌─────────┐     ┌─────────┐     ┌─────────┐
  │/proposal│ ──► │ /apply  │ ──► │/archive │
  └─────────┘     └─────────┘     └─────────┘
       │               │
       │               ├── "Wait, the design is wrong"
       │               │
       │               ├── Options:
       │               │   • Edit files manually (breaks context)
       │               │   • Abandon and start over
       │               │   • Push through and fix later
       │               │
       │               └── No official "go back" mechanism
       │
       └── Creates ALL artifacts at once
```

**OPSX** —— 自然迭代：

```
  /opsx:new ───► /opsx:continue ───► /opsx:apply ───► /opsx:archive
      │                │                  │
      │                │                  ├── "The design is wrong"
      │                │                  │
      │                │                  ▼
      │                │            Just edit design.md
      │                │            and continue!
      │                │                  │
      │                │                  ▼
      │                │         /opsx:apply picks up
      │                │         where you left off
      │                │
      │                └── Creates ONE artifact, shows what's unlocked
      │
      └── Scaffolds change, waits for direction
```

### 自定义 Schema

使用 schema 管理命令创建自定义工作流：

```bash
# Create a new schema from scratch (interactive)
openspec schema init my-workflow

# Or fork an existing schema as a starting point
openspec schema fork spec-driven my-workflow

# Validate your schema structure
openspec schema validate my-workflow

# See where a schema resolves from (useful for debugging)
openspec schema which my-workflow
```

schema 存储在 `openspec/schemas/`（项目本地，纳入版本控制）或 `~/.local/share/openspec/schemas/`（用户全局）。

**schema 结构：**
```
openspec/schemas/research-first/
├── schema.yaml
└── templates/
    ├── research.md
    ├── proposal.md
    └── tasks.md
```

**示例 schema.yaml：**
```yaml
name: research-first
artifacts:
  - id: research        # Added before proposal
    generates: research.md
    requires: []

  - id: proposal
    generates: proposal.md
    requires: [research]  # Now depends on research

  - id: tasks
    generates: tasks.md
    requires: [proposal]
```

**依赖图：**
```
   research ──► proposal ──► tasks
```

### 总结

| 方面 | 遗留 | OPSX |
|--------|----------|------|
| **模板** | 硬编码的 TypeScript | 外部 YAML + Markdown |
| **依赖** | 无（一次性全部） | 带拓扑排序的 DAG |
| **状态** | 基于阶段的心理模型 | 文件系统的存在性 |
| **定制** | 编辑源码、重新构建 | 创建 schema.yaml |
| **迭代** | 阶段锁定 | 流动、可编辑任意内容 |
| **编辑器支持** | 工具特定的 configurator/adapter | 单一 skill 目录 |

## Schemas

schema 定义了存在哪些 artifact 以及它们的依赖。当前可用：

- **spec-driven**（默认）：proposal → specs → design → tasks

```bash
# List available schemas
openspec schemas

# See all schemas with their resolution sources
openspec schema which --all

# Create a new schema interactively
openspec schema init my-workflow

# Fork an existing schema for customization
openspec schema fork spec-driven my-workflow

# Validate schema structure before use
openspec schema validate my-workflow
```

## 提示

- 在提交 change 之前，用 `/opsx:explore` 理清一个想法
- 当你知道想要什么时用 `/opsx:ff`，在探索时用 `/opsx:continue`
- 在 `/opsx:apply` 期间，如果出问题——修复 artifact，然后继续
- 任务通过 `tasks.md` 中的复选框跟踪进度
- 随时检查状态：`openspec status --change "name"`

## 反馈

这还比较粗糙。这是有意为之——我们正在学习什么最有效。

发现了 bug？有想法？在 [Discord](https://discord.gg/YctCnvvshC) 上加入我们，或在 [GitHub](https://github.com/Fission-AI/openspec/issues) 上提交 issue。
