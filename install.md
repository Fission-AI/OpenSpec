# openspec

> OpenSpec 让你和你的编码 agent 在写代码前拥有一份共享、可审阅的方案。本文件用于安装其 CLI 并初始化你的项目。

我希望你安装 OpenSpec 并初始化我的项目。请按顺序执行以下步骤，并在某一步指示你停下时停下。

目标：全局安装 OpenSpec CLI 并初始化用户项目。

完成条件：

- `openspec --version` 输出版本号
- 用户确认的项目已有由 `openspec init` 创建或刷新的 `openspec/` 文件夹
- 已告知用户在其 AI 编码工具中调用 OpenSpec 的确切拼写

待办：

- [ ] 检查 Node.js 运行时
- [ ] 在用户确认后全局安装 CLI
- [ ] 确认 `openspec` 已在 PATH 中
- [ ] 确认要初始化的文件夹，然后在该处运行 `openspec init --tools <ids>`
- [ ] 报告 init 实际创建了什么以及如何调用它

## 1. 运行时

运行 `node --version`。OpenSpec 需要 Node.js 20.19.0 或更高版本。如果缺少 Node 或版本过旧，请说明并停下，但要给用户下一步的操作指引：引导他们访问 https://nodejs.org，或者如果他们使用 nvm 之类的版本管理器，说出可切换到更新版本的命令。不要自行安装 Node、切换版本或重新配置用户的版本管理器。

## 2. 安装

先运行 `openspec --version`。如果已输出版本号，说明 CLI 已安装：请说明，并提议用下面的安装命令更新；若用户拒绝，则跳到第 4 步。

使用 PATH 中已有的任意包管理器，优先选择 npm：

```bash
npm install -g @fission-ai/openspec@latest
pnpm add -g @fission-ai/openspec@latest
bun add --global @fission-ai/openspec@latest
yarn global add @fission-ai/openspec@latest   # Yarn 1.x only
```

不要依据本项目的 lockfile 来选择：全局安装与本仓库自身依赖的安装方式无关。如果四种方式都不可用，请停止并说明；不要自行发挥去安装。（在 Nix 上，请引导用户查看 https://openspec.dev/docs/installation 的 Nix 章节。）

运行前请展示确切命令并获得确认；这会在项目之外安装软件，用户可能希望由其他包管理器来负责。

如果安装需要 sudo 或管理员权限、因权限错误而失败，或报告其全局 bin 目录缺失或未配置，请停下并再次询问。绝不要编辑 shell 启动文件（.bashrc、.zshrc、.profile、fish、PowerShell profile），也绝不要运行会修改它们的安装命令；展示改动并让用户自行处理。

## 3. PATH

运行 `openspec --version`。如果找不到该命令，可能只是当前 shell 中缺失：说明包管理器将其安装到了何处，以及如何将该目录加入用户所用 shell 与操作系统的 PATH，然后停下等待确认。如果它打印的版本比刚安装报告的版本更旧，说明 PATH 上有一个更早的副本在遮蔽它；请报告两个版本，而不是继续。如果用户使用了版本管理器，请说明这一点，而不是绕过它去编辑 PATH：使用 nvm 或 fnm 时，CLI 与安装时激活的 Node 版本绑定；使用 asdf 或 volta 时，可能需要重新生成 shim。

## 4. 初始化

先判断 `openspec/` 应放在何处，并直接给出你的最佳猜测，而不是抛出开放式问题：用户所在项目的根目录几乎总是正确的。说出你选定的文件夹并允许用户纠正，例如"你在 ~/code/acme-api，所以我会把 OpenSpec 设在那里"。优先使用版本控制根目录而非当前目录；在 monorepo 中，请说明你选择了哪个包以及原因。若要指向当前目录以外的文件夹，请传入它：`openspec init <path> --tools <ids>`。

init 会在你指定的任何位置创建 `openspec/`，且当它位置不对时不会警告你。如果该文件夹是主目录、临时目录，或根本不含任何项目，请停下并询问项目所在位置。

然后判断用户使用哪些 AI 编码工具，同样先给出推断而非开放式问题：你很可能正运行在它们其中之一中，所以说出它并询问用户还使用哪些，建议几个常见选项（Claude Code、Cursor、Copilot、Codex）。说明答案会带来什么变化：每个被点名的工具都会在项目中获得自己的 skill 与命令文件，稍后重新运行 init 还会追加更多，所以现在列一个简短清单毫无成本。将每个工具映射到 `openspec init --help` 中的 id（Copilot 为 `github-copilot`，Zoo Code 为 `roocode`）。`--tools` 接受逗号分隔的列表，所以请列出所有工具。

`openspec init --tools <ids>` 会自动（无需询问）删除旧版 OpenSpec 的残留文件，包括主目录中的 `opsx-*.md` 提示词文件（Codex 将它们保存在 `~/.codex/prompts`）。运行前，请查找这些残留：`.../commands/openspec/` 文件夹、CLAUDE.md 或 AGENTS.md 等文件中的 OpenSpec 标记块，以及主目录下的 `opsx-*.md` 提示词文件。列出你发现的任何内容，明确说明 init 将删除这些内容，并等待用户许可；如果什么都没找到，请说明并继续，无需询问。已存在的 `openspec/` 文件夹不是问题：init 会刷新它，并保留 specs 与 changes 不动。

然后运行：`openspec init --tools <ids>`，若不是当前文件夹则附上路径。

## 5. 报告

不要假设应当存在什么；如实转述 init 实际打印的内容：它创建了多少 skill 和/或命令、位于何处、配置文件的行、任何"Setup required"提示，以及需要重启或重新加载的内容。有些工具仅支持 skill，会正确地创建零个命令文件，因此缺少命令本身并不算失败。如果 init 表示未生成任何内容，请转述它建议的修复方法，而不是重试。

最后，告诉用户如何在他们的工具中调用 OpenSpec，拼写以 init 创建的文件为准，而非其总结行：不同工具的标点不同（有的用 `/opsx:propose`，有的用 `/opsx-propose`，Amazon Q 用 `@opsx-propose`），而获得 skill 而非命令的工具通过 skill 名称调用（`/openspec-propose`，或 Codex 中的 `$openspec-propose`，或 Kimi Code 中的 `/skill:openspec-propose`）。

立即执行：完成上面的待办清单，达成目标：安装 OpenSpec CLI、初始化本项目，并告知用户在其 AI 编码工具中调用 OpenSpec 的确切方式。

更多上下文（供 agent 参考）：https://openspec.dev/llms.txt
