> **声明**：本文档由 AI 翻译，使用 `mimo-v2-pro` 进行翻译。

# 迁移到 OPSX

本指南帮助你从旧版 OpenSpec 工作流过渡到 OPSX。迁移过程经过精心设计，力求平滑过渡——你现有的工作会被完整保留，而新系统提供更大的灵活性。

## 有哪些变化？

OPSX 用灵活的、基于操作的方式取代了旧的阶段锁定工作流。以下是关键变化：

| 方面 | 旧版 | OPSX |
|------|------|------|
| **命令** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` | 默认：`/opsx:propose`, `/opsx:apply`, `/opsx:archive`（扩展工作流命令可选） |
| **工作流** | 一次性创建所有制品 | 增量创建或一次性创建——由你选择 |
| **回退** | 笨拙的阶段门控 | 自然回退——随时更新任何制品 |
| **定制化** | 固定结构 | 基于 Schema，完全可自定义 |
| **配置** | 带标记的 `CLAUDE.md` + `project.md` | 简洁的 `openspec/config.yaml` 配置 |

**理念变化：** 工作并非线性的。OPSX 不再假装它是线性的。

---

## 开始之前

### 你现有的工作是安全的

迁移过程以保留为设计原则：

- **`openspec/changes/` 中的活跃变更** —— 完全保留。你可以用 OPSX 命令继续它们。
- **已归档的变更** —— 不受影响。你的历史记录保持完整。
- **`openspec/specs/` 中的主要规约** —— 不受影响。这些是你的事实来源。
- **CLAUDE.md、AGENTS.md 等文件中的内容** —— 保留。仅移除 OpenSpec 标记块；你编写的所有内容都会保留。

### 会被移除的内容

仅移除正在被替换的 OpenSpec 管理的文件：

| 内容 | 原因 |
|------|------|
| 旧版斜杠命令目录/文件 | 已被新的 skills 系统取代 |
| `openspec/AGENTS.md` | 已过时的工作流触发器 |
| `CLAUDE.md`、`AGENTS.md` 等中的 OpenSpec 标记 | 不再需要 |

**各工具的旧版命令位置**（示例——你的工具可能不同）：

- Claude Code: `.claude/commands/openspec/`
- Cursor: `.cursor/commands/openspec-*.md`
- Windsurf: `.windsurf/workflows/openspec-*.md`
- Cline: `.clinerules/workflows/openspec-*.md`
- Roo: `.roo/commands/openspec-*.md`
- GitHub Copilot: `.github/prompts/openspec-*.prompt.md`（仅 IDE 扩展；Copilot CLI 不支持）
- 其他工具（Augment、Continue、Amazon Q 等）

迁移会检测你配置了哪些工具，并清理它们的旧版文件。

移除列表看起来可能很长，但这些都是 OpenSpec 最初创建的文件。你自己的内容永远不会被删除。

### 需要你注意的内容

有一个文件需要手动迁移：

**`openspec/project.md`** —— 这个文件不会被自动删除，因为它可能包含你编写的项目上下文。你需要：

1. 查看其内容
2. 将有用的上下文移动到 `openspec/config.yaml`（参见下方指引）
3. 准备好后删除该文件

**我们做出这个改变的原因：**

旧的 `project.md` 是被动的——代理可能会读取它，也可能不会，可能读了但忘了。我们发现可靠性参差不齐。

新的 `config.yaml` 上下文会**被主动注入到每个 OpenSpec 规划请求中**。这意味着你的项目约定、技术栈和规则在 AI 创建制品时始终存在。可靠性更高。

**权衡取舍：**

由于上下文会注入到每个请求中，你需要保持简洁。专注于真正重要的内容：
- 技术栈和关键约定
- AI 需要知道的非显而易见的约束
- 之前经常被忽略的规则

不用担心做到完美。我们仍在探索最佳实践，随着实验的深入，也会持续改进上下文注入的方式。

---

## 执行迁移

`openspec init` 和 `openspec update` 都能检测旧版文件并引导你完成相同的清理过程。根据你的实际情况选择使用：

- 新安装默认使用 `core` profile（`propose`、`explore`、`apply`、`archive`）。
- 迁移安装会在需要时写入 `custom` profile，以保留你之前安装的工作流。

### 使用 `openspec init`

如果你想添加新工具或重新配置工具设置，运行此命令：

```bash
openspec init
```

init 命令会检测旧版文件并引导你完成清理：

```
Upgrading to the new OpenSpec

