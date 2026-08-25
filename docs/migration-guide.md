# 迁移到 OPSX

本指南帮助你从旧版 OpenSpec 工作流迁移到 OPSX。迁移过程设计为平滑过渡——你已有的工作会被保留，新系统在灵活性上更胜一筹。

## 有哪些变化？

OPSX 用一套流动、基于动作的方式，取代了旧的、锁定阶段的流程。关键转变如下：

| 方面 | 旧版 | OPSX |
|--------|--------|------|
| **命令** | `/openspec:proposal`、`/openspec:apply`、`/openspec:archive` | 默认：`/opsx:propose`、`/opsx:explore`、`/opsx:apply`、`/opsx:update`、`/opsx:sync`、`/opsx:archive`（扩展工作流命令为可选） |
| **工作流** | 一次性创建所有 artifact | 增量创建或一次性创建——由你选择 |
| **回退** | 笨拙的阶段关卡 | 自然——随时更新任何 artifact |
| **定制** | 固定结构 | 由 schema 驱动，可完全 hack |
| **配置** | 带标记的 `CLAUDE.md` 加 `project.md` | 干净的配置，位于 `openspec/config.yaml` |

**理念变化：** 工作不是线性的。OPSX 不再假装它是。

---

## 开始之前

### 你已有的工作是安全的

迁移过程在设计上就以保留为出发点：

- **`openspec/changes/` 中的活动 change**——完全保留。你可以用 OPSX 命令继续处理它们。
- **已归档的 change**——不受影响。你的历史保持完整。
- **`openspec/specs/` 中的主 specs**——不受影响。它们是你的事实来源（source of truth）。
- **你在 CLAUDE.md、AGENTS.md 等中的内容**——保留。只会移除 OpenSpec 的标记块；你写的一切都保留。

### 哪些会被移除

仅移除正在被替换的、由 OpenSpec 管理的文件：

| 内容 | 原因 |
|------|-----|
| 旧版斜杠命令目录/文件 | 由新的 skills 系统取代 |
| `openspec/AGENTS.md` | 过时的流程触发器 |
| `CLAUDE.md`、`AGENTS.md` 等中的 OpenSpec 标记 | 不再需要 |

**按工具的旧版命令位置**（示例——你的工具可能不同）：

- Claude Code：`.claude/commands/openspec/`
- Cursor：`.cursor/commands/openspec-*.md`
- Devin Desktop（前身为 Windsurf）：`.windsurf/workflows/openspec-*.md`
- Cline：`.clinerules/workflows/openspec-*.md`
- Roo：`.roo/commands/openspec-*.md`
- GitHub Copilot：`.github/prompts/openspec-*.prompt.md`（仅 IDE 扩展；Copilot CLI 不支持）
- Codex：OpenSpec 现在使用规范的 `.agents/skills/openspec-*` 路径。位于旧 `.codex/skills` 路径下的、由 OpenSpec 管理的 `SKILL.md` 文件，只有在替换文件存在后才会被协调；自定义文件和分叉副本保持原位。如果某个未标记的 `.agents` 树已经包含 OpenSpec skills，OpenSpec 会保留其现有的 Codex（`$openspec-*`）或通用（`/openspec-*`）渲染方式，而不会从旧目录猜测。使用 `openspec init` 显式选择 `codex` 以切换归属。旧版 prompt 清理仍只针对 `$CODEX_HOME/prompts` 或 `~/.codex/prompts` 中 OpenSpec 的允许列表文件名。
- 以及其他（Augment、Continue、Amazon Q 等）

迁移会检测你配置了哪些工具，并清理它们的旧版文件。

移除列表可能看起来很长，但这些都是 OpenSpec 最初创建的文件。你自己的内容绝不会被删除。

### 需要你留意的地方

有一个文件需要手动迁移：

**`openspec/project.md`**——这个文件不会被自动删除，因为它可能包含你写的项目上下文。你需要：

1. 审查其内容
2. 将有用的上下文移动到 `openspec/config.yaml`（参见下方指引）
3. 就绪后删除该文件

**我们做出此变更的原因：**

