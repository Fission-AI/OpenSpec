# 先探索 (Explore First)

**`/opsx:explore` 是你的思想伙伴。只要你遇到问题却还没有方案，就找它。** 它会调查你的代码库、和你一起权衡各种选项，并厘清你真正想要什么——这一切都发生在任何一个 artifact 或一行代码被创建之前。当思路清晰后，它把工作移交给 `/opsx:propose`。

如果你从这些文档里只养成一个习惯，就养成这个：**拿不准时，先探索，再提议。**

这就是它重要的原因。AI 编码助手很"热切"。你含糊地一问，它们就会自信地构建出*某个东西*，只是可能并不是你需要的那个。Explore 就是解药。它是一场零风险的对话，你和 AI 一起弄清正确的做法，这样等你提议时，提议的就是正确的东西。

## 何时该探索

探索作为第一步正确的频率，比人们以为的要高。在以下任一情况成立时使用它：

- 你知道*问题*但不知道*方案*。（"页面很慢。""Auth 一团糟。""我们总是收到重复订单。"）
- 你在多个方案间做选择，并希望结合你的真实代码看清权衡。
- 你刚接触一个代码库，需要在改动前理解某样东西如何运作。
- 需求还很模糊，你想在下手前把它磨尖。
- 你怀疑这项工作的实际规模比看起来更大或更小，想诚实地划定范围。

只有当你已经确切知道自己想要什么、以及怎么做时，才跳过探索。那种情况直接去 [`/opsx:propose`](commands.md#opsxpropose)。

## 它做什么（以及不做什么）

Explore 是一场**对话**，而不是一个生成器。

**它会：**

- 阅读并搜索你的代码库，以回答真实的问题。
- 比较各种选项，并点出每个选项的权衡。
- 绘制图，让设计清晰易懂。
- 帮你把一个模糊的想法收窄成一个具体、可构建的范围。
- 当你准备好时，过渡到 `/opsx:propose`。

**它不会：**

- 创建 change 文件夹。
- 写任何 artifact（没有 proposal、specs、design 或 tasks）。
- 写或修改代码。

这正是关键。探索不花你任何代价，也不让你对任何东西许诺。你可以探索三个死胡同，从每个里学到点东西，然后才提议那个活下来的路径。

## 它已经装好了

好消息：`/opsx:explore` 随默认的 **core** profile 一并交付，就排在 `propose`、`apply`、`update`、`sync` 和 `archive` 旁边。你不需要启用任何东西。只要 OpenSpec 已在你的项目里设置好，explore 在你的 AI 聊天里就已就绪。（和所有 `/opsx:*` 命令一样，你在助手的聊天里输入它，而不是终端。参见[命令工作原理](how-commands-work.md)。）

## 一个完整示例

看看一个模糊的担忧如何变成一个清晰、可构建的 change。

```text
You: /opsx:explore

AI:  What would you like to explore?

You: Our checkout sometimes creates duplicate orders. I don't know why
     and I don't know how to fix it safely.

AI:  Let me dig into the checkout path...
     [reads the order service, the payment webhook handler, and the
      client submit logic]

     Here's what I found. There are two ways a duplicate can happen:

     1. The client can submit twice (double-click, retry on slow network).
        Nothing debounces it.
     2. The payment webhook can fire more than once, and the handler
        creates an order each time. There's no idempotency key.

     Cause #2 is the dangerous one: it can charge and fulfill twice.

     Three ways to fix it, roughly in order of robustness:
     - Idempotency key on the order-creation endpoint (handles both causes)
     - Dedup on the webhook by payment-intent id (handles #2 only)
     - Client-side debounce (handles #1 only, papers over the real bug)

     Given your code already stores the payment-intent id, the
     idempotency-key approach is a small change with the biggest payoff.
     Want me to scope that?

You: Yes, let's do the idempotency key.

You: /opsx:propose add-order-idempotency-key

AI:  Created openspec/changes/add-order-idempotency-key/, with a proposal
     and delta spec grounded in what we just found. Ready for implementation.
```

注意发生了什么。起点是"哪里不对，我不敢动它"。二十秒的探索，把它变成了一个有名字的根因、三个排好序的选项、一条贴合现有代码的建议，以及一个精确的 change。随后的 proposal 之所以锐利，是因为思考先行了。

## 移交给 propose

Explore 不会归档到任何东西里。当你准备好时，你只需启动一个 change，AI 就会把对话里的上下文带进 artifacts。

```text
explore  ──►  propose  ──►  apply  ──►  archive
 (think)     (agree)       (build)     (record)
```

你可以用大白话讲（"把这个变成一个 change"），也可以直接运行 `/opsx:propose <name>`。无论哪种方式，你刚才做的探索都会成为 proposal 的基石，而不是随手丢弃的聊天。

如果你使用扩展命令集，explore 也可以改为移交给 `/opsx:new`，以便一步步创建 artifact。参见[工作流](workflows.md)。

## 做好探索的提示

- **带来问题，而不是方案。** "登录感觉很慢"给 AI 留出了调查的空间。"加一个 Redis 缓存"则让你预先承诺了一个尚未验证的答案。
- **大声要求看权衡。** "每个选项的缺点是什么？"会让你得到更诚实的比较。
- **先让它读代码。** 最好的探索始于 AI 真正去看你的代码，而不是瞎猜。如果有帮助，就把它指向相关区域。
- **随时可以放弃。** 如果探索揭示这个想法不值得做，那是一种胜利。你以很低的代价学到了这一点。
- **在 change 中途再探索。** 在 `/opsx:apply` 时卡住了？你可以退一步，探索一个子问题，然后回来。

## 实在的权衡

**你得到什么：** explore 在最便宜的时刻——任何 artifact 诞生之前——就拦下了走错的弯路。它在陌生代码里尤其强大，因为 AI 阅读和总结系统的能力，能替你省下一个下午的摸索。

**它要你付出什么：** 一点耐心。explore 是一场对话，所以它比直接发出 `/opsx:propose` 然后碰运气要慢。对于你确实已经理解的工作，那额外的一步纯属开销，你应该跳过它。

经验法则：任务越模糊，explore 的回报越大。任务越清晰，你就越可以直接跳到提议。

## 下一步去哪里

- [命令：`/opsx:explore`](commands.md#opsxexplore)：精确的参考
- [工作流](workflows.md)：作为日常循环一部分的 explore
- [示例与配方](examples.md#recipe-3-exploring-before-you-commit)：在完整演练中的 explore
- [快速上手](getting-started.md)：首个 change 指南，内含探索
