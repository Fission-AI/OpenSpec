# OpenSpec 在团队中的使用

其它指南里的所有内容，无论你是单打独斗还是二十人的团队，工作方式都完全一样。团队场景下真正变化的，是那些边缘问题：specs 放在哪、队友怎么评审一份计划、这一切又怎么融入我们已有的 pull-request 流程？

简短的回答：一个变更（change）就是若干文件，而 OpenSpec 从不触碰 git。所以它贴合你既有的工作流，而不是去取代它。本页把行之有效的约定讲清楚。

## 一条铁律：OpenSpec 不碰 git

OpenSpec 在 `openspec/` 下读写纯 Markdown。它从不在你的项目里提交（commit）、开分支（branch）、推送（push）或拉取（pull）——也从不自行克隆或同步一个 [store](stores-beta/user-guide.md)。这意味着：

- **你把 `openspec/` 当作普通源码一样提交。** specs、进行中的变更（change）和归档（archive）都是你项目历史的一部分。（对，把整个文件夹提交进去——参见 [FAQ](faq.md#should-i-commit-the-openspec-folder-to-git)。）
- **一个变更（change）就是一个你像代码一样做版本管理的文件夹。** `openspec/changes/add-dark-mode/` 不过是一个分支（branch）上的若干文件。
- **下面的一切都是约定，而非强制。** OpenSpec 不会逼你照此办理；只是这样贴得干净利落。

## 日常循环

行之有效的工作流，是把一个变更（change）映射到一条分支（branch）和一个 pull request：

```
git switch -c add-dark-mode        start a branch, as usual
   │
/opsx:propose add-dark-mode        draft the plan (proposal + specs + tasks)
   │
REVIEW THE PLAN                    you read it before any code — see Reviewing a Change
   │
/opsx:apply                        build it; artifacts + code change together
   │
git commit && open a PR            the PR contains the spec delta AND the code
   │
teammate reviews, merges
   │
/opsx:archive                      fold the delta into specs/, move the change to archive/
```

计划与代码并排躺在同一条分支（branch）里，所以你的队友会一并评审二者；而六个月之后，归档的 spec 仍然能解释清楚代码为何是现在这副模样。

## 在 pull request 中评审 specs

这正是团队感受到回报的地方。当一个 PR 包含了该变更（change）的 delta spec，评审者会得到一份原始 diff 永远给不了的东西：**一段用大白话写明的"这次变更本该做什么"**，甚至一行代码都没读之前就有了。

对评审者而言，一个理想的评审顺序：

1. **读 `proposal.md`** —— 这问题对不对、范围恰不恰当？
2. **读 `specs/` 下的 delta** —— "完成"是否被正确地定义了？（这就是 [Reviewing a Change](reviewing-changes.md) 的两分钟过场，现在发生在 PR 里。）
3. **然后读代码 diff** —— 它是否精确地交付了那些 requirement（需求）？

一个对*方法*有不同意见的评审者，可以针对 proposal 便宜地把话说出来，而不必在 300 行代码里翻来覆去地争。把 delta spec 放在 PR 描述靠顶的位置，或者把评审者指到变更文件夹，好让他们从这里开始。

## 何时归档

归档会把一个变更（change）的 deltas 折叠进你主线的 `openspec/specs/`，并把变更文件夹移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`。因为 `specs/` 是**共享的事实来源（source of truth）**，在团队里，时机就很要紧。两种可行的约定：

- **PR 合并后归档（推荐）。** 分支（branch）带着进行中的变更（change）；一旦合并进主线分支（branch），就在那里归档（通常是一笔很小的后续提交，或一次计划内的清理）。这能保证共享的 `specs/` 只随真正交付了的工作向前推进。
- **在 PR 内部归档。** 对小团队更简单：同一笔加代码的 PR 也顺带同步并归档。代价是你的 `specs/` diff 和代码 diff 会一起落地，可能让 PR 更嘈杂。

选一种，并保持一致。无论哪种，在归档前 `/opsx:archive` 都会检查 tasks 是否完成，并主动提议先同步，以免半成品被意外合并进去。

## 两个人，并行的变更（change）

因为变更（change）是不同的文件夹，它们不会撞车：

- **不同的变更（change），不同的人——没问题。** `add-dark-mode` 和 `rate-limit-login` 是不同分支（branch）上不同的文件夹；在双方都归档之前，它们从不彼此触碰。
- **一个变更（change），一个负责人。** 两个人编辑同一个变更文件夹，冲突的方式跟两个人编辑同一个文件一模一样。让一个变更（change）保持单一作者，或者把它拆成两个变更（change）（这也是 [right-size](writing-specs.md#right-size-the-change) 的另一个理由）。
- **唯一会发生冲突的地方是 `specs/`。** 如果两个变更（change）都改动了*同一个* requirement（需求），归档第二个时就会在 `openspec/specs/…/spec.md` 里冲突——像处理任何合并冲突那样解决它，保留反映现实的那个 requirement（需求）。这种情况很罕见，而且它是一项特性：是 git 在告诉你，两个变更（change）对系统"应当如何表现"产生了分歧。

## 当规划长大到超出一个仓库

以上一切都假设计划住在代码仓库自己的 `openspec/` 文件夹里，这也是正确的默认选择。当你的规划真正横跨多个仓库或多个团队——一个功能触及三个服务，或者某个团队拥有 requirement（需求）、另一些团队来消费——那正是 beta 版 **stores** 特性的用武之地：规划拥有自己独立的仓库，任何代码仓库都能指向它。从 [Stores User Guide](stores-beta/user-guide.md) 开始。

## 接下来去哪

- [Reviewing a Change](reviewing-changes.md) — 评审过场，现在就在你的 PR 内部。
- [Writing Good Specs](writing-specs.md) — 包括如何 right-size 一个变更（change），让它适配一条分支（branch）。
- [Stores User Guide](stores-beta/user-guide.md) — 横跨仓库与团队的规划。
