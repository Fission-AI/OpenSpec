# 常见问题 (FAQ)

对人们最常问问题给出快速解答。如果你的问题其实是"哪里坏了"之类的，[排障](troubleshooting.md) 是更合适的页面。如果你想查某个术语的定义，见[术语表](glossary.md)。

## 基础

### 用一句话说，OpenSpec 是什么？

一个轻量的层，让你和你的 AI 编码助手在写任何代码之前，先以书面形式就"要构建什么"达成一致。

### 我为什么需要它？

因为 AI 助手即便错了也照样自信。当需求只存在于聊天记录里时，AI 会用猜测来填补空白，而你要在代码写出来之后才发现。OpenSpec 把这种一致提前到错误还很容易修正的阶段。完整论证见[核心概念一览](overview.md)。

### 我必须对所有事情都用它吗？

不必。在"达成一致"很重要的地方用它，也就是大部分非平凡的工作。对一个只改一个字符的拼写错误，这套流程可能不值得，那也没关系。

### 我能在庞大的既有代码库上用它，还是只能用于新项目？

既有的代码库才是重头戏。OpenSpec 是 brownfield-first（以遗留代码库为先）的：你不需要预先把整个应用都文档化。你只为每个 change 实际触及的部分写 spec，而你的 specs 会随着你真正做的工作逐步充实。有一份专门的指南：[在既有项目中使用 OpenSpec](existing-projects.md)。

### 它和某一个 AI 工具绑定吗？

不绑定。OpenSpec 适配 30+ 种助手，包括 Claude Code、Cursor、Devin Desktop、GitHub Copilot、Gemini CLI、Codex 等。完整列表和各工具细节见[支持工具](supported-tools.md)。

## 运行命令

### 我该在哪里输入 `/opsx:propose`？

在你的 AI 助手的聊天框里，而不是终端。这是最常见的混淆点，因此它有专门的页面：[命令工作原理](how-commands-work.md)。简短版：`openspec ...` 在终端运行，`/opsx:...` 在聊天里运行。

### 我怎么"启动交互模式"？

没有需要单独启动的模式。你像平常一样打开 AI 助手，然后在它的聊天里输入一个斜杠命令。斜杠命令就是你"进入"OpenSpec 的方式。（终端里唯一真正交互的功能是 `openspec view`，一个用于浏览 specs 和 changes 的仪表盘。）完整解释见[命令工作原理](how-commands-work.md)。

### 我输入了斜杠命令却毫无反应。为什么？