旧的 `project.md` 是被动的——agent 可能读它，可能不读，可能忘记读了什么。我们发现可靠性并不稳定。

新的 `config.yaml` 上下文会**主动注入到每一个 OpenSpec 规划请求中**。这意味着你的项目约定、技术栈和规则在 AI 创建 artifact 时始终在场。可靠性更高。

**权衡之处：**

由于上下文被注入到每个请求中，你会希望保持简洁。聚焦真正要紧的内容：
- 技术栈与关键约定
- AI 需要知道的非显而易见的约束
- 之前经常被忽略的规则

不必纠结于一次做完美。我们仍在摸索什么效果最好，并会在实验过程中改进上下文注入的方式。

---

## 运行迁移

`openspec init` 和 `openspec update` 都会检测旧版文件，并引导你走完相同的清理过程。用哪个取决于你的情形：

- 新安装默认使用 `core` 配置（`propose`、`explore`、`apply`、`update`、`sync`、`archive`）。
- 迁移安装会在需要时写入一个 `custom` 配置，以保留你之前安装的工作流。

### 使用 `openspec init`

如果你希望添加新工具或重新配置要设置哪些工具，运行此命令：

```bash
openspec init
```

init 命令会检测旧版文件，并引导你完成清理：

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

**当你回答 yes 时会发生什么：**

1. 移除旧版斜杠命令目录
2. 从 `CLAUDE.md`、`AGENTS.md` 等中剥离 OpenSpec 标记（你的内容保留）
3. 删除 `openspec/AGENTS.md`
4. 在 `.claude/skills/` 中安装新的 skills
5. 用默认 schema 创建 `openspec/config.yaml`

### 使用 `openspec update`

如果你只想迁移并把现有工具刷新到最新版本，运行此命令：

```bash
openspec update
```

update 命令同样会检测并清理旧版 artifact，然后刷新生成的 skills/命令，以匹配你当前的配置和交付设置。

### 非交互 / CI 环境

用于脚本化迁移：

```bash
openspec init --force --tools claude
```

`--force` 标志会跳过提示并自动接受清理。

这包括清理全局 Codex prompt 目录中由 OpenSpec 管理的 Codex prompt 文件。清理只针对 OpenSpec 的允许列表中的旧版 Codex prompt 文件名，且只有在替换用的 `.agents/skills/openspec-*` skills 存在后才会移除它们，并保留所有其他文件。

---

## 将 project.md 迁移到 config.yaml

旧的 `openspec/project.md` 是一份用于项目上下文的自由格式 markdown 文件。新的 `openspec/config.yaml` 是结构化的，而且——关键的是——**会注入到每个规划请求中**，使你的约定在 AI 工作时始终在场。

### 之前（project.md）

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

### 之后（config.yaml）

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

### 主要差异

| project.md | config.yaml |
|------------|-------------|
| 自由格式 markdown | 结构化 YAML |
| 一整块文本 | 分离的 context 与按 artifact 划分的 rules |
| 何时使用不明确 | context 出现在所有 artifact 中；rules 仅出现在匹配的 artifact 中 |
| 无法选择 schema | 显式的 `schema:` 字段设定默认工作流 |

### 保留什么，舍弃什么

迁移时要有取舍。问自己："AI 在*每个*规划请求中都需要这个吗？"

**适合放入 `context:` 的内容**
- 技术栈（语言、框架、数据库）
- 关键的架构模式（monorepo、微服务等等）
- 非显而易见的约束（"因为……我们不能使用 X 库"）
- 经常被忽略的关键约定

**改放到 `rules:` 中**
- 特定于 artifact 的格式（"在 specs 中使用 Given/When/Then"）
- 审查标准（"proposal 必须包含回滚计划"）
- 这些只出现在匹配的 artifact 中，让其他请求更轻量

**完全不放进去**
- AI 已经知道的通用最佳实践
- 可以总结的冗长解释
- 不影响当前工作的历史上下文

### 迁移步骤

1. **创建 config.yaml**（如果尚未由 init 创建）：
   ```yaml
   schema: spec-driven
   ```

