# 命令

这是 OpenSpec 斜杠命令的参考。这些命令在你的 AI 编码助手的聊天界面中调用（例如 Claude Code、Cursor、Devin Desktop）。

有关工作流模式以及何时使用每个命令，请参见 [Workflows](workflows.md)。有关 CLI 命令，请参见 [CLI](cli.md)。

这些页面使用 `/opsx:<command>` 作为规范名称。部分工具的拼写不同——Cursor 和 GitHub Copilot 注册的是 `/opsx-propose`，Codex 使用 `$openspec-propose`——因此请查阅 [How To Invoke](supported-tools.md#how-to-invoke) 以适配你的工具。OpenSpec 生成的文件已经使用了正确的形式。

## 快速参考

### 默认快速路径（`core` profile）

| 命令 | 用途 |
|---------|---------|
| `/opsx:propose` | 一步创建 change 并生成规划 artifact |
| `/opsx:explore` | 在提交 change 之前理清思路 |
| `/opsx:apply` | 实现 change 中的任务 |
| `/opsx:update` | 修订 change 的规划 artifact 并保持其一致性 |
| `/opsx:sync` | 将 delta spec 合并进主 spec |
| `/opsx:archive` | 归档一个已完成的 change |

### 扩展工作流命令（自定义工作流选择）

| 命令 | 用途 |
|---------|---------|
| `/opsx:new` | 开始一个新的 change 脚手架 |
| `/opsx:continue` | 基于依赖创建下一个 artifact |
| `/opsx:ff` | 快进：一次性创建所有规划 artifact |
| `/opsx:verify` | 校验实现是否与 artifact 匹配 |
| `/opsx:bulk-archive` | 一次性归档多个 change |
| `/opsx:onboard` | 通过完整工作流的引导式教程 |

默认全局 profile 是 `core`。要启用扩展工作流命令，请运行 `openspec config profile`，选择工作流，然后在你的项目中运行 `openspec update`。

---

## 命令参考

### `/opsx:propose`

一步创建一个新的 change 并生成规划 artifact。这是 `core` profile 中默认的起始命令。

**语法：**
```text
/opsx:propose [change-name-or-description]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name-or-description` | 否 | kebab-case 名称或自然语言描述的 change |

**它执行的操作：**
- 创建 `openspec/changes/<change-name>/`
- 生成实现前所需的 artifact（对于 `spec-driven`：proposal、specs、design、tasks）
- 在该 change 准备好进行 `/opsx:apply` 时停止

**示例：**
```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md
     ✓ specs/ui/spec.md
     ✓ design.md
     ✓ tasks.md
     Ready for implementation. Run /opsx:apply.
```

**提示：**
- 用于最快的端到端路径
- 如果你想要逐步的 artifact 控制，请启用扩展工作流并使用 `/opsx:new` + `/opsx:continue`

---

### `/opsx:explore`

> **当你不确定时，从这里开始。** Explore 是一个零负担的思路伙伴：它阅读你的代码库、比较方案，并在任何 change 存在之前把一个模糊的想法锤炼成具体的计划。它随默认 profile 一同发布。完整的案例与更多示例见 [Explore First](explore.md) 指南。

在提交 change 之前理清思路、调查问题并澄清 requirement。

**语法：**
```
/opsx:explore [topic]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `topic` | 否 | 你想探索或调查的主题 |

**它执行的操作：**
- 开启一场无需任何结构的探索性对话
- 调查代码库以回答问题
- 比较方案与思路
- 创建可视化图表来厘清思路
- 当洞见成熟时，可过渡到 `/opsx:propose`（默认）或 `/opsx:new`（扩展工作流）

**示例：**
```text
You: /opsx:explore

AI:  What would you like to explore?

You: How should we handle authentication for the mobile app?

AI:  Let me investigate your current auth setup...
     [Analyzes codebase]

     I see you're using session-based auth for the web app.
     For mobile, we have three main options:

     1. JWT tokens (stateless, works offline)
     2. OAuth2 (if you need third-party login)
     3. Extend current sessions (simpler, but requires connectivity)

     Your API already has CORS configured. Which direction interests you?

You: Let's go with JWT. Can we start a change for that?

AI:  Ready when you are. Run /opsx:propose add-jwt-auth to begin.
```

**提示：**
- 当 requirement 不清晰或你需要调查时使用
- 探索过程中不会创建任何 artifact
- 适合在决策前比较多种方案
- 可以读取文件并搜索代码库

---

### `/opsx:new`

开始一个新的 change 脚手架。创建 change 文件夹，等待你用 `/opsx:continue` 或 `/opsx:ff` 生成 artifact。

该命令属于扩展工作流集（不包含在默认的 `core` profile 中）。

**语法：**
```
/opsx:new [change-name] [--schema <schema-name>]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | change 文件夹的名称（未提供时提示） |
| `--schema` | 否 | 要使用的工作流 schema（默认：来自配置或 `spec-driven`） |

**它执行的操作：**
- 创建 `openspec/changes/<change-name>/` 目录
- 在 change 文件夹中创建 `.openspec.yaml` 元数据文件
- 显示第一个已就绪、可创建的 artifact 模板
- 若未提供则提示输入 change 名称与 schema

**它创建的内容：**
```
openspec/changes/<change-name>/
└── .openspec.yaml    # Change metadata (schema, created date)
```

**示例：**
```
You: /opsx:new add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     Schema: spec-driven

     Ready to create: proposal
     Use /opsx:continue to create it, or /opsx:ff to create all artifacts.
```

**提示：**
- 使用描述性名称：`add-feature`、`fix-bug`、`refactor-module`
- 避免使用通用名称如 `update`、`changes`、`wip`
- schema 也可在项目配置中设置（`openspec/config.yaml`）

---

### `/opsx:continue`

在依赖链中创建下一个 artifact。一次创建一个 artifact，以实现渐进式推进。

**语法：**
```
/opsx:continue [change-name]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要继续的 change（未提供时从上下文推断） |

**它执行的操作：**
- 查询 artifact 依赖图
- 显示哪些 artifact 已就绪、哪些被阻塞
- 创建第一个已就绪的 artifact
- 读取依赖文件以获取上下文
- 显示创建后哪些内容变得可用

**示例：**
```
You: /opsx:continue

AI:  Change: add-dark-mode

     Artifact status:
     ✓ proposal    (done)
     ◆ specs       (ready)
     ◆ design      (ready)
     ○ tasks       (blocked - needs: specs, design)

     Creating specs...

     [Reads proposal.md, creates specs based on requirements]

     ✓ Created openspec/changes/add-dark-mode/specs/ui/spec.md

     Now available: design
     Run /opsx:continue to create the next artifact.
```

**提示：**
- 当你想在继续之前审查每个 artifact 时使用
- 适合需要控制的复杂 change
- 多个 artifact 可能同时变为就绪
- 你可以在继续之前编辑已创建的 artifact

---

### `/opsx:ff`

快进式地创建 artifact。一次性创建所有规划 artifact。

**语法：**
```
/opsx:ff [change-name]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要快进的 change（未提供时从上下文推断） |

**它执行的操作：**
- 按依赖顺序创建所有 artifact
- 通过待办列表跟踪进度
- 在全部 `apply-required` artifact 完成时停止
- 在创建下一个 artifact 之前先读取每个依赖

**示例：**
```
You: /opsx:ff add-dark-mode

AI:  Fast-forwarding add-dark-mode...

     ✓ Creating proposal.md
     ✓ Creating specs/ui/spec.md
     ✓ Creating design.md
     ✓ Creating tasks.md

     All planning artifacts complete!
     Ready for implementation. Run /opsx:apply to begin.
```

**提示：**
- 当你对要构建的内容有清晰图景时使用
- 对直白的 change 比 `/opsx:continue` 更快
- 之后你仍可以编辑 artifact
- 适合中小型功能

---

### `/opsx:apply`

实现 change 中的任务。逐条处理任务列表，编写代码并勾选条目。

**语法：**
```
/opsx:apply [change-name]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要实现的 change（未提供时从上下文推断） |

**它执行的操作：**
- 读取 `tasks.md` 并识别未完成的任务
- 逐条处理任务
- 编写代码、创建文件、按需运行测试
- 用复选框 `[x]` 将任务标记为完成

**示例：**
```
You: /opsx:apply

AI:  Implementing add-dark-mode...

     Reading tasks.md:
     - [ ] 1.1 Create ThemeContext
     - [ ] 1.2 Add CSS custom properties
     - [ ] 1.3 Implement localStorage persistence

     Working on 1.1: Create ThemeContext...
     [Creates src/context/ThemeContext.tsx]

     ✓ 1.1 Complete

     Working on 1.2: Add CSS custom properties...
     [Updates src/styles/globals.css]

     ✓ 1.2 Complete
     ...
```

**提示：**
- 若被打断，可以从离开的地方继续
- 通过指定 change 名称可并行处理多个 change
- 完成状态由 `tasks.md` 中的复选框跟踪

---

### `/opsx:update`

修订一个 change 现有的规划 artifact，并保持彼此一致。仅限规划 artifact——它从不编辑代码。

**语法：**

```text
/opsx:update [change-name]
```

**参数：**

| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要更新的 change（未提供时从上下文推断） |

**它执行的操作：**

- 通过 `openspec status --change <name> --json` 读取 change 的 artifact
- 应用你请求的修订；若你未指明具体 artifact，则审查这些 artifact 是否存在矛盾
- 以任意方向调和其他现有 artifact（对 design 的编辑可能回荡到 proposal）
- 在写入之前，逐个人工确认每次编辑
- 结束时建议下一步：`/opsx:continue`（存在缺失的 artifact）、`/opsx:apply`（将修订后的计划带入代码）或 `/opsx:archive`（全部完成）

**示例：**

```text
You: /opsx:update add-dark-mode - we're storing the theme in a cookie now, not localStorage

AI:  Reading add-dark-mode artifacts...

     The design references localStorage in two places; tasks 1.3 covers
     localStorage persistence; the proposal doesn't mention storage.

     Proposed revisions:
     1. design.md - swap localStorage decision for cookie storage
     2. tasks.md - reword task 1.3 to cookie persistence

     Apply revision 1? (design.md)
```

**提示：**

- 它不会创建缺失的 artifact——那是 `/opsx:continue` 的职责
- 如果 change 已经实现，请接着执行 `/opsx:apply`，使代码与修订后的计划保持一致
- 若你的修订改变了 change 的*意图*，请改用一个新的 change 从头开始（见 [何时更新 vs. 从头开始](opsx.md#when-to-update-vs-start-fresh)）

---

### `/opsx:verify`

校验实现是否与你的 change artifact 匹配。检查完整性、正确性与一致性。

**语法：**
```
/opsx:verify [change-name]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要校验的 change（未提供时从上下文推断） |

**它执行的操作：**
- 检查实现质量的三个维度
- 在代码库中搜索实现证据
- 将问题归类为 CRITICAL、WARNING 或 SUGGESTION
- 不会阻止归档，但会暴露问题

**校验维度：**

| 维度 | 校验内容 |
|-----------|-------------------|
| **Completeness** | 所有任务完成、所有 requirement 已实现、scenario 已覆盖 |
| **Correctness** | 实现符合 spec 意图，边界情况已处理 |
| **Coherence** | 设计决策在代码中得到体现，模式保持一致 |

**示例：**
```
You: /opsx:verify

AI:  Verifying add-dark-mode...

     COMPLETENESS
     ✓ All 8 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "System preference detection" has no test coverage

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "CSS variables" but implementation uses Tailwind classes

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for system preference detection
     2. Update design.md to reflect Tailwind usage, or refactor to use CSS variables
```

**提示：**
- 在归档之前运行，以尽早发现不一致
- 警告不会阻止归档，但提示潜在问题
- 适合在提交前审查 AI 的工作
- 可以揭示 artifact 与实现之间的偏移

---

### `/opsx:sync`

**可选命令。** 将一个 change 的 delta spec 合并进主 spec。若需要，archive 会提示进行 sync，因此你通常无需手动运行它。

**语法：**
```
/opsx:sync [change-name]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要 sync 的 change（未提供时从上下文推断） |

**它执行的操作：**
- 从 change 文件夹读取 delta spec
- 解析 ADDED/MODIFIED/REMOVED/RENAMED 章节
- 将更改合并进主 `openspec/specs/` 目录
- 保留 delta 中未提及的现有内容
- 不会归档 change（保持活动状态）

**示例：**
```text
You: /opsx:sync

AI:  Syncing add-dark-mode delta specs...

     Reading: openspec/changes/add-dark-mode/specs/ui/spec.md
     Target:  openspec/specs/ui/spec.md

     Changes to apply:
     ✓ ADDED: Theme Selection requirement (2 scenarios)
     ✓ ADDED: Accessibility requirement (1 scenario)

     Merging...
     ✓ openspec/specs/ui/spec.md updated

     Change remains active. Run /opsx:archive when ready to complete.
```

**何时手动使用：**

| 场景 | 使用 sync？ |
|----------|-----------|
| 长期运行的 change，想在归档前将 spec 合入主分支 | 是 |
| 多个并行 change 需要更新后的基础 spec | 是 |
| 想单独预览/审查合并结果 | 是 |
| 快速 change，直接进入归档 | 否（archive 会处理） |

**提示：**
- sync 是智能的，而非复制粘贴
- 可在不重复的情况下为现有 requirement 添加 scenario
- sync 后 change 保持活动状态（未被归档）
- 大多数用户永远不需要直接调用它——需要时会由 archive 提示

---

### `/opsx:archive`

归档一个已完成的 change。完成该 change 并将其移动到归档文件夹。

**语法：**
```
/opsx:archive [change-name]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-name` | 否 | 要归档的 change（未提供时从上下文推断） |

**它执行的操作：**
- 检查 artifact 完成状态
- 检查任务完成情况（若未完成则警告）
- 若尚未 sync，则提供 sync delta spec 的选项
- 将 change 文件夹移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- 保留所有 artifact 以备审计追溯

**示例：**
```text
You: /opsx:archive

AI:  Archiving add-dark-mode...

     Artifact status:
     ✓ proposal.md exists
     ✓ specs/ exists
     ✓ design.md exists
     ✓ tasks.md exists (8/8 tasks complete)

     Delta specs: Not yet synced
     → Sync now? (recommended)

You: Yes

AI:  ✓ Synced specs to openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/

     Change archived successfully.
```

**提示：**
- archive 不会因未完成的任务而阻塞，但会发出警告
- delta spec 可在归档时或之前 sync
- 已归档的 change 会被保留以供历史查阅
- 先用 `/opsx:verify` 以发现潜在问题

---

### `/opsx:bulk-archive`

一次性归档多个已完成的 change。处理 change 之间的 spec 冲突。

**语法：**
```
/opsx:bulk-archive [change-names...]
```

**参数：**
| 参数 | 是否必填 | 说明 |
|----------|----------|-------------|
| `change-names` | 否 | 要归档的具体 change（未提供时提示选择） |

**它执行的操作：**
- 列出所有已完成的 change
- 在归档前校验每个 change
- 检测 change 之间的 spec 冲突
- 通过检查实际实现内容来解析冲突
- 按时间顺序归档

**示例：**
```
You: /opsx:bulk-archive

AI:  Found 3 completed changes:
     - add-dark-mode (8/8 tasks complete)
     - fix-login-bug (3/3 tasks complete)
     - update-footer (2/2 tasks complete)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will merge in chronological order:
     1. add-dark-mode (created Jan 20)
     2. update-footer (created Jan 22)

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-bug
     ✓ Archived update-footer
     Specs merged: add-dark-mode → update-footer
```

**提示：**
- 适合并行工作流
- 冲突解析是 agentic 的（检查代码库）
- change 按创建顺序归档
- 在覆盖 spec 内容之前会提示

---

### `/opsx:onboard`

通过完整的 OpenSpec 工作流进行引导式上手。一个使用你真实代码库的交互式教程。

**语法：**
```
/opsx:onboard
```

**它执行的操作：**
- 带解说地走完一个完整的工作流周期
- 扫描你的代码库以寻找真实的改进机会
- 创建一个带有真实 artifact 的实际 change
- 实现实际的工作（小而安全的更改）
- 归档已完成的 change
- 在每一步发生时解释它

**阶段：**
1. 欢迎与代码库分析
2. 寻找改进机会
3. 创建 change（`/opsx:new`）
4. 编写 proposal
5. 创建 specs
6. 编写 design
7. 创建 tasks
8. 实现任务（`/opsx:apply`）
9. 校验实现
10. 归档 change
11. 总结与下一步

**示例：**
```
You: /opsx:onboard

AI:  Welcome to OpenSpec!

     I'll walk you through the complete workflow using your actual codebase.
     We'll find something small to improve, create a proper change for it,
     implement it, and archive it.

     Let me scan your codebase for opportunities...

     [Analyzes codebase]

     I found a few things we could work on:
     1. Add input validation to the contact form
     2. Improve error messages in the auth flow
     3. Add loading states to async buttons

     Which interests you? (or suggest something else)
```

**提示：**
- 最适合学习工作流的新用户
- 使用真实代码，而非玩具示例
- 创建的 change 你可以保留或丢弃
- 需要 15-30 分钟完成

---

## 按 AI 工具划分的命令语法

不同的 AI 工具使用略有差异的命令语法。请使用与你的工具匹配的格式：

| 你工具的命令文件 | 语法示例 | 示例工具 |
|--------------------------|----------------|---------------|
| `.../commands/opsx/<id>.*` | `/opsx:propose`, `/opsx:apply` | Claude Code, Gemini CLI, Crush |
| `.../opsx-<id>.*` | `/opsx-propose`, `/opsx-apply` | Cursor, Devin Desktop, Copilot (IDE), Trae, Oh My Pi |
| 无 —— 仅 skill | `/openspec-propose`, `/openspec-apply-change` | CodeArts, ForgeCode, Hermes, MiniMax Code, Mistral Vibe, Zed Agent, 共享的 `.agents` |
| 无 —— Kimi Code | `/skill:openspec-propose` | Kimi Code |
| 无 —— Codex CLI | `$openspec-propose` | Codex |

> **Devin Desktop 与 Devin Local：** `.devin/workflows/opsx-*.md` 文件为 Devin Desktop 提供 `/opsx-propose`。Devin Local 没有工作流——请使用 OpenSpec 写入 `.devin/skills/` 的 skill，例如 `/openspec-propose`，它在两种 agent 上都可用。

各工具之间的意图相同，但命令如何呈现会因集成而异。[How To Invoke](supported-tools.md#how-to-invoke) 列出了每个受支持的工具；本表仅展示每种形态的部分示例。

> **注意：** GitHub Copilot 命令（`.github/prompts/*.prompt.md`）仅在 IDE 扩展（VS Code、JetBrains、Visual Studio）中可用。GitHub Copilot CLI 目前不支持自定义 prompt 文件——详见 [Supported Tools](supported-tools.md) 了解详情与变通方案。

---

## 遗留命令

这些命令使用较旧的“一次性完成”工作流。它们仍然可用，但推荐使用 OPSX 命令。

| 命令 | 它执行的操作 |
|---------|--------------|
| `/openspec:proposal` | 一次性创建所有 artifact（proposal、specs、design、tasks） |
| `/openspec:apply` | 实现 change |
| `/openspec:archive` | 归档 change |

**何时使用遗留命令：**
- 使用旧工作流的现有项目
- 不需要渐进式 artifact 创建的简单 change
- 偏好“全有或全无”的方式

**迁移到 OPSX：**
遗留 change 可以用 OPSX 命令继续推进。artifact 结构是兼容的。

---

## 故障排查

### "Change not found"

命令无法识别要处理哪个 change。

**解决方案：**
- 显式指定 change 名称：`/opsx:apply add-dark-mode`
- 检查 change 文件夹是否存在：`openspec list`
- 确认你位于正确的项目目录中

### "No artifacts ready"

所有 artifact 要么已完成，要么被缺失的依赖阻塞。

**解决方案：**
- 运行 `openspec status --change <name>` 查看是什么在阻塞
- 检查所需的 artifact 是否存在
- 先创建缺失的依赖 artifact

### "Schema not found"

指定的 schema 不存在。

**解决方案：**
- 列出可用 schema：`openspec schemas`
- 检查 schema 名称的拼写
- 如果是自定义 schema，则创建它：`openspec schema init <name>`

### Commands not recognized

AI 工具无法识别 OpenSpec 命令。

**解决方案：**
- 确保 OpenSpec 已初始化：`openspec init`
- 重新生成 skill：`openspec update`
- 检查 `.claude/skills/` 目录是否存在（针对 Claude Code）
- 重启你的 AI 工具以加载新 skill

### Artifacts not generating properly

AI 创建了不完整或不正确的 artifact。

**解决方案：**
- 在 `openspec/config.yaml` 中添加 project context
- 添加逐 artifact 规则以获得具体指引
- 在你的 change 描述中提供更多细节
- 使用 `/opsx:continue` 而非 `/opsx:ff` 以获得更多控制

---

## 下一步

- [Workflows](workflows.md) - 常见模式以及何时使用每个命令
- [CLI](cli.md) - 用于管理与校验的终端命令
- [Customization](customization.md) - 创建自定义 schema 与工作流
