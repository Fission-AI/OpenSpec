# 编写优秀的 Spec (Writing Good Specs)

你很少从空白页开始写 spec。你用平实的语言描述一个 change，`/opsx:propose` 起草 requirements 和 scenarios，然后你把它们改好。本页讲的就是最后这部分——"好"是什么样子，以及如何把 AI 引向它。

它是[审查 Change](reviewing-changes.md) 的姊妹篇：审查是抓住草稿里的薄弱点，编写则要知道一份有力的草稿由什么构成。

## spec 是行为，不是代码

spec 说的是你的系统*做什么*，用任何人都可核查的方式来表述——而不是它如何被构建。它由 **requirements**（行为陈述）和 **scenarios**（证明它们的具体示例）组成。

```markdown
### Requirement: Session Timeout
The system SHALL expire a session after 30 minutes of inactivity.

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass with no activity
- THEN the session is invalidated and the user must re-authenticate
```

把*如何做*——队列、库、表结构——留在 `design.md` 或代码里。当行为和实现混进同一条 requirement 时，这条 requirement 就不再可测试，并且一旦代码变动就开始过时。

## 什么是一条好的 requirement

一条好的 requirement 是一种行为，表述得如此直白，以至于你可以把它交给别人去测试。

- **一条陈述，一个 `SHALL`/`MUST`。** 如果一条 requirement 里有三个"而且还要"的从句，那它其实是三条 requirement。把它们拆开。
- **可观测。** 代码之外的人应当能判断它是否成立。"系统 SHALL 在上传超过 10 MB 时显示错误横幅"是可观测的。"系统 SHALL 优雅地处理大文件上传"则不是。
- **强度恰当。** OpenSpec 使用 RFC 2119 关键字，它们含义不同：

  | 关键字 | 含义 |
  |---------|---------|
  | `MUST` / `SHALL` | 硬性要求。不可协商。 |
  | `SHOULD` | 强烈建议，但允许有正当理由的例外。 |
  | `MAY` | 真正可选。 |

  默认就选 `MUST`/`SHALL`。只用 `SHOULD` 当你真正意指"除非有充分理由不这么做"。

检验一条 requirement 的方法：*一个从没看过代码的测试人员，能否判断它是否通过？* 如果不能，它就需要磨尖。

## 什么是一个好的 scenario

scenario 是 requirement 体现价值的地方。每一个都是具体的 GIVEN / WHEN / THEN，有可能变成自动化测试。

- **它要演练自己的 requirement。** 一个只是用别的措辞复述 requirement 的 scenario 什么也测不了。让它成为一个有特定结果的具体情境。
- **覆盖重要的情形，而不只是 happy path。** 成功登录很容易。空输入、过期令牌、第二次点击、出错的情况——bug 就藏在这些地方，也是一个 scenario 最值得存在的地方。
- **在标题中点明情形。** "Scenario: Rejects an expired token" 让审查者一眼就看出覆盖了什么；"Scenario: Test 2" 则不能。

一个有用的习惯：在批准前自问*哪个情形如果被打破会让我最恼火？*——并确保有一个 scenario 点名了它。

## 选对 delta 的类型

一个 change 用三种小节类型来描述它对 specs 的修改。用对类型，才能让你的归档 spec 保持诚实：

- **`## ADDED Requirements`** —— 之前不存在的全新行为。
- **`## MODIFIED Requirements`** —— 已存在并正在改变的行为。包含完整的全新版本；附一行说明改了什么，有助于审查者。
- **`## REMOVED Requirements`** —— 正在消失的行为，附一行说明原因。

