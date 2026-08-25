# 示例与配方 (Examples & Recipes)

真实的 change，从开始到结束。每个配方都展示了你会输入的命令以及会看到的反馈，这样你就能把自己的情况和某种模式对应起来并直接复制。这些使用默认的 **core** 命令（`propose`、`explore`、`apply`、`update`、`sync`、`archive`）；在扩展命令集更有帮助的地方，会加以说明。

开始前提醒一下：像 `/opsx:propose` 这样的斜杠命令要输入到你的 **AI 助手的聊天框**中，而 `openspec` 命令要输入到你的**终端**中。如果这点对你来说是新概念，请先阅读[命令工作原理](how-commands-work.md)。在下面的对话记录中，`You:` 和 `AI:` 表示聊天，以 `$` 开头的行表示终端。

> **还不确定要构建什么？** 如果你先用 `/opsx:explore` 把思路想清楚，这些配方大多会更有针对性。[配方 3](#recipe-3-exploring-before-you-commit) 展示了它的实际用法，而[先探索](explore.md) 指南给出了完整的理由。

## 配方 1：一个小功能，走快速路径

**何时使用：** 你清楚自己想要什么，而且它是一个边界清晰的工作单元。这是最常见的配方。

整件事就是三条命令。提议、构建、归档。

```text
You: /opsx:propose add-logout-button

AI:  Created openspec/changes/add-logout-button/
     ✓ proposal.md — why and what
     ✓ specs/      — the new requirement and its scenarios
     ✓ design.md   — technical approach
     ✓ tasks.md    — implementation checklist
     Ready for implementation. Run /opsx:apply.
```

现在读一下计划。打开 proposal 和 delta spec。这正是 OpenSpec 被设计出来的时刻：在错误的假设还只是一段文字、而不是 400 行代码时就把它抓住。如果有哪里不对，直接编辑任意 artifact，然后继续。

```text
You: /opsx:apply

AI:  Working through tasks...
     ✓ 1.1 Add logout button to header
     ✓ 1.2 Clear session on click
     ✓ 1.3 Add confirmation dialog
     All tasks complete!

You: /opsx:archive

AI:  Archiving add-logout-button...
     ✓ Merged specs into openspec/specs/auth/spec.md
     ✓ Moved to openspec/changes/archive/2026-06-22-add-logout-button/
     Done. Ready for the next change.
```

就这样。登出行为现在已成为你 spec 的一部分，而这个 change 连同它的完整上下文一起被归档保存。

## 配方 2：修复一个 bug

**何时使用：** 某处出了毛病，而你希望把这个修复作为一次有意为之的行为变更被记录下来，而不是一个来历不明的提交。

Bug 修复和功能的做法完全一致。区别在于你如何框定 proposal：描述*正确*的行为，而不只是"修复这个 bug"。

```text
You: /opsx:propose fix-login-redirect-loop

AI:  Created openspec/changes/fix-login-redirect-loop/
     The proposal captures the current broken behavior and the
     intended behavior. The delta spec MODIFIES the redirect
     requirement so it's now precise and testable.
     Ready for implementation.
```

因为这个修复是以一条带有全新 scenario 的 `MODIFIED` requirement 落地的，所以下一个人（或下一次 AI 会话）看到的不仅是你修了它，还有"正确"到底指什么。然后像往常一样 `/opsx:apply` 和 `/opsx:archive`。

提示：对于修复来说，一个好的 scenario 就是把回归测试用散文写出来。"GIVEN a logged-out user, WHEN they submit valid credentials, THEN they land on the dashboard and are not redirected again." 写出这条，实现就有了清晰的目标。

## 配方 3：动手前先探索

**何时使用：** 你有一个问题，但还没有方案。你不确定要构建什么，或者哪种方案才正确。

从 `/opsx:explore` 开始。它是一个没有固定结构、也不会创建任何 artifact 的思想伙伴。它会阅读你的代码库，并帮你做决定。

```text
You: /opsx:explore

AI:  What would you like to explore?

You: Page loads feel slow but I don't know where the time goes.

AI:  Let me look... I found three likely culprits:
     1. Large unoptimized images on the product list
     2. Synchronous data fetching that blocks render
     3. Re-renders triggered by context changes
     Which should we tackle first?

You: The data fetching one.

You: /opsx:propose optimize-product-list-fetching

AI:  Created the change, with a proposal informed by what we just
     found. Ready for implementation.
```

探索会在你为它耗费一个 change 之前，先把你的思路理清楚。当洞见成形时，发起 propose，AI 就会把上下文带向前方。

## 配方 4：同时处理两个 change

**何时使用：** 你正做到一半的功能中途，一个紧急修复插了进来。

Change 是相互独立的文件夹，因此并行工作不会冲突。先把修复做了、发布掉，然后回到功能开发，从你离开的地方接着来。

```text
You: I'm partway through add-dark-mode, but I need to fix a login bug now.

You: /opsx:propose fix-login-redirect

AI:  Created openspec/changes/fix-login-redirect/. Ready for implementation.

You: /opsx:apply

AI:  Implemented the fix. All tasks complete.

You: /opsx:archive

AI:  ✓ Archived fix-login-redirect.

You: Back to dark mode.

You: /opsx:apply add-dark-mode

AI:  Resuming add-dark-mode. Picking up at task 2.3: Update Header...
```

当有多个 change 处于活跃状态时，在 `/opsx:apply add-dark-mode` 中指明 change 名称，就是告诉 AI 要对准哪个具体的 change。因为 task 的完成情况记录在 `tasks.md` 中，AI 清楚地知道你在哪里停下了。

当多个 change 一次性完成时，扩展命令 `/opsx:bulk-archive` 会把它们一起归档，并通过检查实际实现的内容来解决 spec 冲突。参见[工作流](workflows.md#parallel-changes)。

## 配方 5：一次不改变行为的重构

**何时使用：** 你正在重组代码，而对外可见的行为应当保持完全一致。

这是一个有意思的情况，因为纯粹的重构*没有东西可以加进你的 spec*。行为契约不变，变的只有实现。所以工作落在 design 和 tasks 上，而 spec delta 是空的或不存在的。

```text
You: /opsx:propose refactor-payment-module

AI:  Created the change. The proposal states the goal (split the
     payment module, no behavior change) and the design captures
     the new structure. No spec changes, since behavior is identical.
     Ready for implementation.
```

通过在 change 的 `.openspec.yaml` 中设置 `skip_specs: true` 来显式声明空的 delta：

```yaml
schema: spec-driven
skip_specs: true
```

没有这个标记时，`openspec validate` 会拒绝一个没有任何 delta 的 change（这样被遗忘的 specs 阶段仍会被捕获）；有了它，校验通过，且 `openspec status` 会把 specs 阶段显示为"已显式跳过"而非"待处理"。如果这个重构最终还是改变了行为，请从 `.openspec.yaml` 中移除 `skip_specs` 并编写 delta spec——validate 会把"标记 + spec 文件"视为冲突，因此过期的标记无法悄无声息地残留。

归档一个带标记的 change 不需要额外的标志（没有需要合并的 delta）。另外，`--skip-specs` 标志会让终端命令显式跳过 spec 步骤：

```bash
$ openspec archive refactor-payment-module --skip-specs
```

这个标志同样适用于工具链、CI 以及仅文档的变更。原则是：spec 描述的是行为，所以如果行为没变，spec 也不该变。参见[概念](concepts.md#what-a-spec-is-and-is-not)。

## 配方 6：逐步控制（扩展命令）

**何时使用：** 一个复杂或有风险、你想在继续之前审查每个 artifact 的 change。

核心命令 `/opsx:propose` 会一次性起草所有内容。当你更想一步一个脚印时，开启扩展命令：

```bash
$ openspec config profile      # select the expanded workflows
$ openspec update              # apply them to this project
```

现在你可以增量式地搭建和构建：

```text
You: /opsx:new add-2fa

AI:  Created openspec/changes/add-2fa/. Ready to create: proposal.

You: /opsx:continue

AI:  Created proposal.md. Now available: specs, design.

You: /opsx:continue

AI:  Created specs/auth/spec.md. Now available: design.
```

每落成一个 artifact 就审查它，随意编辑，满意了再继续。当你想一次性起草其余部分时，`/opsx:ff` 会快进跳过剩余的规划 artifacts。在归档之前，`/opsx:verify` 会检查实现是否真的符合 spec。参见[工作流](workflows.md#opsxff-vs-opsxcontinue)。

## 配方 7：动手体验完整循环

**何时使用：** 你已经安装好 OpenSpec，想在自己的代码上*感受*工作流，而不是用一个玩具示例。

开启扩展命令（见配方 6），然后：

```text
You: /opsx:onboard

AI:  Welcome to OpenSpec! I'll walk you through a complete change
     using your actual codebase. Let me scan for a small, safe
     improvement we can make together...
```

`/opsx:onboard` 会找到一个真实（且小巧）的改进，为它创建一个 change、实现它并归档它，同时逐步讲解每一步。它大约需要 15 到 30 分钟，并会留给你一个真实、可保留也可丢弃的 change。这是最温和的学习方式。参见[命令](commands.md#opsxonboard)。

## 从终端检查你的工作

任何时候，你都可以在终端中查看当前的状态：

```bash
$ openspec list                      # active changes
$ openspec show add-dark-mode        # one change in detail
$ openspec validate add-dark-mode    # check structure
$ openspec view                      # interactive dashboard
```

这些都是只读检查工具。提议与构建仍然通过聊天里的斜杠命令完成。完整细节见 [CLI 参考](cli.md)。

## 下一步去哪里

- [先探索](explore.md)：不确定时推荐的起步方式
- [工作流](workflows.md)：上面的各种模式，以及何时使用各自模式的决策指导
- [命令](commands.md)：每个斜杠命令的详细说明
- [快速上手](getting-started.md)：规范的首个 change 演练
- [概念](concepts.md)：各部分为何以这种方式组合在一起