最可能的情况是：你在终端而不是 AI 聊天里输入了它，你用的拼写你的工具没有注册，或者命令还没安装。如果文件缺失——或者你从没配置过工具——请运行 `openspec init`；`openspec update` 只会刷新已存在的文件。然后重启你的助手，并使用"Getting started"下打印的形式——参见[如何调用](supported-tools.md#how-to-invoke)。[排障](troubleshooting.md#commands-dont-show-up) 有完整的检查清单。

### 为什么一个工具里是 `/opsx:propose`，另一个里是 `/opsx-propose`？

每个 AI 工具暴露自定义命令的方式略有不同，OpenSpec 会按你的工具加载它所写文件的方式来拼写。名为 `opsx-propose.md` 的命令文件要输入 `/opsx-propose`；放在 `commands/opsx/` 下的要输入 `/opsx:propose`。用 skills 而非 commands 的工具使用 skill 名称——Codex 需要 `$openspec-propose`，Kimi Code 需要 `/skill:openspec-propose`。`openspec init` 的"Getting started"那一行已经为你所选的工具打印了正确的形式；完整表格在[如何调用](supported-tools.md#how-to-invoke)。

### skill 和 command 有什么区别？

两者都是 OpenSpec 写入的、让你的助手能运行工作流的文件。Skills（`.../skills/openspec-*/SKILL.md`）是较新的跨工具标准；commands（`.../commands/opsx-*`）是较旧的、按工具划分的斜杠文件。你不需要选择。你只需输入斜杠命令，OpenSpec 会安装你的工具所用的那种。

## 工作流

### 如果不确定要构建什么，我该从哪里开始？

从 `/opsx:explore` 开始。它是一个零风险的思想伙伴，会阅读你的代码库、列出各种选项，并在任何 change 或代码产生之前，把一个模糊的问题变成一个具体的计划。它在默认 profile 中，所以随时可用。当计划清晰后，它就把工作移交给 `/opsx:propose`。这是最值得养成的一个习惯，因为它能阻止一个过于热心的 AI 自信地把东西做错。参见[先探索](explore.md)。

### 最简单的工作流是什么？

```text
/opsx:explore (optional)   then   /opsx:propose <what you want>   then   /opsx:apply   then   /opsx:archive
```

用 explore 把思路想清楚，用 propose 起草计划，用 apply 去构建，用 archive 归档收尾。当你已经确切知道自己想要什么时，可以跳过 explore。

### `/opsx:propose` 和 `/opsx:new` 有什么区别？

`/opsx:propose` 是默认的一步到位命令：它创建 change，并一次性起草所有规划 artifacts。`/opsx:new` 属于扩展命令集，只搭出一个空的 change，留给你用 `/opsx:continue` 一次创建一个 artifact（或用 `/opsx:ff` 一次性全部创建）。除非你想要逐步控制，否则就用 propose。参见[命令](commands.md)。

### `core` 和 expanded profile 是什么？

profile 决定了会安装哪些斜杠命令。**Core**（默认）给你 `propose`、`explore`、`apply`、`update`、`sync`、`archive`。**expanded** 集合额外提供 `new`、`continue`、`ff`、`verify`、`bulk-archive` 和 `onboard`，用于更精细的控制。用 `openspec config profile` 切换，再用 `openspec update` 应用。

### 我需要运行 `/opsx:sync` 吗？

通常不需要。sync 会把一个 change 的 delta spec 合并进你的主 specs，而 `/opsx:archive` 会主动提出替你做这件事。只有在你想在归档前就合并 specs 时才手动运行 sync，例如对一个长期运行的 change。参见[命令](commands.md#opsxsync)。

### 开始之后，我如何编辑 proposal、spec 或 task？

直接编辑文件即可。每个 artifact 都是 `openspec/changes/<name>/` 下的纯 Markdown，没有锁定的阶段，也没有特殊编辑模式。手动修改，或让你的 AI 去修订它（"把 design 改成用队列"），然后继续。AI 始终基于当前的文件内容工作。完整指南：[编辑与迭代 Change](editing-changes.md)。

### 我已经实现了一部分之后，还能回去改计划吗？

可以，随时都行。工作流是流动的，所以审查和编辑并不是你会被锁在门外的阶段。编辑 artifact，然后继续。如果你想做一次结构化的检查，确认代码仍然匹配计划，就运行 `/opsx:verify`。参见[编辑与迭代 Change](editing-changes.md#how-do-i-go-back-to-review-after-implementing)。

### 我手动改了代码。怎么让它和 spec 对齐？

在归档之前让它们重新同步，因为归档会让你的 specs 成为事实记录。如果代码现在是正确的，就更新 delta spec 以匹配你发布的内容；如果 spec 是正确的，就继续构建直到代码与它一致。`/opsx:verify` 会把不一致暴露出来。参见[编辑与迭代 Change](editing-changes.md#i-edited-the-code-by-hand-how-do-i-reconcile-that-with-openspec)。

### 何时该更新一个已有的 change，何时该开一个新的？

当它是同一份工作被细化时，就更新。当意图发生了根本改变，或范围爆炸成了不同的工作时，就重新开始。决策流程图和示例见[工作流](workflows.md#when-to-update-vs-start-fresh)。

### 如果我的会话上下文耗尽了，或者需求在实现中途变了怎么办？

这正是 specs 体现价值的地方。因为计划保存在文件里（而不只在聊天历史中），你可以清空上下文、开一个全新的 AI 会话，然后用 `/opsx:apply` 接着做；它会读取 artifacts，并从第一个未勾选的 task 继续。如果需求变了，就编辑 artifacts 以匹配新的现实，然后继续。保持干净的上下文窗口也能带来更好的结果；在动手实现前清空它。

### 我应该把 `openspec/` 文件夹提交到 git 吗？

应该。你的 specs、活跃的 changes 和 archive 都是项目历史的一部分。像提交其他任何源码一样提交它们。尤其是 archive，它会成为"你的系统为何以这种方式工作"的持久记录。

## Specs 与 changes

### spec 里写什么，design 里写什么？

spec 描述可观测的行为：系统做什么、它的输入、输出和错误条件。design 描述你怎么构建它：技术方案、架构决策、文件改动。如果实现可以变化而不改变对外可见的行为，那它就属于 design，而不是 spec。[概念](concepts.md#what-a-spec-is-and-is-not) 讲得更深。

### 什么是 delta spec？

一种只描述"正在改变什么"的 spec，使用 `ADDED`、`MODIFIED` 和 `REMOVED` 小节，而不是复述整个 spec。这正是 OpenSpec 干净利落地处理对既有系统修改的方式。参见[概念](concepts.md#delta-specs)。

### 归档的 change 去了哪里？

去 `openspec/changes/archive/YYYY-MM-DD-<name>/`，所有 change artifacts 都保留。该 change 会从你的活跃列表中移走。一个显式声明了 `retire_capabilities: true` 的 change，在移除某个 capability 的最后一条 requirement 时，也可以删除对应的主 capability spec。

## 配置与自定义

### 我怎么告诉 AI 我的技术栈？

把它写在 `openspec/config.yaml` 的 `context:` 下面。那段文字会被注入到每个规划请求中，因此 AI 始终知道你的技术栈和规范。参见[自定义配置](customization.md#project-configuration)。

### 我可以用英语以外的语言生成 spec 吗？

可以。在你的配置 `context:` 里加一条语言指令。[多语言](multi-language.md) 提供了几种语言的复制粘贴片段。

### 我能改工作流本身吗？

可以，用自定义 schema。一个 schema 定义了存在哪些 artifact，以及它们如何相互依赖。用 `openspec schema fork spec-driven my-workflow` fork 默认 schema，然后编辑它。参见[自定义配置](customization.md#custom-schemas)。

## 模型、隐私与升级

### 我该用哪个 AI 模型？

OpenSpec 在强推理模型上表现最好。README 推荐在规划和实现中都使用像 Codex 5.5 和 Opus 4.7 这样的模型。同时要保持你的上下文窗口干净：在动手实现前清空它，以获得最佳结果。

### OpenSpec 会收集数据吗？

它会收集匿名的使用统计：仅限命令名和版本。不含参数、路径、内容或个人数据，而且在 CI 中会自动关闭。用 `export OPENSPEC_TELEMETRY=0` 或 `export DO_NOT_TRACK=1` 退出统计。

### 我怎么升级？

两步。升级包（`npm install -g @fission-ai/openspec@latest`），然后在每个项目内运行 `openspec update` 以刷新生成的 skills 和 commands。

### 我怎么卸载 OpenSpec？

没有卸载命令，因为它只是一个全局包加上项目里的文件。移除这个包（`npm uninstall -g @fission-ai/openspec`），并可选地删除 `openspec/` 目录和生成的工具文件。逐步说明、包括哪些可以安全保留，见[安装：卸载](installation.md#uninstalling)。

## 获取帮助

### 我在哪里提问或报告 bug？

- **Discord：** [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues：** [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **从你的终端：** `openspec feedback "your message"` 会为你开一个 GitHub issue。

### 这些文档有错或让人困惑。我该怎么办？

告诉我们，或者自己修。我们欢迎并重视文档类的 PR。开一个 issue 或发一个 pull request 即可。