OpenSpec now uses agent skills, the emerging standard across coding
agents. This simplifies your setup while keeping everything working
as before.

Files to remove
No user content to preserve:
  • .claude/commands/openspec/
  • openspec/AGENTS.md

Files to update
OpenSpec markers will be removed, your content preserved:
  • CLAUDE.md
  • AGENTS.md

Needs your attention
  • openspec/project.md
    We won't delete this file. It may contain useful project context.

    The new openspec/config.yaml has a "context:" section for planning
    context. This is included in every OpenSpec request and works more
    reliably than the old project.md approach.

    Review project.md, move any useful content to config.yaml's context
    section, then delete the file when ready.

? Upgrade and clean up legacy files? (Y/n)
```

**选择 yes 后会发生什么：**

1. 移除旧版斜杠命令目录
2. 从 `CLAUDE.md`、`AGENTS.md` 等文件中移除 OpenSpec 标记（你的内容保留）
3. 删除 `openspec/AGENTS.md`
4. 在 `.claude/skills/` 中安装新的 skills
5. 创建带有默认 schema 的 `openspec/config.yaml`

### 使用 `openspec update`

如果你只想迁移并将现有工具刷新到最新版本，运行此命令：

```bash
openspec update
```

update 命令也会检测和清理旧版制品，然后刷新生成的 skills/命令以匹配你当前的 profile 和配置设置。

### 非交互式 / CI 环境

用于脚本化迁移：

```bash
openspec init --force --tools claude
```

`--force` 标志跳过提示并自动接受清理。

---

## 将 project.md 迁移到 config.yaml

旧的 `openspec/project.md` 是一个自由格式的 Markdown 文件，用于存放项目上下文。新的 `openspec/config.yaml` 是结构化的，并且——关键的是——**会被注入到每个规划请求中**，因此 AI 工作时你的约定始终存在。

### 迁移前 (project.md)

```markdown
# Project Context

This is a TypeScript monorepo using React and Node.js.
We use Jest for testing and follow strict ESLint rules.
Our API is RESTful and documented in docs/api.md.

## Conventions

- All public APIs must maintain backwards compatibility
- New features should include tests
- Use Given/When/Then format for specifications
```

### 迁移后 (config.yaml)

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  Testing: Jest with React Testing Library
  API: RESTful, documented in docs/api.md
  We maintain backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan for risky changes
  specs:
    - Use Given/When/Then format for scenarios
    - Reference existing patterns before inventing new ones
  design:
    - Include sequence diagrams for complex flows
```

### 关键差异

| project.md | config.yaml |
|------------|-------------|
| 自由格式的 Markdown | 结构化的 YAML |
| 一大块文本 | 分离的上下文和按制品划分的规则 |
| 使用时机不明确 | 上下文出现在所有制品中；规则仅出现在匹配的制品中 |
| 无 schema 选择 | 显式的 `schema:` 字段设置默认工作流 |

### 保留什么，丢弃什么

迁移时要有选择性。问问自己："AI 在*每个*规划请求中都需要这个吗？"

**适合放入 `context:` 的内容：**
- 技术栈（语言、框架、数据库）
- 关键架构模式（monorepo、微服务等）
- 非显而易见的约束（"我们不能使用 X 库，因为……"）
- 经常被忽略的关键约定

**应移至 `rules:` 的内容：**
- 特定制品的格式要求（"在 specs 中使用 Given/When/Then"）
- 审查标准（"proposal 必须包含回滚计划"）
- 这些仅出现在匹配的制品中，使其他请求更精简

**完全省略的内容：**
- AI 已经知道的通用最佳实践
- 可以精简的冗长说明
- 不影响当前工作的历史背景

### 迁移步骤

1. **创建 config.yaml**（如果 init 还未创建）：
   ```yaml
   schema: spec-driven
   ```

2. **添加你的上下文**（保持简洁——这些内容会进入每个请求）：
   ```yaml
   context: |
     Your project background goes here.
     Focus on what the AI genuinely needs to know.
   ```

