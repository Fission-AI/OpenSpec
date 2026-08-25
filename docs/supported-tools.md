# 支持的工具 (Supported Tools)

OpenSpec 可与许多 AI 编码助手配合使用。当你运行 `openspec init` 时，OpenSpec 会根据你当前激活的 profile/工作流选择以及分发（delivery）模式来配置所选工具。

## 工作原理

对于每个所选工具，OpenSpec 可以安装：

1. **Skills**（如果分发包含 skills）：`.../skills/openspec-*/SKILL.md`
2. **Commands**（如果分发包含 commands）：工具专属的 `opsx-*` 命令文件

Codex 仅支持 skills：即使分发（delivery）设置为 `commands`，OpenSpec 仍会为 Codex 安装 `.agents/skills/openspec-*/SKILL.md`，并且不会生成 Codex 的自定义 prompt 文件。旧的 `.codex/skills` 路径下由 OpenSpec 管理的 skills 会在其替换文件写入后完成对齐；自定义的以及与默认产生分歧的文件都会被保留。

默认情况下，OpenSpec 使用 `core` profile，包含：

- `propose`
- `explore`
- `apply`
- `update`
- `sync`
- `archive`

你可以通过 `openspec config profile` 启用扩展工作流（`new`、`continue`、`ff`、`verify`、`bulk-archive`、`onboard`），然后运行 `openspec update`。

## 如何调用

