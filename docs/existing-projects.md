# 在既有项目中使用 OpenSpec (Using OpenSpec in an Existing Project)

**你不需要一开始就为整个代码库写文档。你只为即将要改的部分写 spec。** 这是在一个既有项目上采用 OpenSpec 时最需要知道的一件事，也正是 OpenSpec 以 brownfield-first 构建的原因。

一个常见的担忧是这样的："我的应用已经有 8 万行。在 OpenSpec 有用之前，我是不是得为全部代码写 spec？" 不用。你讨厌那样，我们也一样。OpenSpec 让你的 specs 一次一个 change 地生长。你的第一个 change 记录它触及的那一片，下一个 change 记录它的那一片，几个月下来，你的 specs 会自然地填充到你真正在做的工作周围。

本指南展示如何在第一天就开始，而不必"把海洋煮沸"（boiling the ocean，即一口吃成胖子）。

## 三十秒版本

```bash
$ cd your-existing-project
$ openspec init          # adds openspec/ and your AI tool's commands
```

然后，在你的 AI 聊天里：

```text
/opsx:explore            # optional: have the AI read the area you'll touch
/opsx:propose <a real, small change you actually need>
/opsx:apply
/opsx:archive
```

你的 specs 现在精确描述了那个 change 触及的系统部分，仅此而已。这就对了。你不必再为另外那 8 万行操心了。

## 为什么 delta-first 是全部诀窍

OpenSpec 的 change 是以 **delta** 形式写就的：`ADDED`、`MODIFIED`、`REMOVED`。delta 描述的是相对于当前行为正在发生的变化，而不是整个系统。

这正是 brownfield 工作所需要的。你很少从零开始构建。你是在加一个字段、修一个重定向、收紧一个超时。delta 让你能精确指定那一个改动，而不必先写一份关于周围一切的长达 40 页的 spec。

因此你的 `openspec/specs/` 目录一开始并非完整无缺。它几乎是空的，然后逐步累积。每个归档的 change 都会把自己的 delta 合并进去。`auth/` 的 spec 只有在你做了好几个 auth 改动之后才会变得详尽——而那正是你希望它详尽的时候。

