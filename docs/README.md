# OpenSpec 文档 (OpenSpec Documentation)

欢迎。这里是 OpenSpec 一切内容的总入口。

OpenSpec 帮助你和你的 AI 编码助手**在写任何代码之前，先就"要构建什么"达成一致**。你描述 change，AI 起草一份简短的 spec 和一个任务清单，你们看着同一份计划，然后工作开始。再也不会在做到一半时才发现 AI 把东西做错了。

如果你别的都不读，至少读这两页：

1. [快速上手](getting-started.md)：安装、初始化，并交付你的第一个 change。
2. [命令工作原理](how-commands-work.md)：你究竟在哪里输入 `/opsx:propose`（提示：在你的 AI 聊天里，而不是终端）。几乎每个人都会在此栽一次跟头。

第二页的重要性超出它的篇幅。OpenSpec 有两半：一个你在终端里运行的命令行工具，以及你给 AI 助手的斜杠命令。弄清谁是谁，能帮你避开最常见的困惑时刻。

> **最该先养成的习惯：拿不准要构建什么时，从 `/opsx:explore` 开始。** 它是一个零风险的思想伙伴，会阅读你的代码、权衡选项，并在任何 artifact 或代码产生之前把一个模糊的想法磨成具体的计划。[先探索](explore.md) 指南给出了理由。

## 选择你的路径

**我是完全的新手。** 从[快速上手](getting-started.md) 开始，然后浏览[核心概念一览](overview.md)。当某处感觉费解时，[FAQ](faq.md) 和[术语表](glossary.md) 就在旁边。

**我有问题但还没有方案。** 这是常见情况，也有专门的答案：[先探索](explore.md)。在下决心之前，用 `/opsx:explore` 和 AI 一起把它想清楚。

**我有一个庞大的既有代码库。** 你不必为全部代码写文档。[在既有项目中使用 OpenSpec](existing-projects.md) 展示了如何在真实的 brownfield 代码上起步，而不必"把海洋煮沸"。

**我只想让它跑起来。** [安装](installation.md)，运行 `openspec init`，然后读[命令工作原理](how-commands-work.md)，让你的第一个斜杠命令落在正确的地方。或者把安装交给你的助手，用 [AI 辅助安装提示词](installation.md#install-with-your-ai-assistant)。

**我通过示例学习。** [示例与配方](examples.md) 页面从头到尾展示了真实的 change：一个小功能、一个 bug 修复、一次重构、一次探索。

**AI 刚起草了一份计划——然后呢？** 去读它。[审查 Change](reviewing-changes.md) 展示了那两分钟的检查，能在错误还很便宜时就拦下走偏的弯路；[编写优秀的 Spec](writing-specs.md) 则讲清一份值得批准的计划由什么构成。

**我在团队中工作。** [OpenSpec 在团队中](team-workflow.md) 展示了 change 如何对应到一个分支和一次 pull request，以及队友如何在代码之前审查计划。

**我来自旧的工作流。** [迁移指南](migration-guide.md) 解释了改了什么、为什么改，并承诺你已有的工作是安全的。

**我想让它贴合我团队的流程。** [自定义配置](customization.md) 涵盖项目配置、自定义 schema 和共享上下文。

**哪里坏了。** [排障](troubleshooting.md) 汇集了人们实际遇到的故障及修复办法。

## 完整地图

### 从这里开始

| 文档 | 它能给你什么 |
|-----|-------------------|
| [快速上手](getting-started.md) | 安装、初始化，并端到端跑通你的第一个 change |
| [先探索](explore.md) | 在下决心前用 `/opsx:explore` 把一个想法想清楚 |
| [命令工作原理](how-commands-work.md) | 斜杠命令在哪里运行、"交互模式"是什么意思、终端与聊天的区别 |
| [核心概念一览](overview.md) | 一页纸的完整心智模型：specs、changes、deltas、archive |
| [安装](installation.md) | npm、pnpm、yarn、bun、Nix、一个把安装交给 AI 助手的提示词，以及如何验证安装成功 |

### 日常使用

| 文档 | 它能给你什么 |
|-----|-------------------|
| [工作流](workflows.md) | 常见模式，以及何时该用哪个命令 |
| [示例与配方](examples.md) | 真实 change 的完整演练，可复制粘贴 |
| [编写优秀的 Spec](writing-specs.md) | 一条有力的 requirement 和 scenario 长什么样，以及如何给 change 定合适的大小 |
| [审查 Change](reviewing-changes.md) | 在写任何代码之前，对起草的计划做两分钟检查 |
| [OpenSpec 在团队中](team-workflow.md) | change 如何对应分支、pull request 和审查 |
| [在既有项目中使用 OpenSpec](existing-projects.md) | 在大型 brownfield 代码库上采用 OpenSpec |
| [编辑与迭代 Change](editing-changes.md) | 更新 artifact、回退、协调手动修改 |
| [命令](commands.md) | 每个 `/opsx:*` 斜杠命令的参考 |
| [CLI](cli.md) | 每个 `openspec` 终端命令的参考 |

### 深入理解

| 文档 | 它能给你什么 |
|-----|-------------------|
| [概念](concepts.md) | 关于 specs、changes、artifacts、schemas 和 archive 的长篇讲解 |
| [OPSX Workflow](opsx.md) | 为什么工作流是流动的而非阶段锁定的，外加架构深入剖析 |
| [术语表](glossary.md) | 所有术语集中一处定义 |

### 让它成为你的

| 文档 | 它能给你什么 |
|-----|-------------------|
| [自定义配置](customization.md) | 项目配置、自定义 schema、共享上下文 |
| [多语言](multi-language.md) | 以英语以外的语言生成 artifacts |
| [支持的工具](supported-tools.md) | OpenSpec 集成的 30+ AI 工具，以及文件落地的位置 |

### 需要帮助时

| 文档 | 它能给你什么 |
|-----|-------------------|
| [FAQ](faq.md) | 对人们最常问问题的快速解答 |
| [排障](troubleshooting.md) | 针对具体故障的具体修复 |
| [迁移指南](migration-guide.md) | 从旧工作流迁移到 OPSX |

### 跨仓库协调（beta）

| 文档 | 它能给你什么 |
|-----|-------------------|
| [Stores: User Guide](stores-beta/user-guide.md) | 当工作跨仓库或跨团队时，把规划放在独立的仓库里 |
| [智能体契约](agent-contract.md) | 供 agent 驱动的机器可读 CLI 接口 |

## 三十秒版本

```text
1. Install        npm install -g @fission-ai/openspec@latest
2. Initialize     cd your-project && openspec init
3. Explore        (in your AI chat)  /opsx:explore           ← optional, but a great habit
4. Propose        (in your AI chat)  /opsx:propose add-dark-mode
5. Build          (in your AI chat)  /opsx:apply
6. Archive        (in your AI chat)  /opsx:archive
```

第 1、2 步发生在你的终端里。其余各步发生在你 AI 助手的聊天里。这个分界是唯一直得记住的事，而[命令工作原理](how-commands-work.md) 讲清了原因。第 3 步是可选的，但在拿不准时从 `/opsx:explore` 开始，是最值得养成的习惯。

## 其他求助渠道

- **Discord：** [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC) 用于提问、分享想法和获取帮助。
- **GitHub Issues：** [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues) 用于报告 bug 和提交功能请求。
- **`openspec feedback "your message"`** 直接从你的终端发送反馈（它会开一个 GitHub issue）。

在这些文档里发现错误、过时或令人困惑的内容？那就是一个 bug。开一个 issue 或 PR。对文档的改进，是你所能做出的最有价值的贡献之一。