3. **添加按制品划分的规则**（可选）：
   ```yaml
   rules:
     proposal:
       - Your proposal-specific guidance
     specs:
       - Your spec-writing rules
   ```

4. 将所有有用的内容迁移完成后，**删除 project.md**。

**不要过度思考。** 从要点开始，逐步迭代。如果发现 AI 遗漏了重要内容，就添加上去。如果上下文感觉臃肿，就精简它。这是一个活文档。

### 需要帮助？使用这个 Prompt

如果你不确定如何提炼 project.md，可以问你的 AI 助手：

```
I'm migrating from OpenSpec's old project.md to the new config.yaml format.

Here's my current project.md:
[paste your project.md content]

Please help me create a config.yaml with:
1. A concise `context:` section (this gets injected into every planning request, so keep it tight—focus on tech stack, key constraints, and conventions that often get ignored)
2. `rules:` for specific artifacts if any content is artifact-specific (e.g., "use Given/When/Then" belongs in specs rules, not global context)

Leave out anything generic that AI models already know. Be ruthless about brevity.
```

AI 会帮助你识别哪些是必需的、哪些可以精简。

---

## 新命令

命令可用性取决于 profile：

**默认 (`core` profile)：**

| 命令 | 用途 |
|------|------|
| `/opsx:propose` | 一步创建变更并生成规划制品 |
| `/opsx:explore` | 无结构地梳理思路 |
| `/opsx:apply` | 实施 tasks.md 中的任务 |
| `/opsx:archive` | 完成并归档变更 |

**扩展工作流（自定义选择）：**

| 命令 | 用途 |
|------|------|
| `/opsx:new` | 开始一个新的变更框架 |
| `/opsx:continue` | 创建下一个制品（一次一个） |
| `/opsx:ff` | 快进——一次性创建规划制品 |
| `/opsx:verify` | 验证实现是否匹配规约 |
| `/opsx:sync` | 预览/规约合并，无需归档 |
| `/opsx:bulk-archive` | 一次性归档多个变更 |
| `/opsx:onboard` | 端到端引导式上手工作流 |

使用 `openspec config profile` 启用扩展命令，然后运行 `openspec update`。

### 旧版命令映射

| 旧版 | OPSX 等价命令 |
|------|--------------|
| `/openspec:proposal` | `/opsx:propose`（默认）或 `/opsx:new` 然后 `/opsx:ff`（扩展） |
| `/openspec:apply` | `/opsx:apply` |
| `/openspec:archive` | `/opsx:archive` |

### 新功能

这些功能是扩展工作流命令集的一部分。

**细粒度的制品创建：**
```
/opsx:continue
```
基于依赖关系一次创建一个制品。当你想要审查每个步骤时使用此命令。

**探索模式：**
```
/opsx:explore
```
在承诺变更之前，与伙伴一起梳理思路。

---

## 理解新架构

### 从阶段锁定到灵活流动

旧版工作流强制线性推进：

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │
│    PHASE     │      │    PHASE     │      │    PHASE     │
└──────────────┘      └──────────────┘      └──────────────┘

If you're in implementation and realize the design is wrong?
Too bad. Phase gates don't let you go back easily.
```

OPSX 使用操作（actions）而非阶段（phases）：

```
         ┌───────────────────────────────────────────────┐
         │           ACTIONS (not phases)                │
         │                                               │
         │     new ◄──► continue ◄──► apply ◄──► archive │
         │      │          │           │             │   │
         │      └──────────┴───────────┴─────────────┘   │
         │                    any order                  │
         └───────────────────────────────────────────────┘
```

### 依赖图

制品形成一个有向图。依赖关系是使能器，而非门控：

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

当你运行 `/opsx:continue` 时，它会检查哪些已准备好，并提供下一个可创建的制品。你也可以以任意顺序创建多个已准备好的制品。

### Skills 与 Commands

旧版系统使用工具特定的命令文件：

```
.claude/commands/openspec/
├── proposal.md
├── apply.md
└── archive.md
```

OPSX 使用新兴的 **skills** 标准：

```
.claude/skills/
├── openspec-explore/SKILL.md
├── openspec-new-change/SKILL.md
├── openspec-continue-change/SKILL.md
├── openspec-apply-change/SKILL.md
└── ...
```

Skills 被多种 AI 编程工具识别，并提供更丰富的元数据。

---

## 继续现有变更

你正在进行的变更可以无缝地与 OPSX 命令配合使用。

**有来自旧版工作流的活跃变更？**

```
/opsx:apply add-my-feature
```

OPSX 会读取现有制品，从你中断的地方继续。

**想要为现有变更添加更多制品？**

```
/opsx:continue add-my-feature
```

根据已有内容显示可以创建的下一步制品。

**需要查看状态？**

```bash
openspec status --change add-my-feature
```

---

## 新的配置系统

### config.yaml 结构

```yaml
# 必需：新变更的默认 schema
schema: spec-driven

