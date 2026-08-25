# 命令工作原理 (How Commands Work)

**有一件事必须知道：OpenSpec 有两类命令，它们运行在两个不同的地方。**

- `openspec ...` 命令运行在你的**终端**中。（示例：`openspec init`。）
- `/opsx:...` 命令运行在你的 **AI 助手的聊天框**中。（示例：`/opsx:propose`。）

如果你曾在终端里输入 `/opsx:propose` 却毫无反应，原因就在这里。你正在和 OpenSpec 错误的一半对话。斜杠命令不是终端命令。它们是你给你的 AI 编码助手的指令，输入在平常你会写"add a login form"的那个聊天框里。

这个单一的区别是新用户最常见的绊脚石，所以我们要把它讲得清清楚楚。

## 两个半边

OpenSpec 是一个项目，戴着两顶帽子。

**CLI（终端半边）。** 一个名为 `openspec` 的程序，你安装它并从 shell 运行。它负责设置项目、列出并校验 change、显示仪表盘、归档已完成的工作。你把这些命令敲进 iTerm、VS Code 终端、PowerShell，任何你会运行 `git` 或 `npm` 的地方。

```bash
openspec init        # set up OpenSpec in this project
openspec list        # see active changes
openspec view        # open the interactive dashboard
```

**斜杠命令（聊天半边）。** 像 `/opsx:propose` 和 `/opsx:apply` 这样的短命令，你输入到 AI 助手里面。它们告诉 AI 遵循 OpenSpec 工作流：起草 proposal、编写 specs、按任务清单构建、完成后归档。你把这些命令敲进 Claude Code、Cursor、Devin Desktop、Copilot，或你用的任何助手。

```text
/opsx:propose add-dark-mode    (typed in your AI chat)
/opsx:apply                    (typed in your AI chat)
/opsx:archive                  (typed in your AI chat)
```

用一张图来表示这个心智模型：

```text
        YOUR TERMINAL                         YOUR AI ASSISTANT'S CHAT
   ┌──────────────────────┐               ┌──────────────────────────────┐
   │  $ openspec init     │   installs    │  /opsx:propose add-dark-mode  │
   │  $ openspec list     │  ──────────►  │  /opsx:apply                  │
   │  $ openspec view     │   commands    │  /opsx:archive                │
   └──────────────────────┘    & skills   └──────────────────────────────┘
        run openspec here                       run /opsx:* here
```

注意那个箭头。在终端里运行 `openspec init` 才是在你的 AI 工具中*安装*斜杠命令的动作。终端半边负责搭建聊天半边。在那之后，日常的驱动基本都在聊天里进行。

## "我该怎么启动交互模式？"

**没有需要单独启动的交互模式。** 这个问题被问得很多，所以值得给一个直白的答案。

你不用进入什么特殊的 OpenSpec 模式。你只需像平常一样打开 AI 编码助手，然后在聊天里输入一个斜杠命令。斜杠命令*就是*你"进入"OpenSpec 的方式。你的助手会识别它、加载对应的 OpenSpec skill，并开始遵循工作流。

所以真正的操作是：

1. 在你的项目里打开 AI 编码助手（Claude Code、Cursor、Devin Desktop 等等）。
2. 在它的聊天里输入 `/opsx:propose`，和你输入其他任何请求的地方一样。
3. 留意自动补全：如果 OpenSpec 已安装，你输入斜杠时就会看到 `/opsx:propose`、`/opsx:apply` 以及它们的伙伴出现。

就是这样。没有要切换的模式，没有要启动的守护进程，没有独立的窗口。

有一件事*确实*是真交互的，它存在于终端中：`openspec view`。它会打开一个仪表盘，用于浏览你的 specs 和 changes。但那只是一个查看器，而不是你用来提议和构建的工具。构建是通过聊天里的斜杠命令完成的。

## 为什么要这样拆分

值得理解，因为这解释了为什么 OpenSpec 能适配 30+ 种不同的 AI 工具。

CLI 是**引擎**。它掌握规则：一个 change 文件夹长什么样、哪些 artifact 依赖哪些、如何把 delta spec 合并进你的事实来源。它在任何地方都一样。

斜杠命令是**方向盘**，而每个 AI 工具有一点不同。Claude Code 称它们为 commands。Cursor 和 Devin Desktop 有各自的格式。有些工具称它们为 skills。当你运行 `openspec init` 时，OpenSpec 会为你所选的每个工具生成正确类型的文件，因此同样的 `/opsx:propose` 意图无论你偏好哪个助手都能工作。

这个设计的优势在于：你只需学习一次工作流，就能带到各种工具上。代价是：命令的确切语法在不同工具间可能略有差异，这正是下一节的内容。

## 按工具区分的斜杠命令语法

意图在任何地方都相同。拼写则跟随你的工具所加载的文件。

| 你的工具命令文件 | 输入方式 | 示例工具 |
|--------------------------|-----------------|---------------|
| `.../commands/opsx/<id>.*` | `/opsx:propose` | Claude Code, Gemini CLI, Crush |
| `.../opsx-<id>.*` | `/opsx-propose` | Cursor, GitHub Copilot (IDE), Devin Desktop, Trae, Oh My Pi |
| `.amazonq/prompts/opsx-<id>.md` | `@opsx-propose` | Amazon Q Developer |
| none — skills only | `/openspec-propose` | CodeArts, ForgeCode, Hermes, Mistral Vibe, Zed Agent, shared `.agents` |
| none — Kimi Code | `/skill:openspec-propose` | Kimi Code |
| none — Codex CLI | `$openspec-propose` | Codex |

