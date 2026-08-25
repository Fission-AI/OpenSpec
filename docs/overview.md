# 核心概念一览 (Core Concepts at a Glance)

**OpenSpec 是你和 AI 之间一层轻量的"约定"层。** 你写下 change 该做什么，AI 起草细节，你们看着同一份计划，然后代码才会被写。本页把完整的思维模型收在一屏里。想要长版本，见[概念](concepts.md)。

用五个字概括整个理念：**先达成一致，再有信心地构建。**

## 五个核心理念

OpenSpec 的一切都由五个概念构建。学会这些，其余都是细节。

**1. Specs 就是事实（truth）。** spec 描述你的系统*此刻*如何行为。它位于 `openspec/specs/`，按 domain 组织（`auth/`、`payments/`、`ui/`）。spec 由 requirements（"系统 SHALL 在 30 分钟不活动后让 session 过期"）和 scenarios（具体的 given/when/then 示例）组成。把 specs 想象成关于"这个软件做什么"那个唯一公认的答案。

**2. 一个 change 是一个工作单元。** 当你想新增、修改或删除行为时，你创建一个 change：`openspec/changes/` 里的一个文件夹，把关于这项工作的所有内容放在一处。一份 proposal、一份 design、一个 task 清单，以及 spec 的修改。一个 change、一个文件夹、一个功能。

**3. Delta spec 描述的是正在改变的，而不是整个世界。** 在一个 change 内部，你不必重写整个 spec。你写一个小小的 delta：`ADDED` 这条 requirement、`MODIFIED` 那条、`REMOVED` 另一条。正是这个小技巧让 OpenSpec 擅长编辑既有系统，而不只是绿地（green-field）系统。你描述的是差异（diff），而不是终点。

**4. Artifacts 相互依赖。** 一个 change 包含几份文档，按自然的顺序创建，每一份喂给下一份：

```text
proposal ──► specs ──► design ──► tasks ──► implement
   why        what       how       steps      do it
```

你可以随时回头看其中任何一份。它们是促成者（enablers），而非关卡（gates）。（下面详述。）

**5. 归档把 change 折回事实中。** 工作完成时，你归档 change。它的 delta spec 合并进你的主 specs，change 文件夹带着日期戳移到 `changes/archive/`。现在你的 specs 描述新的现实，你也准备好迎接下一个 change。循环闭合。

## 图示

```text
┌─────────────────────────────────────────────────────────────────┐
│                          openspec/                              │
│                                                                 │
│   ┌──────────────────┐         ┌──────────────────────────┐    │
│   │     specs/       │         │        changes/          │    │
│   │                  │ ◄─────  │                          │    │
│   │ source of truth  │  merge  │ one folder per change    │    │
│   │ how things work  │  on     │ proposal · design ·      │    │
│   │ today            │ archive │ tasks · delta specs      │    │
│   └──────────────────┘         └──────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

两个文件夹。`specs/` 是既成事实。`changes/` 是你正在提议的东西。归档把一个 proposal 变成事实。

## 你实际会跑的循环

在默认设置下，你的一天长这样。可选地先把它想清楚；然后一条命令起草计划，你读它，下一条构建它，最后一条把它收好。

```text
/opsx:explore                   →  (optional) think it through with the AI first
/opsx:propose add-dark-mode     →  AI drafts proposal, specs, design, tasks
        (you read and adjust the plan)
/opsx:apply                     →  AI builds it, checking off tasks
/opsx:archive                   →  specs updated, change archived
```

**拿不准时，从探索开始。** `/opsx:explore` 是一个零风险的思想伙伴：它会阅读你的代码、列出各种选项，并在任何 artifact 产生之前把一个模糊的想法变成一个具体的计划。它是 AI 从含糊提示里自信地构建出*某个东西*的最佳解药。已经确切知道自己想要什么？直接跳到 `/opsx:propose`。无论哪种方式，explore 都随默认 profile 提供，所以它随时都在。参见[探索指南](explore.md)。

这些是斜杠命令，输入到你 AI 助手的聊天里。设置（`openspec init`）发生在你的终端里。如果这个分界对你来说是新概念，请先读[命令工作原理](how-commands-work.md)；这是最常见的困惑点。

## "促成者，而非关卡"

这个短语在 OpenSpec 里随处可见，所以这里用大白话解释它的含义。

老派 spec 流程是瀑布式的：完成规划，*然后*才允许实现，而且回退很痛苦。OpenSpec 拒绝那样。顺序 `proposal → specs → design → tasks` 表明的是接下来*可能*做什么，而不是*被迫*做什么。

实现过程中发现 design 错了？编辑 `design.md` 然后继续。意识到范围该缩小？更新 proposal。没有任何东西上锁。依赖的存在只是为了给 AI 它需要的上下文（没有 spec 作为基础，就写不出好的 tasks），而不是为了把你框住。

这里的优势是诚实：真实的工作是混乱且迭代的，OpenSpec 允许它如此。代价是自律：因为没有任何东西推着你向前，保持 change 聚焦而不让它失控蔓延，是你自己的责任。[工作流](workflows.md) 指南里有一些好习惯可供参考。

## 为什么这点小小的开销值得

说句大实话：OpenSpec 增加了一个步骤。你在构建之前写一份简短的计划。那你用这一点换来了什么？

- **你在付出代价前就拦下走偏的路。** 在一段几行的 proposal 里纠正一个误解是零成本的；在 AI 写了 400 行之后再去改就不是了。
- **计划和代码留在同一个仓库里。** 六个月后，spec 会告诉你（以及下一次 AI 会话）系统为何以这种方式工作。
- **change 是可审查的。** 一个 change 文件夹是个整洁的包裹：读 proposal、扫一眼 deltas、检查 tasks。不必从聊天记录里考古。
- **它适配既有代码库。** delta 意味着你可以为一份 5 万行的应用指定一个 change，而不必先记录整个应用。

而实在的权衡是：对于一个真正微不足道的一行修复，这套流程可能不划算，那也没关系。OpenSpec 设计为轻量，但并非免费。在"达成一致"重要的地方使用它——一旦你和一个会自信地构建出你含糊要求的任何东西的 AI 共事，你会发现大多数时候正是如此。

## 下一步去哪里

- 新来的？[快速上手](getting-started.md) 完整走一遍第一个 change。
- 还不确定要构建什么？[先探索](explore.md) 从那里开始。
- 对命令在哪里运行感到困惑？[命令工作原理](how-commands-work.md)。
- 想要上面一切的深入版本？[概念](concepts.md)。
- 通过示例学习？[示例与配方](examples.md)。
- 需要查某个术语？[术语表](glossary.md)。