这些文档以 `/opsx:propose` 作为规范名称，但每个工具会按照它加载 OpenSpec 写入文件的方式来拼写。请在下面的[工具目录参考](#tool-directory-reference) 中找到你的工具命令路径，然后据此对应。

| Command file OpenSpec writes | You type | Tools |
|------------------------------|----------|-------|
| `.../commands/opsx/<id>.*` — an `opsx/` folder namespaces it | `/opsx:<id>` | Claude Code, CodeBuddy, Crush, Gemini CLI, Lingma, Qoder, ZCode |
| `.../opsx-<id>.*` — the filename is the command | `/opsx-<id>` | Every other tool with generated command files, except Amazon Q and Devin |
| `.devin/workflows/opsx-<id>.md` — read by only one of Devin's two agents | `/opsx-<id>` on Devin Desktop, `/openspec-<skill>` on Devin Local | Devin Desktop\*\*\*\* |
| `.amazonq/prompts/opsx-<id>.md` — a prompt, not a command | `@opsx-<id>` | Amazon Q Developer |
| none — skills only | `/openspec-<skill>` | CodeArts, ForgeCode, Hermes, MiniMax Code, Mistral Vibe, Zed Agent, shared `.agents` |
| none — Kimi Code | `/skill:openspec-<skill>` | Kimi Code |
| none — Codex CLI | `$openspec-<skill>` | Codex ([`/openspec-<skill>` is not recognized](https://github.com/openai/codex/issues/11817)) |

因此，`/opsx:propose` 在 Cursor 中是 `/opsx-propose`，在 Amazon Q 中是 `@opsx-propose`，在 Codex 中是 `$openspec-propose`。

有两件事各自独立变化，这正是这些行无法合并的原因：

- **名称。** 第 1–2 行仅在文件如何命名命令上不同，而 `opsx-<id>` / `opsx:<id>` 主干对所有生成命令文件的工具都是一致的。
- **包装形式。** Amazon Q 将其文件载入一个用 `@` 调用的 prompt 库。仅支持 skills 的工具根本不会生成命令文件，因此它们最后三行使用 *skill* 名称（列在[生成的 Skill 名称](#generated-skill-names) 下），这些名称与命令 id 并非一一对应（`/opsx:apply` 对应的是 `openspec-apply-change` skill）。

上面的命令路径模式刻意采用与扩展名无关（`.*`）的形式：扩展名属于工具本身（Gemini CLI 用 `.toml`，Continue 用 `.prompt`，Kiro 和 GitHub Copilot 用 `.prompt.md`），而且少数工具在选择器里会带上扩展名显示名称。请匹配目录的形状，而不是扩展名。

OpenSpec 生成的文件，以及安装完成后打印的"快速上手"提示，已经为你所选的工具使用了正确的形式——所以最快的办法就是直接看那条提示。

## 工具目录参考

| Tool (ID) | Skills path pattern | Command path pattern |
|-----------|---------------------|----------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/openspec-*/SKILL.md` | `.agent/workflows/opsx-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/openspec-*/SKILL.md` | `.bob/commands/opsx-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| Cline (`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| Command Code (`command-code`) | `.commandcode/skills/openspec-*/SKILL.md` | `.commandcode/commands/opsx-<id>.md` |
| CodeArts (`codeartsagent`) | `.codeartsdoer/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Codex (`codex`) | `.agents/skills/openspec-*/SKILL.md` | Not generated (skills-only; use `$openspec-*`) |
| Devin Desktop, formerly Windsurf (`devin`) | `.devin/skills/openspec-*/SKILL.md` | `.devin/workflows/opsx-<id>.md`\*\*\*\* |
| ForgeCode (`forgecode`) | `.forge/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| Continue (`continue`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| Crush (`crush`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md`\*\* |
| Hermes Agent (`hermes`) | `.hermes/skills/openspec-*/SKILL.md`\*\*\* | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| iFlow (`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| Junie (`junie`) | `.junie/skills/openspec-*/SKILL.md` | `.junie/commands/opsx-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Kimi Code (`kimi`) | `.kimi-code/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/skill:openspec-*` invocations) |
| Kiro (`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| Lingma (`lingma`) | `.lingma/skills/openspec-*/SKILL.md` | `.lingma/commands/opsx/<id>.md` |
| MiniMax Code (`minimax-code`) | `~/.minimax/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use MiniMax Code skills) |
| Mistral Vibe (`vibe`) | `.vibe/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| Oh My Pi (`oh-my-pi`) | `.omp/skills/openspec-*/SKILL.md` | `.omp/commands/opsx-<id>.md` |
| OpenCode (`opencode`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| Pi (`pi`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.md` |
| [Rovo Dev CLI](https://support.atlassian.com/rovo/docs/use-rovo-dev-cli/) (`rovodev`) | `.rovodev/skills/openspec-*/SKILL.md` | Not generated. Rovo has no slash-command surface — it matches skills automatically or by prompt (e.g. "use the openspec-propose skill"); `/skills` only manages them. Generated content references skills by name, never as `/openspec-*` commands. |
| [Zoo Code](https://github.com/Zoo-Code-Org/Zoo-Code) (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| Trae (`trae`) | `.trae/skills/openspec-*/SKILL.md` | `.trae/commands/opsx-<id>.md` |
| [Zed Agent](https://zed.dev/docs/ai/skills) (`zed`) | `.agents/skills/openspec-*/SKILL.md` | Not generated (skills-only; use `/openspec-*` or `@openspec-*`) |
| ZCode (`zcode`) | `.zcode/skills/openspec-*/SKILL.md` | `.zcode/commands/opsx/<id>.md` |
| Shared `.agents` skills (`agents`) | `.agents/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |

\*\* GitHub Copilot 的 prompt 文件在 IDE 扩展（VS Code、JetBrains、Visual Studio）中被视为自定义斜杠命令。Copilot CLI 目前不会直接读取 `.github/prompts/*.prompt.md`。选择 `github-copilot` 还可以配置 GitHub 托管的 **cloud coding agent** —— 参见下文[GitHub Copilot cloud coding agent](#github-copilot-cloud-coding-agent)。

\*\*\* Hermes 默认从 `~/.hermes/skills/` 加载 skills。要使用项目本地的 OpenSpec skills，请把项目的 `.hermes/skills/` 目录加入 `~/.hermes/config.yaml` 中的 `skills.external_dirs`；之后 Hermes 就会以用户可直接调用的斜杠命令形式暴露这些 skills，例如 `/openspec-propose`。

\*\*\*\* Windsurf 已于 2026 年 6 月 2 日[更名为 Devin Desktop](https://docs.devin.ai/desktop/devin-desktop-faq)，其配置目录也随之迁移：`.devin/` 是首选的读取 + 写入位置，`.windsurf/` 则是只读的遗留回退。OpenSpec 遵循这次改名——工具 id 为 `devin`，而 `--tools windsurf` 仍然会解析到它，以便现有安装脚本继续可用。一个仍在 `.windsurf/` 中保留 OpenSpec 文件的项目，会在下一次 `openspec update` 时被提示迁移；拒绝迁移则保持原样，且你自行编写的文件永远不会被触碰。工作流以文件名调用，因此 `.devin/workflows/opsx-apply.md` 就是 `/opsx-apply`。[Devin Local agent 不支持工作流](https://docs.devin.ai/desktop/devin-local)——只支持 skills，而且它根本不会读取 `.windsurf/`——因此只要 OpenSpec 写入 Devin skills，就会保留其主体内容，以及"快速上手"提示中的 `/openspec-*` skill 调用形式，这种形式在两种 agent 上都能工作。在仅分发命令（commands-only）的模式下不会写入任何 skill，两者都会回退到 `/opsx-*`。

MiniMax Code 是一个全局、仅支持 skills 的集成。OpenSpec 只会在 `~/.minimax/skills/` 下写入它的 `openspec-*` 目录；它不会创建仓库本地的 `.minimax` 或 `.mavis` 目录。仅分发命令（commands-only）的模式会保留已有的全局 MiniMax Code skills 不被改动，这样一个项目的分发设置就不会删除另一个项目所用的 skills。

### GitHub Copilot cloud coding agent

GitHub 的 [Copilot coding agent](https://docs.github.com/en/copilot/using-github-copilot/coding-agent) 在 GitHub 的 GitHub Actions 环境中运行——与编辑器中的 Copilot 相互独立。OpenSpec 可以通过生成两个文件来让它使用 OpenSpec CLI：

- `.github/workflows/copilot-setup-steps.yml` —— 在 agent 环境中安装 `@fission-ai/openspec`
- `.github/agents/openspec.agent.md` —— 告诉 agent 如何驱动 OpenSpec

因为这会向你的仓库写入一个 GitHub Actions 工作流，所以它是**可选开启（opt-in）**的：

| How | Behavior |
|-----|----------|
| `openspec init`（交互式） | 询问是否设置云文件。默认是**否**。 |
| `openspec init --copilot-cloud` | 不经询问直接设置（用于脚本/CI）。 |
| `openspec init --no-copilot-cloud` | 不经询问直接跳过，并删除此前生成的文件。 |
| `openspec update` | 从不询问。仅在你已选择开启（或项目已有这些文件）时刷新它们。若你选择关闭，则删除 OpenSpec 管理的云文件。 |

你的选择会以 `githubCopilot.cloudAgent: true|false` 的形式保存在 `openspec/config.yaml` 中，因此非交互式更新也会遵守它。OpenSpec 只会写入或删除由它自己生成内容的文件——如果你自定义了 `copilot-setup-steps.yml` 或 `openspec.agent.md`，或已经自己写好了这些文件，它们会被原样保留（且 `init`/`update` 会告诉你这一点）。

### 何时选择共享的 `.agents` 目标

`agents` 是厂商中立（vendor-neutral）的选项：它会把 skills 写入 `.agents/skills/`——许多 agent 工具都会读取的这个共享根目录——而不是某个工具专属的目录。

| Situation | Pick |
|-----------|------|
| 你的工具在上文有独立一行 | 它自己的 ID —— 你会获得该工具的集成，包括它支持的斜杠命令 |
| 同一个仓库上有多个 agent，都读取 `.agents/skills` | `agents` —— 一棵 skill 树，而不是每个工具一棵 |
| 你的工具尚未列出，但会读取 `.agents/skills` | `agents` |

将它和某个工具专属 ID 一起选择也没问题；通常各自会写入自己的根目录。Codex 和 Zed Agent 是例外，因为它们使用同一个规范的 `.agents` 根目录。如果 Codex 与 Zed 或 `agents` 一起被选中，OpenSpec 会保留一棵由 Codex 主导的树。它的交接（handoff）同时命名了用于 Codex 的 `$openspec-*` 和用于其他 agent 的 `/openspec-*`，因此 `--tools all` 以及已有的多 agent 配置都能继续工作，而不会出现两个写入者覆盖同一文件的情况。

一旦项目拥有 `.agents/skills/` 目录，OpenSpec 也会自动提供该选项——仅有裸 `.agents/` 还不够，因为工具也会用该根目录存放规则和子 agent 定义。注意 `.agents` 不是 `.agent`：单数形式的目录属于 Antigravity。

有两点需要注意：

- **仅 skills。** 不存在命令适配器，因此不会写入 `opsx-*` 命令文件；在包含命令的分发模式下，`openspec init` 会把 `agents` 列在 `Commands skipped for: … (no adapter)` 所报告的工具中。通过 skill 名称调用工作流——大多数读取 `.agents/skills` 的助手会写成 `/openspec-propose`，这也是 OpenSpec 的安装提示所打印的形式。该目标是厂商中立的，因此如果你的助手使用其他形式，请查阅它自己的文档。
- **不会创建或编辑 `AGENTS.md`。** 目标是 `.agents/` 目录。如果你的根目录 `AGENTS.md` 仍带有旧版本遗留的 OpenSpec 标记块，`openspec update` 会将其剥离——参见[迁移指南](migration-guide.md)。

此处的 Zed 支持针对的是内置的 Zed Agent。Zed External Agents 和 Terminal Threads 使用它们各自的集成。Agent Skills 需要 [Zed v1.4.2](https://github.com/zed-industries/zed/releases/tag/v1.4.2) 或更高版本。在项目未受信任的工作树（worktree）中，项目本地的 skills 不可用，直到你[授予信任](https://zed.dev/docs/worktree-trust)。

由于 `.agents/skills/` 由 Codex、Zed Agent 以及厂商中立目标共享，了解 OpenSpec 在那里主张什么很有价值：它只会写入、刷新和删除你所选工作流对应的 `openspec-*` skill 目录，外加一个 `.openspec-target` 标记，用于记录这棵共享树是由 Codex、Zed Agent 还是厂商中立目标渲染的。该目录下的其他内容一律原样保留。请将这些 `openspec-*` 名称和标记视为 OpenSpec 的——在它们内部的修改会在下一次 `openspec update` 时被替换，这与所有其他工具一致。

对于标记（marker）之前的旧项目，OpenSpec 会根据受管理的 skill 引用来推断归属：`$openspec-*` 表示 Codex，`/openspec-*` 表示厂商中立目标。与遗留 `.codex/skills` 并存的通用规范树会被视为较旧的双目标安装，并被整合进兼容的共享树中。

`openspec update` 也会遵守这种归属关系。如果一个项目以厂商中立目标的形式拥有 `.agents`，且遗留的 Codex 安装仅能从散落的 prompt 文件中检测到，更新会保留已建立的 `agents` 树，而不会用 Codex 语法重写它，同时会保留那些遗留的 prompt 文件而不是删除。若要把共享树交给 Codex，请显式运行 `openspec init --tools codex`。

## 非交互式安装

对于 CI/CD 或脚本化安装，使用 `--tools`（以及可选的 `--profile`）：

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none

# Override profile for this init run
openspec init --profile core
```

**可用的工具 ID（`--tools`）** —— `windsurf` 也可接受，作为 `devin` 的别名：`amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `command-code`, `codeartsagent`, `codex`, `devin`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `hermes`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `lingma`, `minimax-code`, `vibe`, `oh-my-pi`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `zed`, `zcode`, `agents`

## 依赖工作流的安装

OpenSpec 会根据所选工作流安装工作流 artifacts：

- **Core profile（默认）：** `propose`, `explore`, `apply`, `update`, `sync`, `archive`
- **Custom selection：** 全部工作流 ID 的任意子集：`propose`, `explore`, `new`, `continue`, `apply`, `update`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

换言之，skill/命令的数量取决于 profile 和分发（delivery）方式，并非固定不变。

## 生成的 Skill 名称

当通过 profile/工作流配置被选中时，OpenSpec 会生成以下 skills：

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-update-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

命令行为见[命令](commands.md)，`init`/`update` 选项见 [CLI](cli.md)。

## 相关文档

- [CLI 参考](cli.md) —— 终端命令
- [命令](commands.md) —— 斜杠命令与 skills
- [快速上手](getting-started.md) —— 首次安装