Devin 是唯一跨越两行的工具。Devin Desktop 读取 `.devin/workflows/`，所以 `/opsx-propose` 在那里可用；[Devin Local 则不行](https://docs.devin.ai/desktop/devin-local)，因此在那个 agent 上要改用 `/openspec-propose` skill。OpenSpec 写入 `.devin/skills/` 的 skills 在两者上都能工作，这正是它们通过 skill 名称互相引用的原因。

每个工具都列在[如何调用](supported-tools.md#how-to-invoke) 中——那张表才是权威的。有两行根本不是斜杠命令：Amazon Q 把文件载入一个用 `@` 调用的 prompt 库，而最后三行使用 *skill* 名称，这不是命令 id（`/opsx:apply` 对应的是 `openspec-apply-change` skill）。

拿不准时，读一下 `openspec init` 打印的"快速上手"那一行：它用的已经是你工具注册过的形式。对于会显示斜杠命令的工具，输入一个斜杠并看自动补全也行。

## 命令是怎么到那里的：skills 与 commands

当你运行 `openspec init`（或 `openspec update`）时，OpenSpec 会把一些小文件写进你的项目，以便你的 AI 工具能找到工作流。具体取决于你的工具和设置，这些文件是 **skills**、**commands**，或两者皆有。

- **Skills** 位于像 `.claude/skills/openspec-*/SKILL.md` 这样的位置。它们是正在兴起的跨工具标准：一个由你的助手自动检测的指令文件夹。
- **Commands** 位于像 `.cursor/commands/opsx-<id>.md` 或 `.claude/commands/opsx/<id>.md` 这样的位置——布局由工具决定，它也决定了你要如何输入命令。它们是较旧的、按工具划分的斜杠命令文件。Codex 不会生成命令文件；请使用 `.agents/skills/openspec-*`。

你不必关心自己的工具用的是哪种。你只需输入斜杠命令，它就能工作。但知道这些文件的存在，在出问题时能帮上忙：如果你的命令消失了，通常意味着这些文件缺失或过期，而 `openspec update` 会重新生成它们。

各工具的确切路径见[支持工具](supported-tools.md)，skills 如何取代旧式仅命令方式见[迁移指南](migration-guide.md)。

## 确认它已安装

快速检查，按从快到慢：

1. **在你的 AI 聊天里输入一个斜杠。** 开始输入 `/opsx`，留意自动补全建议。如果它们出现，你就准备好了。在仅支持 skills 的工具上（Codex、Kimi Code、CodeArts、ForgeCode、Hermes、Mistral Vibe、Zed Agent，或共享的 `.agents` 目标），即便安装正常 `/opsx` 也永远不会补全——请改用上表中对应的 skill 名称。
2. **查找这些文件。** 对 Claude Code 来说，检查 `.claude/skills/` 里是否包含 `openspec-*` 文件夹。其他工具使用各自的目录（[支持工具](supported-tools.md) 列出了它们）。
3. **重新运行设置。** 在你的项目根目录，运行 `openspec update`。这会为你配置过的工具重新生成 skill 和命令文件。
4. **重启你的助手。** 许多工具在启动时会扫描 skill 和命令，所以开个新窗口可能就是缺失的那一步。

## 我到底有哪些命令？

默认情况下，OpenSpec 安装的是 **core** 这组斜杠命令：

- `/opsx:explore`：在投入一个 change 之前，先和 AI 一起把想法想清楚（当你没把握时，这是很好的第一步）
- `/opsx:propose`：创建一个 change，并一步起草它的全部规划 artifacts
- `/opsx:apply`：按任务清单推进，构建这个 change
- `/opsx:update`：修订一个 change 的规划 artifacts，并保持它们一致
- `/opsx:sync`：把一个 change 的 spec 更新合并进你的主 specs（通常是自动的）
- `/opsx:archive`：完成一个 change 并将其归档

一个不错的默认节奏是：当你在琢磨要做什么时用 `explore`，然后是 `propose`、`apply`、`archive`。[先探索](explore.md) 指南解释了为什么这个开头步骤值得做。

还有一组 **expanded**（扩展）命令，面向想要更精细控制的人（`/opsx:new`、`/opsx:continue`、`/opsx:ff`、`/opsx:verify`、`/opsx:bulk-archive`、`/opsx:onboard`）。你用 `openspec config profile` 开启它，再用 `openspec update` 应用。

对这一切都是新手？`/opsx:onboard`（属于扩展组）会在你自己的代码库上带你走完一个完整的 change，并逐步讲解每一步。这是最友好的入门方式。

各个命令的详细说明见[命令](commands.md)。何时该用哪个见[工作流](workflows.md)。

## 一次干净的首跑

综合起来，下面是完整序列，每步都标注了发生的位置。

```text
TERMINAL   $ npm install -g @fission-ai/openspec@latest
TERMINAL   $ cd your-project
TERMINAL   $ openspec init
              (installs slash commands into your AI tool)

AI CHAT      /opsx:explore
              (optional: think the idea through with the AI first)

AI CHAT      /opsx:propose add-dark-mode
              (AI drafts proposal, specs, design, tasks)

AI CHAT      /opsx:apply
              (AI builds it, checking off tasks)

AI CHAT      /opsx:archive
              (change is merged into your specs and filed away)
```

两步终端操作完成设置。之后你待在聊天里。这就是节奏。

## 相关文档

- [快速上手](getting-started.md)：完整的首个 change 演练
- [命令](commands.md)：每个斜杠命令的详细说明
- [CLI](cli.md)：每个终端命令的详细说明
- [支持工具](supported-tools.md)：按工具区分的语法与文件位置
- [FAQ](faq.md)：更多快速解答
- [排障](troubleshooting.md)：命令不出现时的修复办法
