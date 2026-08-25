# 安装 (Installation)

## 前置条件

- **Node.js 20.19.0 或更高版本** —— 检查你的版本：`node --version`

## 用你的 AI 助手来安装

不想手动操作？把下面的提示词粘贴进任何能运行 shell 命令的编码助手——Claude Code、Codex、Cursor、Gemini CLI、Copilot，以及其余的[支持工具](supported-tools.md)。它会安装 CLI、初始化这个项目，并回报实际发生的情况。

下面的手动步骤才是事实来源——提示词只是替你运行它们。如果你的助手中途停下并把事情交还给你，那是设计使然：它在做任何需要特权操作之前都会先询问，且永远不会编辑你的 shell 启动文件。这些收尾工作请用[包管理器](#package-managers) 和[排障](troubleshooting.md) 自己完成。

```text
Install OpenSpec in this project and set it up for me. Follow these steps in
order, and stop where a step tells you to stop.

1. RUNTIME. Run `node --version`. OpenSpec needs Node.js 20.19.0 or higher. If
   Node is missing or older, say so and stop — don't install Node, switch
   versions, or reconfigure my version manager for me.

2. INSTALL. Use whichever package manager is already on my PATH, preferring npm:
     npm install -g @fission-ai/openspec@latest
     pnpm add -g @fission-ai/openspec@latest
     bun add -g @fission-ai/openspec@latest
     yarn global add @fission-ai/openspec@latest   (Yarn 1.x only)
   Don't pick based on this project's lockfile — a global install has nothing to
   do with how this repo's own dependencies are installed. If none of those four
   is available, stop and tell me — don't improvise an install. (If I'm on Nix,
   point me at the Nix section of the OpenSpec installation docs instead.)
   Show me the exact command and let me confirm before you run it; this installs
   software outside the project, and I may want a different package manager to
   own it.
   Stop and ask me again if the install needs sudo or admin rights, fails with a
   permissions error, or reports that its global bin directory is missing or
   unconfigured. Never edit my shell startup files (.bashrc, .zshrc, .profile,
   fish, PowerShell profile), and never run a setup command that edits them for
   me — show me the change and let me make it.

3. PATH. Run `openspec --version`. If the command isn't found, it may just be
   missing from this shell: tell me where the package manager installed it and
   how to add that directory to PATH for my shell and OS, then stop until I
   confirm. If it prints an older version than the install just reported, an
   earlier copy is shadowing it on PATH — tell me both versions instead of
   continuing. If I use a version manager, say so rather than editing PATH around
   it: with nvm or fnm the CLI is tied to the Node version that was active when
   you installed it, and with asdf or volta a shim may need regenerating.

4. INITIALIZE. Ask me which AI coding tool or tools I use and map each to an id
   from `openspec init --help` (Copilot is `github-copilot`, Zoo Code is
   `roocode`). `--tools` takes a comma-separated list, so name all of them.
   `openspec init --tools <ids>` deletes leftovers from older OpenSpec versions
   automatically, without asking — including `opsx-*.md` prompt files in my home
   directory (Codex keeps them in ~/.codex/prompts). Before you run it, look for
   those: `.../commands/openspec/` folders, OpenSpec marker blocks in files like
   CLAUDE.md or AGENTS.md, and home-directory `opsx-*.md` prompts. List whatever
   you find and wait for my go-ahead; if you find nothing, say so and carry on
   without asking. An existing `openspec/` folder is not a problem — init
   refreshes it and leaves my specs and changes alone.
   Confirm I'm in the right folder too: init creates `openspec/` wherever it
   runs, including inside a monorepo package.
   Then run: openspec init --tools <ids>

5. REPORT. Don't assume what should exist — tell me what init actually printed:
   how many skills and/or commands it created and where, the config file line,
   any "Setup required" note, and what to restart or reload. Some tools are
   skills-only and correctly create zero command files, so missing commands is
   not a failure on its own. If init said nothing was generated, relay the fix
   it suggested instead of retrying. Finish by telling me how to invoke OpenSpec
   in my tool, and take the exact spelling from the files init created rather
   than from its summary line: the punctuation differs per tool (/opsx:propose
   in some, /opsx-propose in others, @opsx-propose in Amazon Q), and tools that
   get skills instead of commands are invoked by skill name (/openspec-propose,
   or $openspec-propose in Codex, or /skill:openspec-propose in Kimi Code).
```

提示词里没有任何厂商专属内容：它只是普通说明加上本页记载的同样命令。它适用于 macOS、Linux 和 Windows，并且在某一步需要你授权时会刻意停下，而不是自行发挥。你的助手确实需要能运行 shell 命令——少数 IDE 集成做不到这点。

## 包管理器

### npm

```bash
npm install -g @fission-ai/openspec@latest
```

### pnpm

```bash
pnpm add -g @fission-ai/openspec@latest
```

### yarn

```bash
yarn global add @fission-ai/openspec@latest
```

Yarn 2 及之后版本（Berry）移除了 `global` 命令。在这些版本上，请改用 npm、pnpm 或 bun 安装 OpenSpec——一个全局 CLI 没必要和你的项目共用同一个包管理器。

### deno

Deno 有时在解析 @latest 标签时会出问题，但我们可以在首次安装时指定一个版本。如果发生了这种情况，你可以试着把 @latest 标签换成具体版本，例如 `@^1.3.1`

```bash
deno install --global \
  --allow-read --allow-write --allow-env --allow-sys=cpus,homedir --allow-net=edge.openspec.dev \
  npm:@fission-ai/openspec@latest
# or
deno install --global \
  --allow-read --allow-write --allow-env --allow-sys=cpus,homedir --allow-net=edge.openspec.dev \
  npm:@fission-ai/openspec@^1.3.1
```

注意：如果你的子命令会启动外部工具，比如 config edit、feedback 或 workspace open，你可能需要一个作用域受限的 --allow-run=<program>。

### bun

Bun 可以把 OpenSpec 全局安装，但 OpenSpec 目前运行在 Node.js 上。你仍然需要在 `PATH` 上提供 Node.js 20.19.0 或更高版本。

```bash
bun add -g @fission-ai/openspec@latest
```

## Nix

免安装直接运行 OpenSpec：

```bash
nix run github:Fission-AI/OpenSpec -- init
```

或安装到你的 profile：

```bash
nix profile install github:Fission-AI/OpenSpec
```

或在 `flake.nix` 中加入你的开发环境：

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:Fission-AI/OpenSpec";
  };

  outputs = { nixpkgs, openspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ openspec.packages.x86_64-linux.default ];
    };
  };
}
```

## 验证安装

```bash
openspec --version
```

## 更新

先升级包，再刷新每个项目里生成的文件：

```bash
npm install -g @fission-ai/openspec@latest   # or pnpm/yarn/bun equivalent
openspec update                              # run inside each project
```

`openspec update` 会为你配置的工具重新生成 skill 和命令文件，这样你的斜杠命令就能与已安装版本保持同步。它还会检查是否发布了更新的 CLI 并提示你升级，因为升级才是让新工作流得以可用的前提——参见 [CLI 参考](cli.md#openspec-update)。

## 卸载

没有 `openspec uninstall` 命令，因为 OpenSpec 只是一个全局包加上你项目里的一些文件。移除它需要几个手动步骤，而且这里没有任何操作会动到你的源代码。

**1. 移除全局包：**

```bash
npm uninstall -g @fission-ai/openspec   # or: pnpm rm -g / yarn global remove / bun rm -g
```

**2. 从项目中移除 OpenSpec（可选）。** 如果你不再需要它的 specs 和 changes，删除 `openspec/` 目录：

```bash
rm -rf openspec/
```

动手前请三思：`openspec/specs/` 和 `openspec/changes/archive/` 是你关于"系统如何行为、为何改变"的记录。如果你之后可能还想保留那段历史，即便卸载也要保留该文件夹（或保留在 git 中）。

**3. 移除生成的 AI 工具文件（可选）。** OpenSpec 会把 skill 和命令文件写入到各工具的目录中，例如 `.claude/skills/openspec-*/`、`.cursor/commands/opsx-*` 等。删除你配置过的那些工具对应的 `openspec-*` skills 和 `opsx-*` 命令。各工具的确切路径列在[支持工具](supported-tools.md) 中。

如果你在 `CLAUDE.md` 或 `AGENTS.md` 这类文件中也有 OpenSpec 标记块，请手动移除那些块；这些文件里你自己的内容由你保留。

## 后续步骤

安装完成后，在你的项目中初始化 OpenSpec：

```bash
cd your-project
openspec init
```

完整的演练见[快速上手](getting-started.md)。