2. **添加你的 context**（保持简洁——它会进入每个请求）：
   ```yaml
   context: |
     Your project background goes here.
     Focus on what the AI genuinely needs to know.
   ```

3. **添加按 artifact 划分的 rules**（可选）：
   ```yaml
   rules:
     proposal:
       - Your proposal-specific guidance
     specs:
       - Your spec-writing rules
   ```

4. **在你迁移完所有有用的内容后，删除 project.md。**

**不要想太多。** 从要点开始，逐步迭代。如果你发现 AI 遗漏了某个重要内容，就加上它。如果上下文显得臃肿，就精简它。这是一份活文档。

### 需要帮助？用这个提示词

如果你不确定如何提炼你的 project.md，可以向你的 AI 助手询问：

```
I'm migrating from OpenSpec's old project.md to the new config.yaml format.

Here's my current project.md:
[paste your project.md content]

Please help me create a config.yaml with:
1. A concise `context:` section (this gets injected into every planning request, so keep it tight—focus on tech stack, key constraints, and conventions that often get ignored)
2. `rules:` for specific artifacts if any content is artifact-specific (e.g., "use Given/When/Then" belongs in specs rules, not global context)

Leave out anything generic that AI models already know. Be ruthless about brevity.
```

AI 会帮你辨别哪些是必不可少的、哪些可以精简。

---

## 新的命令

命令的可用性取决于配置（profile）：

**默认（`core` 配置）：**

| 命令 | 用途 |
|---------|---------|
| `/opsx:propose` | 一步创建 change 并生成规划 artifact |
| `/opsx:explore` | 不带结构地梳理想法 |
| `/opsx:apply` | 根据 tasks.md 实现任务 |
| `/opsx:update` | 修订某个 change 的规划 artifact，并保持它们一致 |
| `/opsx:sync` | 将 delta specs 合并进主 specs |
| `/opsx:archive` | 完结并归档该 change |

**扩展工作流（自定义选择）：**

| 命令 | 用途 |
|---------|---------|
| `/opsx:new` | 启动一个新的 change 脚手架 |
| `/opsx:continue` | 创建下一个 artifact（一次一个） |
| `/opsx:ff` | 快进——一次性创建规划 artifact |
| `/opsx:verify` | 校验实现是否匹配 specs |
| `/opsx:bulk-archive` | 一次性归档多个 change |
| `/opsx:onboard` | 引导式的端到端上手工作流 |

用 `openspec config profile` 启用扩展命令，然后运行 `openspec update`。

### 从旧版的命令映射

| 旧版 | OPSX 对应 |
|--------|-----------------|
| `/openspec:proposal` | `/opsx:propose`（默认）或 `/opsx:new` 后接 `/opsx:ff`（扩展） |
| `/openspec:apply` | `/opsx:apply` |
| `/openspec:archive` | `/opsx:archive` |

### 新能力

这些能力属于扩展工作流命令集。

**细粒度的 artifact 创建：**
```
/opsx:continue
```
基于依赖关系一次创建一个 artifact。当你想逐步审查每个步骤时使用。

**探索模式：**
```
/opsx:explore
```
在承诺做一个 change 之前，与伙伴一起梳理想法。

---

## 理解新架构

### 从锁定阶段到流动

旧版工作流强制线性推进：

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │
│    PHASE     │      │    PHASE     │      │    PHASE     │
└──────────────┘      └──────────────┘      └──────────────┘

If you're in implementation and realize the design is wrong?
Too bad. Phase gates don't let you go back easily.
```

OPSX 使用的是动作，而非阶段：

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

artifact 构成一个有向图。依赖是促成者，而非关卡：

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

当你运行 `/opsx:continue` 时，它会检查已就绪的内容，并提供下一个 artifact。你也可以按任意顺序创建多个已就绪的 artifact。

### Skills 与命令

旧版系统使用特定于工具的命令文件：

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

skills 在多种 AI 编码工具中被识别，并提供更丰富的元数据。

在 OPSX 中，Codex 仅支持 skills。OpenSpec 不再生成 Codex 自定义 prompt 文件；请改用生成的 `.agents/skills/openspec-*` 目录。

---

## 继续已有的 Change

你进行中的 change 可以无缝配合 OPSX 命令使用。

**有一个来自旧版工作流的活动 change？**

```
/opsx:apply add-my-feature
```

OPSX 读取已有的 artifact，并从你停下的地方继续。

**想给已有的 change 添加更多 artifact？**

```
/opsx:continue add-my-feature
```

根据已存在的内容，显示可创建哪些就绪的 artifact。

**需要查看状态？**

```bash
openspec status --change add-my-feature
```

---

## 新的配置系统

### config.yaml 结构

```yaml
# Required: Default schema for new changes
schema: spec-driven

