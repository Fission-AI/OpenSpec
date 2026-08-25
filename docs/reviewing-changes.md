# 审查 Change (Reviewing a Change)

OpenSpec 的全部承诺在于：你和你的 AI **在写任何代码之前，先就"要构建什么"达成一致**。但这个一致只有在你真正去读 AI 起草的内容时才算数。本页讲的是你做这件事的两分钟——打开什么、按什么顺序、看什么。

这笔赌注很简单：在一个段落长的计划里发现走错方向，几乎不花成本；在 300 行代码里发现同样的错误，就不是了。审查就是你兑现这笔赌注的地方。

## 你要审查的两个时刻

恰好有两个：

```
/opsx:propose ──► REVIEW THE PLAN ──► /opsx:apply ──► REVIEW THE CODE ──► /opsx:archive
                  (before any code)                    (/opsx:verify)
```

1. **在 `/opsx:propose` 之后**（或 `/opsx:ff`），在 `/opsx:apply` 之前——在它还只是文字时就读计划。
2. **在构建之后**，用 `/opsx:verify`——检查代码是否真的做到了计划所说。

第一次审查最能帮你省事，也最常被人们跳过。本页大部分篇幅都在讲它。

## 按这个顺序读

一个 change 是 `openspec/changes/<name>/` 下的纯 Markdown 文件夹。按这个顺序读，一旦有错你就能最早抽身：

```
openspec/changes/add-dark-mode/
├── proposal.md      1. the intent and scope   ← if this is wrong, stop here
├── specs/…/spec.md  2. the requirements       ← the heart of the review
├── design.md        (only for bigger changes) — the technical approach
└── tasks.md         3. the plan of work
```

你不必逐行都读。你需要回答三个问题，每个文件一个。

## proposal：这是要解决的正确问题吗？

先打开 `proposal.md`。它记录了"为什么"和"做什么"——用一两段话讲清意图、范围、方案。

**好的样子：** 一个清晰的意图、一个你认得的范围、以及一个"为什么现在就值得做"的理由。

**危险信号：**

- 它解决的是跟你要求的*略有不同*的问题。
- 范围变大了——你要的是主题切换，proposal 却顺便也动了 auth。
- 它含糊不清。"改进设置页"不是一个范围；"添加一个尊重系统偏好的暗色模式开关"才是。

**要回答的问题：** *这和我实际要求的相符吗？有没有什么东西在悄悄混进来？* 如果答案是否定的，停下——别往下读了，去改 proposal（参见[及时反馈](#pushing-back-is-cheap)）。

## spec delta：是否正确地定义了"完成"？

这是审查的核心。`specs/` 下的 delta spec 说的是这个 change 上线时会*为真*的事——以 requirements 和验证它们的 scenarios 的形式：

```markdown
## ADDED Requirements

### Requirement: Dark Mode Toggle
The system SHALL let a user switch between light and dark themes.

#### Scenario: Respects the OS preference on first load
- GIVEN a user who has never set a theme
- WHEN they open the app on a device set to dark mode
- THEN the app renders in dark mode
```

**一条好的 requirement 长什么样：** 一句清晰的、可以交给测试人员的 `SHALL`/`MUST` 陈述，以及至少一个其 GIVEN/WHEN/THEN 真正演练了该陈述的 scenario。

**危险信号：**

- **一条含糊的 requirement。** "系统 SHALL 要快"既没法构建也没法测试。什么算快？
- **一条没有 scenario 的 requirement**，或者 scenario 并没有测试它所属的 requirement。
- **最有价值的一个发现：遗漏了什么。** AI 忠实地写下你*说的*。你的工作是注意到你*忘了*说的。如果你最在意系统偏好的情况，而没有任何 scenario 提到它，那这正是审查在自我回报。

读 delta 时自问：*如果系统确实只做到了这些，我会满意吗？* 这里还没涉及代码，所以改起来依然很便宜。

## tasks：工作计划是否合理？

最后打开 `tasks.md`。它是 AI 会逐步完成的实现清单。

**好的样子：** 有序的步骤，每一步都能追溯到某条 requirement，没有神秘内容。

**危险信号：**

- 一条没有对应 requirement 的 task（它从哪来的？）。
- 一个巨大的"实现这个功能"task，把所有真正的决策都藏了起来。
- 一条触及你刚批准的范围之外内容的 task。

你在这里不是在估算，也不是在微观管理——你是在检查计划是否与你已接受的 requirements 相符。

## 及时反馈成本很低

如果这三个问题中有任何一个答错了，就说出来。这里没有阶段，也没有被锁死的东西——你改掉它然后继续。两种方式，和[编辑 Change](editing-changes.md) 里完全一致：

- **自己编辑文件。** 它是纯 Markdown；改一下范围那一行、收紧一条 requirement、删掉一个 task。
- **告诉 AI 哪里错了**，让它去修订：*"去掉 auth 的改动——超出范围，"* *"加一个用户已经选过主题时的 scenario，"* *"把 task 3 拆成 schema 和 UI 两部分。"*

然后重读你改过的部分。反复起草，直到它成为一份你愿意署名的计划。这种你来我往*就是*产品在运转。

## 代码之后：verify

工作构建完成后，`/opsx:verify` 就是你的第二次审查。它会重读 artifacts 和代码，并从三个维度报告不一致：

| 维度 | 检查内容 |
|-----------|----------------|
| **Completeness** | 每个 task 都完成、每条 requirement 都实现、scenarios 都覆盖 |
| **Correctness** | 实现符合 spec 的意图，边界情况已处理 |
| **Coherence** | 设计决策确实体现在代码中 |

```
You: /opsx:verify

AI:  Verifying add-dark-mode...

     COMPLETENESS
     ✓ All 8 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "Respects the OS preference on first load" has no test coverage
```

它会把问题标记为 CRITICAL、WARNING 或 SUGGESTION，而且它**不会**阻塞归档——它只是把缺口暴露出来，把决定权留给你。这正是"AI 写了代码"和"它构建了我们说好的东西"之间的区别。

`/opsx:verify` 属于 expanded profile。如果你没有它，用 `openspec config profile`（然后 `openspec update`）开启，或者干脆自己重读 change 和 diff。

## 审查要量体裁衣

并非每个 change 都值得完整走一遍。一个改一个文件的拼写错误，值得花二十秒扫一眼。一个触及 auth、payments 或无法恢复的数据的 change，值得上面的每个问题都过一遍。重点从来不是流程——而是把注意力花在错误会很昂贵的地方，在错误无关紧要的地方略读。

## 两分钟检查清单

- [ ] proposal 的意图与我要求的一致。
- [ ] 没有任何多余的东西混进范围。
- [ ] 每条 requirement 都具体得可以测试。
- [ ] 每条 requirement 都有真正演练它的 scenario。
- [ ] 我最在意的情况已被覆盖。
- [ ] tasks 能对应到 requirements；没有神秘或超范围的内容。
- [ ] 如果 AI 只构建这些、不多不少，我会感到安心。

如果七条都通过，就放心地运行 `/opsx:apply`。如果有任何一条没过，那不是挫折——那是这两分钟在尽职。

## 下一步去哪里

- [编写优秀的 Spec](writing-specs.md) —— 另一面：如何起草值得批准的 requirements 和 scenarios。
- [编辑与迭代 Change](editing-changes.md) —— 开始之后修改计划的机制。
- [工作流](workflows.md) —— 审查在更大的循环中处于什么位置。