# 可选：项目上下文（最大 50KB）
# 会被注入到所有制品指令中
context: |
  Your project background, tech stack,
  conventions, and constraints.

# 可选：按制品划分的规则
# 仅注入到匹配的制品中
rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format
  design:
    - Document fallback strategies
  tasks:
    - Break into 2-hour maximum chunks
```

### Schema 解析

确定使用哪个 schema 时，OPSX 按以下顺序检查：

1. **CLI 标志**：`--schema <name>`（最高优先级）
2. **变更元数据**：变更目录中的 `.openspec.yaml`
3. **项目配置**：`openspec/config.yaml`
4. **默认值**：`spec-driven`

### 可用 Schema

| Schema | 制品 | 最适合 |
|--------|------|--------|
| `spec-driven` | proposal → specs → design → tasks | 大多数项目 |

列出所有可用 schema：

```bash
openspec schemas
```

### 自定义 Schema

创建你自己的工作流：

```bash
openspec schema init my-workflow
```

或 fork 现有 schema：

```bash
openspec schema fork spec-driven my-workflow
```

详情参见 [定制化](customization.md)。

---

## 故障排除

### "在非交互模式下检测到旧版文件"

你在 CI 或非交互环境中运行。使用：

```bash
openspec init --force
```

### 迁移后命令未出现

重启你的 IDE。Skills 在启动时被检测。

### "rules 中出现未知的制品 ID"

检查你的 `rules:` 键是否与 schema 的制品 ID 匹配：

- **spec-driven**：`proposal`、`specs`、`design`、`tasks`

运行以下命令查看有效的制品 ID：

```bash
openspec schemas --json
```

### 配置未生效

1. 确保文件位于 `openspec/config.yaml`（不是 `.yml`）
2. 验证 YAML 语法
3. 配置更改立即生效——无需重启

### project.md 未迁移

系统有意保留 `project.md`，因为它可能包含你的自定义内容。请手动查看它，将有用的部分移到 `config.yaml`，然后删除它。

### 想看看哪些内容会被清理？

运行 init 并拒绝清理提示——你会看到完整的检测摘要，而不会进行任何更改。

---

## 快速参考

### 迁移后的文件

```
project/
├── openspec/
│   ├── specs/                    # 不变
│   ├── changes/                  # 不变
│   │   └── archive/              # 不变
│   └── config.yaml               # 新增：项目配置
├── .claude/
│   └── skills/                   # 新增：OPSX skills
│       ├── openspec-propose/     # 默认 core profile
│       ├── openspec-explore/
│       ├── openspec-apply-change/
│       └── ...                   # 扩展 profile 添加 new/continue/ff 等
├── CLAUDE.md                     # OpenSpec 标记已移除，你的内容已保留
└── AGENTS.md                     # OpenSpec 标记已移除，你的内容已保留
```

### 已移除的内容

- `.claude/commands/openspec/` —— 已被 `.claude/skills/` 取代
- `openspec/AGENTS.md` —— 已过时
- `openspec/project.md` —— 迁移到 `config.yaml`，然后删除
- `CLAUDE.md`、`AGENTS.md` 等中的 OpenSpec 标记块

### 命令速查表

```text
/opsx:propose      快速开始（默认 core profile）
/opsx:apply        实施任务
/opsx:archive      完成并归档

# 扩展工作流（如已启用）：
/opsx:new          搭建变更框架
/opsx:continue     创建下一个制品
/opsx:ff           一次性创建规划制品
```

---

## 获取帮助

- **Discord**: [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues**: [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **文档**: [opsx.md](opsx.md) 获取完整的 OPSX 参考