如果你想了解更深入的机制，见[概念：Delta Specs](concepts.md#delta-specs)。

## 在真实代码库上的第一个 change

挑一件小而真实的事。不是玩具，也不是重写。一个你这周本来就要做的 change。小的首个 change 能让你以很低的代价学会工作流。

**步骤 1：让 AI 阅读相关区域。** 这正是 `/opsx:explore` 在一个陌生或庞大的代码库上体现价值的地方。把它指向你即将触及的部分，让它在提出任何建议之前先理清事情是怎么运作的。

```text
You: /opsx:explore

AI:  What would you like to explore?

You: I need to add rate limiting to our public API, but I'm not sure
     how requests currently flow through the middleware.

AI:  Let me trace it... [reads the router, middleware stack, and config]
     Requests hit Express, pass through auth middleware, then your
     controllers. There's no rate-limiting layer today. The cleanest
     insertion point is a middleware right after auth. Want me to scope it?
```

注意 AI 现在理解了你真实的结构，因此它写的 proposal 会贴合你的代码，而不是一个通用模板。在一个大代码库上，这一个习惯最能减少痛苦。参见[先探索](explore.md)。

**步骤 2：发起 change 提议。** proposal 及其 delta spec 只捕捉这一个 change。

```text
You: /opsx:propose add-api-rate-limiting
```

**步骤 3：构建并归档** 用 `/opsx:apply` 和 `/opsx:archive`，与任何 change 一样。归档之后，你就有了一份关于限流行为的真实 spec，它源于一个你本来就要做的 change。

## 想来个带解说的引导之旅？用 onboard

如果你更想看着整个循环在你自己的代码上、带着解说地发生，扩展命令 `/opsx:onboard` 正好做这件事：它会扫描你的代码库寻找一个小的、安全的改进，然后带你走完提议、构建和归档的过程，并解释每一步。

先开启扩展命令：

```bash
$ openspec config profile      # select the expanded workflows
$ openspec update              # apply them to this project
```

然后在聊天里：

```text
/opsx:onboard
```

这是在一个真实项目上最温和的入门方式，而且它会留给你一个真实（且小）的 change，你可以保留或丢弃。参见[命令：`/opsx:onboard`](commands.md#opsxonboard)。

## "但我已经有需求文档了"

也许你有一份 PRD、SRS、正式的 spec，甚至 TLA+ 模型。很好。你既不把它们整体导入，也不把它们扔掉。

把已有的文档当作**探索的素材**，而不是要转换的 spec。当你启动一个 change 时，把相关部分粘贴给 AI 或指给它看，让它据此塑造一个聚焦的 OpenSpec delta。delta 会以 OpenSpec 可测试的"requirement + scenario"形式，捕捉你当前正在改变的行为。你原始的文档留在原处作为背景。

老实说的原因是：OpenSpec 的 specs 是刻意"行为优先"且按 change 划定范围的。一份 40 页的 PRD 是另一种有着不同用途的 artifact。强行做一次性批量转换，往往会产生一份庞大、陈旧、没人信任的 spec。让 specs 从真实的 change 中生长，才能保持它们准确。

```text
You: /opsx:explore
You: Here's the section of our PRD about checkout. I'm implementing the
     "guest checkout" requirement next.
     [paste the relevant requirement]
AI:  [reads it, asks clarifying questions, then helps scope a change]
You: /opsx:propose add-guest-checkout
```

## 在大型代码库中组织 specs

specs 位于 `openspec/specs/` 下，按 **domain**（领域）分组：一个符合你团队对系统认知方式的逻辑区域。你不必预先设计整套分类法。当该区域的第一个 change 需要时就创建一个 domain 文件夹。

划分 domain 的常见方式：

- **按功能区域：** `auth/`、`payments/`、`search/`
- **按组件：** `api/`、`frontend/`、`workers/`
- **按限界上下文：** `ordering/`、`fulfillment/`、`inventory/`

选一个让新人也会点头的方式。你之后可以再细化。参见[概念：Specs](concepts.md#specs)。

## Monorepo 与跨仓库的工作

对于 monorepo，最简单的模型是在仓库根目录放一个 `openspec/` 目录，domain 对应你的各个包或服务。这覆盖了大多数团队。

如果你的工作确实跨**多个仓库**（或你把几个包当作独立的来对待），OpenSpec 有一个 beta 的 **stores** 特性：规划放在一个独立的仓库里，你的任何代码仓库都可以引用它，因此规划不必生活在某个单一仓库的 `openspec/` 文件夹中。它还是 beta，所以请把它命令和状态视为仍在演进。从[Stores 用户指南](stores-beta/user-guide.md) 开始，建立心智模型并找到最小可行的路径。

## 几句实在的提醒

- **克制住回填一切的冲动。** 为你不打算改的代码写 spec，感觉有产出，但通常并非如此。那些 spec 会过时，因为没有东西强迫它们跟踪现实。让真实的 change 来驱动你的 specs。
- **让早期 change 保持小。** 你的头几个 change，学习和交付同样重要。紧凑的范围能让循环更快，教训也更便宜。
- **把 `openspec/` 提交到 git。** 你的 specs 和 archive 应该和它们所描述的代码一起纳入版本控制。
- **给 AI 提供上下文。** 在一个有强规范的大型代码库上，填好 `openspec/config.yaml` 的 `context:`，让每个 proposal 都尊重你的技术栈和模式。参见[自定义配置](customization.md#project-configuration)。

## 下一步去哪里

- [先探索](explore.md) —— 在改动代码前理解它的关键习惯
- [快速上手](getting-started.md) —— 完整的首个 change 演练
- [编辑与迭代 Change](editing-changes.md) —— 边学边调整 change
- [概念：Delta Specs](concepts.md#delta-specs) —— 为什么 delta 让 brownfield 工作干净利落
- [自定义配置](customization.md) —— 教 OpenSpec 你项目的规范