归档时，ADDED 会被追加到主 spec，MODIFIED 替换旧版本，REMOVED 则从其中删除。当某个 capability 的最后一条 requirement 被移除时，这个 capability 就被退役了：archive 不会留下一个空的 spec，而是删除 `openspec/specs/<capability>/spec.md`。因为那是唯一会删除文件的归档步骤，所以它必须被显式请求——在 change 的 `.openspec.yaml` 中，与文件本就需要的 `schema:` 一起，加上 `retire_capabilities: true`。没有它的话，归档会中止并告诉你。退役会删除整个文件，因此当 spec 中除了标题、`## Purpose` 和它的 requirement 块之外还包含其他内容时——一个 `## Notes` 小节、某条 requirement 下的注释——也会遭到拒绝。中止信息会点名那些行；把它们移入 `## Purpose` 或某条 requirement，或手动删除该 spec。对于位于调用方 checkout 中的 spec，归档输出还会点名那个能恢复已提交文件的 `git checkout`；被选中的 store 收到的则是作用域限定在 checkout 的恢复指引。如果你把一个真实的 change 标成 ADDED，最终会得到两条相互竞争 requirement；如果你把新行为描述成 MODIFIED，则没有可替换的对象。拿不准时，打开当前 spec 看看那条 requirement 是否已经在那里。

还有一节值得了解。当你的 delta 创建一个尚不存在的 capability 时，用 `## Purpose` 开头——一两句话说明这个 capability 是做什么用的。归档会把这用作它所创建的主 spec 的 Purpose；如果跳过，你就会得到一个需要手动填的 `TBD` 占位符。既有的 spec 已经有 Purpose，所以 delta 里的会被忽略——要改的话直接编辑 `openspec/specs/<capability-path>/spec.md`。这里的 `<capability-path>` 是相对于 `specs/` 的目录，例如在扁平项目里是 `user-auth`，在按 domain 组织的项目里是 `identity/user-auth`。

## 给 change 定合适的大小

最常见的撰写错误不是某条 requirement 措辞不好——而是把一个 change 写成了三个 change。

**一个好的 change 有一个能用一句话说清的意图。** "加一个暗色模式开关。""给登录端点加限流。""把 session 从 cookie 迁移走。"如果描述这个 change 需要很多"而且还要"，那就是该拆分的信号。

一个 change 过大的迹象：

- proposal 的范围读起来像一列互不相干的功能。
- 审查它会花掉一个下午，所以没人会审。
- 两个人没法不在上面撞车地同时做。
- 一半的 task 本可以单独上线。

更小的 change 更容易审查、更容易在一次专注的会话里构建，也更容易在六个月后——当只剩归档记录时——去理解。你随时可以并行跑多个 change——见[编辑与迭代](editing-changes.md) 和[工作流](workflows.md)。

反方向也会发生：改一个字符的拼写错误，不需要三条 requirement 和一份设计文档。让流程的隆重程度匹配事情的重要程度。

## 如何把 AI 引向一份好的草稿

因为 `/opsx:propose` 负责第一版草稿，你拿回来的质量取决于你输入的质量。你不必亲手写 requirements——你只需把 AI 瞄得准：

- **说清意图与边界。** *"加一个暗色模式开关，首次加载时跟随系统设置——不要动现有的主题 API。"* 超范围的那一半和范围内的一半同样重要。
- **点名你关心的情形。** *"确保有一个针对已经手动选过主题的用户 scenario。"* AI 会覆盖你指到的东西。
- **然后编辑。** 它是纯 Markdown。收紧一条含糊的 `SHALL`、删掉一个什么也测不出的 scenario、补上它漏掉的情形——或者让 AI 来做：*"timeout 那条 requirement 太含糊，把它固定到 30 分钟。"*

起草、磨尖、重复。几轮下来，就会产出一份你会信任的 spec，而这正是全部意义。

## 一份快速检查清单

- [ ] 每条 requirement 是一种带有 `SHALL`/`MUST` 的可观测行为。
- [ ] 没有任何实现细节被烤进 requirements。
- [ ] 每条 requirement 至少有一个真正演练它的 scenario。
- [ ] 重要的边界与错误情形都有 scenario，而不只是 happy path。
- [ ] delta 相对于当前 spec 正确地使用了 ADDED / MODIFIED / REMOVED。
- [ ] 整个 change 有一个能用一句话说清的意图。

## 下一步去哪里

- [审查 Change](reviewing-changes.md) —— 拦下漏网之鱼的两分钟检查。
- [概念](concepts.md) —— spec、change 和 delta 背后的更深模型。
- [示例与配方](examples.md) —— 从开始到结束的真实 change。
