# 编辑与迭代变更（change）

**变更中的每个 artifact（产物）都只是 Markdown 文件，你可以随时编辑。** 这里没有锁死的"规划阶段"，没有审批关卡，也不需要进入什么特殊的编辑模式。已经开始动手了，却想改 proposal？直接打开 `proposal.md` 改掉它。实现到一半发现设计是错的？把 `design.md` 修好，然后继续。这就是全部答案，而且这是刻意为之的。

本页要解决的，就是你心头闪过"等等，我能回头改掉那东西吗？"的那个瞬间。能。下面针对各种常见情况逐一说明。

## 编辑任何内容的两种方式

你永远都有这两条路：

1. **直接编辑文件。** artifact 是位于 `openspec/changes/<name>/` 下的纯 Markdown。在你的编辑器里打开 `proposal.md`、`design.md`、`tasks.md`，或者 `specs/` 下的某个 delta spec，直接改即可。无需其它任何操作。

2. **让 AI 帮你改。** 在对话里直接说你想要什么："更新 proposal，去掉缓存方案，新增一个限流小节"，或者"设计应该用队列，而不是轮询"。AI 会以该变更（change）的其余内容作为上下文，替你修改 artifact。

看当下哪种顺手就用哪种。只是微调措辞？改文件。要重新想明白大方向？让 AI 带着完整上下文来修订。

## "我已经动手了，怎么更新 proposal（或 specs）？"

直接更新就行。同一个变更（change），只是更精炼了。

如果你用的是扩展命令，自然的工作流是：先编辑 artifact，然后运行 `/opsx:continue` 从新状态接续推进，或者运行 `/opsx:apply` 继续对着更新后的计划实现。如果你用的是默认的 `core` 命令，编辑 artifact 后运行 `/opsx:apply` 即可；它会读取当前文件，所以始终按 artifact 现在所说的内容来构建。

心智模型：artifact 是活的计划，而不是一纸签好的合同。AI 始终基于它们的当前内容来工作，所以编辑它们就是在引导工作方向。

```text
你: 我想改一下这个变更里的方法。

你: [编辑 design.md，或者告诉 AI:]
     更新 design.md，改用后台任务，而不是同步调用。

AI:  已更新 design.md。任务列表仍然适用；要我继续 apply 吗？

你: /opsx:apply
```

这回答了非常常见的一个问题：之所以没有专门的"更新 proposal"命令，是因为你根本不需要它。文件就是事实来源（source of truth），编辑它（手动或用 AI）本身就是更新。

## "实现之后，怎么回过头来评审？"

你不必"回过头"，因为你从未离开。工作流是流动的：评审、编辑和实现并不是把你困住、必须依次经历的几个阶段。

具体来说，在跑过若干 `/opsx:apply` 之后：

- 想重新审视计划？打开 artifact 读一读，或者在终端运行 `openspec show <change>` 查看整合后的视图。
- 发现要改的地方？编辑 artifact（或让 AI 改），然后继续。
- 想要一个结构化检查，确认代码与计划一致？运行 `/opsx:verify`（扩展命令）。它会汇报完整性、正确性与一致性，且不会阻塞任何事。参见 [Workflows: Verify](workflows.md#verify-check-your-work)。

不存在一个需要"回去"的"评审阶段"，因为评审是你随时都能做的事，包括实现完成之后。

## "我手动改了代码。怎么和 OpenSpec 对齐？"

这种事天天发生，完全没问题。你在编辑器里调了点东西，现在代码和 artifact 对不上了。按真实情况，让它们重新同步即可：

- **代码现在已经是对的，spec 过时了。** 更新 delta spec（以及相关的 tasks），描述你实际交付的行为。归档之前，spec 应当与现实相符，因为归档会把 spec 合并进你的事实来源（source of truth）。
- **spec 是对的，代码偏离了。** 继续构建或修复，直到代码与 spec 一致为止。

快速暴露不一致的办法是 `/opsx:verify`：它读取你的 artifact 和代码，告诉你二者在哪里分叉。把它输出的结果当作一张对齐待办清单，等两者一致后再归档。

原则：归档之时，你的 specs 就成为记录中的事实。所以在归档之前，要让 specs 如实反映代码的实际行为。手动编辑是欢迎的；只是别让它们悄无声息地把 spec 弄得失同步。

## 不满意的 proposal，如何打磨

如果自动生成的 proposal 没切中要害，你有三种不错的做法：

- **就地迭代。** 告诉 AI 哪里不对（"范围太宽了，砍掉管理员功能"），让它修订。成本最低，通常也是对的。
- **先探索，再重新提案。** 如果问题在于想法本身就不清晰，退回到 `/opsx:explore`，想清楚，让一个更锋利的 proposal 从那里浮现出来。参见 [Explore First](explore.md)。
- **推倒重来。** 如果意图已经根本改变，一个新的变更（change）可能比修补旧的更清楚。

最后一种做法也有它自己的决策指南，见下文。

## 何时更新、何时新开一个变更（change）

简版：**意图只是被细化的同一项工作——更新；意图根本变了，或范围爆裂成不同的工作——新开。**

- 目标相同，方法更好？更新。
- 范围收窄（先交付 MVP，后续再说）？更新，然后归档，再为第二阶段新开一个变更（change）。
- 问题本身变了（"加个深色模式"变成"做一整套主题系统"）？新开变更（change）。

完整的流程图和实例在 [Workflows: When to Update vs Start Fresh](workflows.md#when-to-update-vs-start-fresh)，更深入的论述在 [OPSX: When to Update vs. Start Fresh](opsx.md#when-to-update-vs-start-fresh)。

## 关于 tasks 的一点说明

`tasks.md` 是一份活的清单，而不是冻结的计划。实现过程中，你可以添加新发现的任务、删掉后来证明不必要的任务，或者重新排序。AI 在 `/opsx:apply` 期间会逐项勾掉已完成的任务；如果你后面回来，它会从第一个未勾选的任务继续。中途编辑这份清单是预期之中的事。

## 接下来去哪

- [Workflows](workflows.md) - 各种模式，以及"更新还是新建"的决策指南
- [Reviewing a Change](reviewing-changes.md) - 动手之前，花两分钟过一遍计划
- [Explore First](explore.md) - 当一个想法需要重新推敲时，退回去的地方
- [Commands](commands.md) - `/opsx:continue`、`/opsx:apply` 和 `/opsx:verify` 的详细说明
- [Concepts: Artifacts](concepts.md#artifacts) - 每个 artifact 是做什么用的
