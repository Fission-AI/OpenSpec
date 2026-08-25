# 术语表 (Glossary)

所有 OpenSpec 术语集中一处，用平实的语言定义。先扫一遍，其余文档读起来就更快了。

术语按主题分组，每组内按字母排序。

## 核心名词

**Spec。** 一份描述系统某部分如何行为的文档。specs 位于 `openspec/specs/`，按 domain 组织，由 requirements 和 scenarios 构成。spec 是关于"这个软件做什么"那个公认的答案。参见[概念](concepts.md#specs)。

**Source of truth。** 整体上的 `openspec/specs/` 目录。它保存着你系统当前、公认的的行为。changes 对它提出修改；归档则应用这些修改。

**Change。** 一个工作单元，打包为 `openspec/changes/<name>/` 下的一个文件夹。一个 change 持有关于这项工作的所有内容：它的 proposal、design、tasks，以及它引入的 spec 修改。一个 change、一个功能或修复。

**Artifact。** 一个 change 内部的文档。标准 artifacts 是 proposal、delta specs、design 和 tasks。它们按依赖顺序创建，并相互喂给彼此。

**Delta spec。** 一个 change 内部的 spec，只描述正在改变的，使用 `ADDED`、`MODIFIED` 和 `REMOVED` 小节，而不是复述整个 spec。这正是让 OpenSpec 能干净地编辑既有系统的原因。参见[概念](concepts.md#delta-specs)。

**Domain。** 供 specs 使用的逻辑分组，如 `auth/`、`payments/` 或 `ui/`。你选择契合你思考系统方式的 domain。

## spec 的内部

**Requirement。** 系统必须具备的单一行为，通常带一个 RFC 2119 关键字来写："系统 SHALL 在 30 分钟不活动后让 session 过期。" Requirements 陈述*什么*，而不是*如何*。

**Scenario。** 一条 requirement 在运作时的具体、可测试示例，通常采用 Given/When/Then 形式。scenarios 让一条 requirement 可验证：你可以据其写出一个自动化测试。

**RFC 2119 keywords。** 即 MUST、SHALL、SHOULD 和 MAY 这几个词，它们带有关于 requirement 严格程度的标准化含义。MUST 和 SHALL 是绝对的。SHOULD 是推荐，但允许例外。MAY 是可选的。名称源自定义它们的那份互联网标准文档。

## artifacts

**Proposal（`proposal.md`）。** 一个 change 的*为什么*和*做什么*：它的意图、范围和高层方案。你创建的第一个 artifact。

**Design（`design.md`）。** *怎么做*：技术方案、架构决策，以及你预期会动到的文件。对简单 change 是可选的。

**Tasks（`tasks.md`）。** 实现清单，带勾选框。AI 在 `/opsx:apply` 期间照着它推进，并在进行中逐项勾掉。

## 生命周期

**Archive。** 结束一个 change 的动作。它的 delta specs 合并进主 specs，change 文件夹移到 `openspec/changes/archive/YYYY-MM-DD-<name>/`。归档之后，你的 specs 描述新的现实。参见[概念](concepts.md#archive)。

**Sync。** 把一个 change 的 delta specs 合并进主 specs，*但不*归档这个 change。通常是自动的（archive 会主动提出做），但也可以单独作为 `/opsx:sync` 用于长期运行的 change。参见[命令](commands.md#opsxsync)。

## 工作流与命令

**OPSX。** 当前标准的 OpenSpec 工作流，围绕流动的（fluid）动作而非僵化的阶段构建。它的斜杠命令都以 `/opsx:` 开头。参见 [OPSX Workflow](opsx.md)。

**Slash command。** 你输入到 AI 助手聊天里的命令，如 `/opsx:propose`。斜杠命令驱动工作流。它们不是终端命令。参见[命令工作原理](how-commands-work.md)。

**Explore（`/opsx:explore`）。** 那个思想伙伴命令。它阅读你的代码库、比较各种选项，并把一个模糊的想法澄清成一个具体的计划，不创建任何 artifact，也不写代码。只要你遇到问题却还没方案，它就是推荐的起点。参见[先探索](explore.md)。

**CLI。** 你在终端里运行的 `openspec` 程序。它负责设置项目、列出并校验 changes、打开仪表盘、归档。它是 OpenSpec 的终端半边。参见 [CLI](cli.md)。

**Skill。** 一个由指令组成的文件夹（`.../skills/openspec-*/SKILL.md`），你的 AI 助手会自动检测并遵循。skills 是把 OpenSpec 工作流交付给你的助手的、正在兴起的跨工具标准。

**Command file。** 一个按工具划分的斜杠命令文件（`.../commands/opsx-*`）。较旧的投递机制，仍与 skills 一并受支持。你很少直接碰这些文件。

**Profile。** 安装在你项目里的那组斜杠命令。**Core**（默认）是 `propose`、`explore`、`apply`、`update`、`sync`、`archive`。**expanded** 集合额外提供 `new`、`continue`、`ff`、`verify`、`bulk-archive`、`onboard`。用 `openspec config profile` 修改它。

**Delivery。** OpenSpec 为你的工具安装 skills、命令文件，还是两者皆装。全局配置，用 `openspec update` 应用。

## 自定义

**Schema。** 对某个工作流拥有哪些 artifacts、以及它们如何相互依赖的定义。内建默认是 `spec-driven`（proposal → specs → design → tasks）。你可以 fork 它，也可以自己写。参见[自定义配置](customization.md#custom-schemas)。

**Template。** schema 内部的一个 Markdown 文件，塑造 AI 为某个 artifact 生成的内容。编辑模板会立即改变 AI 的输出，无需重建。

**Project config（`openspec/config.yaml`）。** 每个项目的设置：默认 schema、注入到每个规划请求的 `context:`，以及 per-artifact 的 `rules:`。教 OpenSpec 了解你的技术栈和规范的最简单方式。参见[自定义配置](customization.md#project-configuration)。

**Context injection（上下文注入）。** 把项目背景放在 `config.yaml` 的 `context:` 字段里，从而被自动添加到 AI 生成的每个 artifact 中。比指望 AI 去读一个单独的文件更可靠。

**Dependency graph（依赖图）。** 由 artifact 的 `requires:` 关系形成的有向图。它是一个 DAG（有向无环图：箭头只向前指，永不形成环），OpenSpec 用它来判断下一步能创建什么。

**Enablers, not gates（促成者，而非关卡）。** 一个原则：artifact 的依赖展现的是接下来*可能*做什么，而不是接下来*必须*做什么。你可以随时重访并编辑任何 artifact。参见[核心概念一览](overview.md#enablers-not-gates)。

## 跨仓库协调（beta）

这些术语仅当你的规划跨多个仓库时适用。它们处于 beta。大多数用户可以忽略。参见 [Stores 用户指南](stores-beta/user-guide.md)。

**Store。** 一个独立的仓库，它的全部职责就是规划。它拥有你已经熟悉的同一种 `openspec/` 形态（specs 和 changes），外加一个小的身份文件。你在机器上按名字注册它一次，之后任何 OpenSpec 命令都能从任何地方在它上面工作。

**Reference。** 在一个代码仓库的 `openspec/config.yaml` 中，对某 store 的声明，表示该仓库援引它。references 是只读的：该仓库保留自己的 root，而 `openspec instructions` 会获得一个被引用 store 的 specs 索引，每条都附带获取它的确切命令。

**Working context（工作上下文）。** `openspec context` 为当前仓库拼装出的内容：它的 OpenSpec root 加上它引用的每个 store，每个都带如何获取的方法。也就是对"我正在用什么工作？"的回答。

**Workset。** 一组个人、机器本地的文件夹，你一起打开它们（一个 store 搭配你在其上工作的代码仓库）。用 `openspec workset create` 显式创建；这些本地路径的任何内容都不会提交到共享的规划仓库。

## 另见

- [核心概念一览](overview.md)：五个理念，一页纸
- [概念](concepts.md)：长篇讲解
- [命令工作原理](how-commands-work.md)：斜杠命令与 CLI 的区别