# Optional: Project context (max 50KB)
# Injected into ALL artifact instructions
context: |
  Your project background, tech stack,
  conventions, and constraints.

# Optional: Per-artifact rules
# Only injected into matching artifacts
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

在决定使用哪个 schema 时，OPSX 按顺序检查：

1. **CLI 标志**：`--schema <name>`（最高优先级）
2. **change 元数据**：change 目录中的 `.openspec.yaml`
3. **项目配置**：`openspec/config.yaml`
4. **默认**：`spec-driven`

### 可用的 Schema

| Schema | Artifacts | 最适合 |
|--------|-----------|----------|
| `spec-driven` | proposal → specs → design → tasks | 大多数项目 |

列出所有可用的 schema：

```bash
openspec schemas
```

### 自定义 Schema

创建你自己的工作流：

```bash
openspec schema init my-workflow
```

或分叉已有的一个：

```bash
openspec schema fork spec-driven my-workflow
```

详见 [Customization](customization.md)。

---

## 故障排查

### "Legacy files detected in non-interactive mode"

你正在 CI 或非交互环境中运行。使用：

```bash
openspec init --force
```

### 迁移后命令未出现

重启你的 IDE。skills 在启动时被检测。

### "Unknown artifact ID in rules"

检查你的 `rules:` 键是否匹配你 schema 的 artifact ID：

- **spec-driven**：`proposal`、`specs`、`design`、`tasks`

运行以下命令查看有效的 artifact ID：

```bash
openspec schemas --json
```

### 配置未被应用

1. 确保文件位于 `openspec/config.yaml`（而非 `.yml`）
2. 校验 YAML 语法
3. 配置变更立即生效——无需重启

### project.md 未被迁移

系统有意保留 `project.md`，因为它可能包含你的自定义内容。请手动审查，将有用的部分移到 `config.yaml`，然后删除它。

### 想看看会被清理什么？

运行 init 并拒绝清理提示——你会看到完整的检测摘要，而不会做任何改动。

---

## 快速参考

### 迁移后的文件

```
project/
├── openspec/
│   ├── specs/                    # Unchanged
│   ├── changes/                  # Unchanged
│   │   └── archive/              # Unchanged
│   └── config.yaml               # NEW: Project configuration
├── .claude/
│   └── skills/                   # NEW: OPSX skills
│       ├── openspec-propose/     # default core profile
│       ├── openspec-explore/
│       ├── openspec-apply-change/
│       ├── openspec-update-change/
│       ├── openspec-sync-specs/
│       ├── openspec-archive-change/
│       └── ...                   # expanded profile adds new/continue/ff/etc.
├── CLAUDE.md                     # OpenSpec markers removed, your content preserved
└── AGENTS.md                     # OpenSpec markers removed, your content preserved
```

### 已移除的内容

- `.claude/commands/openspec/` — 被 `.claude/skills/` 取代
- `openspec/AGENTS.md` — 已过时
- `openspec/project.md` — 迁移到 `config.yaml`，然后删除
- `CLAUDE.md`、`AGENTS.md` 等中的 OpenSpec 标记块

### 命令速查表

```text
/opsx:propose      Start quickly (default core profile)
/opsx:apply        Implement tasks
/opsx:archive      Finish and archive

# Expanded workflow (if enabled):
/opsx:new          Scaffold a change
/opsx:continue     Create next artifact
/opsx:ff           Create planning artifacts
```

---

## 获取帮助

- **Discord**：[discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues**：[github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **文档**：[docs/opsx.md](opsx.md) 获取完整的 OPSX 参考
