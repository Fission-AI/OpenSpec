<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="OpenSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>最受开发者喜爱的 spec 框架。</strong></summary>

[![Stars](https://img.shields.io/github/stars/Fission-AI/OpenSpec?style=flat-square&label=Stars)](https://github.com/Fission-AI/OpenSpec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/@fission-ai/openspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@fission-ai/openspec)
[![Contributors](https://img.shields.io/github/contributors/Fission-AI/OpenSpec?style=flat-square&label=Contributors)](https://github.com/Fission-AI/OpenSpec/graphs/contributors)

</details>
<p></p>
我们的理念：

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

> [!TIP]
> **全新工作流现已上线！** 我们用一种"以产物为导向（artifact-guided）"的新工作流重写了 OpenSpec。
>
> 运行 `/opsx:propose "your idea"` 即可开始。→ [了解更多](docs/opsx.md)

<p align="center">
  在 <a href="https://x.com/0xTab">X 上关注 @0xTab</a> 获取更新 · 加入 <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> 获取帮助与答疑。
</p>

<!-- TODO: Add GIF demo of /opsx:propose → /opsx:archive workflow -->

## 实际演示

```text
You: /opsx:explore
AI:  What would you like to explore?
You: I want dark mode but I'm not sure how to do it cleanly.
AI:  Let me look at your styling setup...
     Cleanest path here: CSS variables + a small theme context,
     with system-preference detection. No new dependencies. Scope it?
You: Yes, let's do it.

You: /opsx:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /opsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /opsx:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>spec 文件长什么样？</strong></summary>

纯 Markdown 编写——需求配有具体场景，无需学习特殊语法。以下是上面创建的 `specs/` 文件夹中的内容：

```markdown
## ADDED Requirements

### Requirement: Theme selection
The app SHALL let users switch between light and dark themes,
defaulting to the system preference.

#### Scenario: User toggles dark mode
- **WHEN** the user clicks the theme toggle
- **THEN** the app switches to dark mode and persists the choice
```

这些由你的 AI 编写；在任何代码写出之前，由你来审阅方案。

OpenSpec 本身也是用 OpenSpec 构建的——可浏览本仓库实时运行的 [specs](openspec/specs) 与进行中的 [changes](openspec/changes)，查看大规模的真实示例。

</details>

<details>
<summary><strong>OpenSpec 仪表盘</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

</details>

## 团队为何选择 OpenSpec

无论是个人还是团队，OpenSpec 都能让你和你的 AI 在同一个仓库中保持诚实。在团队中，难点发生了变化：一项功能会横跨 API 服务、Web 应用和共享库；需求由一个团队负责、被其他团队消费；规划在代码出现之前就已经开始。

**[Stores](docs/stores-beta/user-guide.md)** 给出了答案——把规划放在独立的仓库中。这与你熟悉的 `openspec/` 结构（specs 与 changes）一致，通过 `git push` 共享，就像其他内容一样。它是整个团队和每个编码 agent 都能读取的唯一事实来源，可跨越所有仓库。

- **跨仓库功能**——一次变更，一份方案，即便代码落在三个仓库中。
- **共享需求**——平台团队负责 specs；产品团队以只读方式引用，位置就在其编码 agent 能读取的地方。不再有内容漂移的 wiki。
- **先规划后编码**——现在就把方案记录在 store 中；代码仓库随后跟进。

> Stores 目前处于 **beta（测试）** 阶段。请从 [Stores 用户指南](docs/stores-beta/user-guide.md) 开始。

## 快速开始

**需要 Node.js 20.19.0 或更高版本。**

全局安装 OpenSpec：

```bash
npm install -g @fission-ai/openspec@latest
```

然后进入你的项目目录并初始化：

```bash
cd your-project
openspec init
```

> **想让 AI 帮你完成？** 将 [安装提示词](docs/installation.md#install-with-your-ai-assistant) 粘贴到你的编码助手——它会安装 CLI、运行 `openspec init` 并验证结果。

现在和你的 AI 对话：

- **还不确定要构建什么？** 从 `/opsx:explore` 开始，它是一位无负担的思考伙伴，会阅读你的代码、权衡方案，并在动手前形成计划。（[探索指南](docs/explore.md)）
- **已经明确目标？** 直接使用 `/opsx:propose <what-you-want-to-build>`。

两者都包含在默认 profile 中。如果你想要扩展工作流（`/opsx:new`、`/opsx:continue`、`/opsx:ff`、`/opsx:verify`、`/opsx:bulk-archive`、`/opsx:onboard`），请用 `openspec config profile` 选择，并用 `openspec update` 应用。

`/opsx:propose` 是规范名称；你的工具可能将其写作 `/opsx-propose`（Cursor、GitHub Copilot）、`@opsx-propose`（Amazon Q）或 `$openspec-propose`（Codex）。`openspec init` 会为你所选的工具打印正确形式——参见 [如何调用](docs/supported-tools.md#how-to-invoke)。

> [!NOTE]
> 不确定你的工具是否受支持？[查看完整列表](docs/supported-tools.md)——我们支持 30+ 工具且持续增加。
>
> 同样兼容 pnpm、yarn、bun 和 nix。[查看安装选项](docs/installation.md)。

## 文档

**从这里开始：** **[文档首页](docs/README.md)** 汇总了所有内容。刚接触 OpenSpec？请阅读 [快速开始](docs/getting-started.md)，然后阅读 [命令如何运作](docs/how-commands-work.md)（即你真正输入 `/opsx:propose` 的地方）。

→ **[快速开始](docs/getting-started.md)**：第一步<br>
→ **[先探索](docs/explore.md)**：动手前先用 `/opsx:explore` 想清楚<br>
→ **[命令如何运作](docs/how-commands-work.md)**：斜杠命令与 CLI 的运行位置<br>
→ **[核心概念一览](docs/overview.md)**：整套心智模型，一页读懂<br>
→ **[示例与配方](docs/examples.md)**：真实变更，从始至终<br>
→ **[工作流](docs/workflows.md)**：组合与模式<br>
→ **[已有项目](docs/existing-projects.md)**：在遗留（brownfield）代码库上采用 OpenSpec<br>
→ **[编辑变更](docs/editing-changes.md)**：更新产物、回退、协调手动修改<br>
→ **[命令](docs/commands.md)**：斜杠命令与技能<br>
→ **[CLI](docs/cli.md)**：终端参考<br>
→ **[Stores](docs/stores-beta/user-guide.md)**：在独立仓库中规划，团队共享（beta）<br>
→ **[支持的工具](docs/supported-tools.md)**：工具集成与安装路径<br>
→ **[概念](docs/concepts.md)**：整体如何契合<br>
→ **[多语言](docs/multi-language.md)**：多语言支持<br>
→ **[自定义](docs/customization.md)**：打造属于你的<br>
→ **[常见问题](docs/faq.md)** · **[故障排查](docs/troubleshooting.md)** · **[术语表](docs/glossary.md)**：快速帮助


## 社区方案（schema）

通过独立仓库分发的第三方 schema 包——它们提供有主见的（opinionated）工作流，将 OpenSpec 与其他工具集成，类似于 [github/spec-kit 的社区扩展目录](https://github.com/github/spec-kit/tree/main/extensions) 处理工具集成的方式。

→ 在自定义文档中 **[浏览目录](docs/customization.md#community-schemas)**。


## 为何选择 OpenSpec？

AI 编码助手功能强大，但当需求仅存在于聊天记录中时却难以预测。OpenSpec 增加了一层轻量的 spec，让你在任何代码写出之前就先对要构建的内容达成一致。

- **构建前先达成一致**——人和 AI 在写代码前就 specs 达成一致
- **保持条理**——每次变更都有独立文件夹，包含 proposal、specs、design 和 tasks
- **灵活推进**——随时更新任何产物，没有僵化的阶段门禁
- **用你趁手的工具**——通过斜杠命令兼容 30+ AI 助手

### 我们如何对比

**对比 [Spec Kit](https://github.com/github/spec-kit)**（GitHub）——全面但笨重。僵化的阶段门禁、大量 Markdown、需要 Python 环境。OpenSpec 更轻量，让你自由迭代。

**对比 [Kiro](https://kiro.dev)**（AWS）——强大，但你被锁定在其 IDE 中，且只能用 Claude 模型。OpenSpec 兼容你已经在用的工具。

**对比"什么都不用"**——没有 specs 的 AI 编码意味着模糊的提示词与不可预测的结果。OpenSpec 在不增加繁文缛节的前提下带来可预测性。

## 更新 OpenSpec

**升级软件包**

```bash
npm install -g @fission-ai/openspec@latest
```

**刷新 agent 指引**

在每个项目中运行它，以重新生成 AI 指引并确保最新的斜杠命令生效：

```bash
openspec update
```

## 使用注意事项

**模型选择**：OpenSpec 在高推理（high-reasoning）模型上表现最佳。我们推荐在规划与实现中都使用 Codex 5.5 和 Opus 4.7。

**上下文整洁**：OpenSpec 受益于干净的上下文窗口。在开始实现前清理上下文，并在整个会话中保持良好的上下文整洁度。

## 贡献

**小型修复**——Bug 修复、错别字更正和小幅改进可直接以 PR 提交。

**较大的改动**——对于新功能、重大重构或架构变更，请先提交一份 OpenSpec 变更提案，以便我们能在实现开始前就意图和目标达成一致。

撰写提案时请牢记 OpenSpec 的理念：我们服务于使用不同编码 agent、模型和用例的广泛用户。改动应当对所有人都适用。

**欢迎 AI 生成的代码**——只要经过测试与验证。包含 AI 生成代码的 PR 应注明所用的编码 agent 与模型（例如"Using Claude Code with claude-opus-4-5-20251101 生成"）。

### 开发

- 安装依赖：`pnpm install`
- 构建：`pnpm run build`
- 测试：`pnpm test`
- 本地开发 CLI：`pnpm run dev` 或 `pnpm run dev:cli`
- 约定式提交（单行）：`type(scope): subject`

## 其他

<details>
<summary><strong>遥测</strong></summary>

OpenSpec 收集匿名的用量统计。

我们仅收集命令名称和版本，以了解使用模式。不收集参数、路径、内容或个人身份信息（PII）。在 CI 中自动禁用。

**选择退出（满足其一即可）：**
- `openspec config set telemetry.enabled false`（全局配置；未设置即为开启）
- `export OPENSPEC_TELEMETRY=0` 或 `export DO_NOT_TRACK=1`（环境变量覆盖配置）

</details>

<details>
<summary><strong>维护者与顾问</strong></summary>

有关帮助指导项目的核心维护者与顾问名单，请参见 [MAINTAINERS.md](MAINTAINERS.md)。

</details>



## 许可证

MIT
