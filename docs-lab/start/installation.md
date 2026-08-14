# Installation

> Install the `openspec` CLI on your machine, update it, and uninstall it.


## Prerequisites

OpenSpec is a Node.js CLI. You need version 20.19.0 or newer.

In your terminal:

```bash
node --version
```

If that prints `v20.19.0` or higher, you're set. If not, install a newer Node from [nodejs.org](https://nodejs.org) or through your version manager (nvm, fnm, asdf, volta).

The workflow itself runs inside an AI coding tool: Claude Code, Cursor, or any other tool on the [supported list](../reference/supported-tools.md).

## Install with your AI assistant

Paste this into your AI chat:

```text
Fetch https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/install.md and follow it.
```

Or, in your terminal, pipe it into a CLI agent (Claude Code shown):

```bash
curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/install.md | claude
```

That fetches [install.md at the repo root](https://github.com/Fission-AI/OpenSpec/blob/main/install.md), a prompt written for any agent that can run shell commands (a few IDE integrations can't). Expect your assistant to:

1. Check your Node version, and stop if it's older than 20.19.0.
2. Skip the install if the CLI is already on your machine; otherwise show you the install command and wait for your confirmation before running it.
3. Verify `openspec` is on your PATH.
4. Name the folder it thinks you mean, suggest the AI tool you're already talking to, and ask which others you use, then run `openspec init` there (the [project setup](setup.md) step).
5. Report what init created and the exact spelling to invoke OpenSpec in your tool.

It stops before anything privileged and never edits your shell startup files. The [manual methods below](#install-methods) are the source of truth; the prompt runs them for you.

This install method is new and can have varying results depending on model used. Only use if you're comfortable correcting AI mistakes - otherwise we reccomend following the standard method below.

## Install methods

Install the CLI globally; [setting up your project](setup.md) comes after.

In your terminal:

```npm
npm install -g @fission-ai/openspec@latest
```

### Yarn

`yarn global add` is Yarn Classic (1.x) only. Modern Yarn removed global installs, so use npm, pnpm, or bun instead: a global CLI doesn't have to share your project's package manager.

### Bun

Bun installs OpenSpec but doesn't run it: you still need Node on your machine (the [prerequisite](#prerequisites) above). Without it, every command fails with `env: node: No such file or directory`. Bun treats [every Node CLI](https://bun.com/docs/pm/bunx#shebangs) this way.

### Deno

Deno installs the CLI from npm and needs explicit permission flags. In your terminal:

```bash
deno install --global \
  --allow-read --allow-write --allow-env --allow-sys=cpus,homedir --allow-net=edge.openspec.dev \
  npm:@fission-ai/openspec@latest
```

Some commands launch another program: [`openspec config edit`](../reference/cli.md) opens your editor. Deno interrupts those with a permission prompt on every run. To stop it asking, add a scoped `--allow-run=<program>` to the install command.

> [!NOTE]
> If Deno can't resolve `@latest`, pin a version range instead: `npm:@fission-ai/openspec@^1.7.0`.

### Nix

The OpenSpec repo ships a Nix flake. Install it into your profile; in your terminal:

```bash
nix profile install github:Fission-AI/OpenSpec
```

Or run a one-off command first, without installing:

```bash
nix run github:Fission-AI/OpenSpec -- --version
```

That leaves nothing on your PATH, so there's no install to check afterward.

To put OpenSpec in a project dev shell instead, add the flake as an input and use its default package; [flake.nix](https://github.com/Fission-AI/OpenSpec/blob/main/flake.nix) lists the outputs.

### Check it worked

Whichever method you used, in your terminal:

```bash
openspec --version
```

If that prints a version number, the CLI is on your PATH. It installs once per machine.

Next, [set up your project](setup.md); if your assistant already ran init, that page shows what it wrote and how to adjust it.

## Updating

In your terminal, in each project where you ran init:

```bash
openspec update
```

When a newer CLI is out, [`openspec update`](../reference/cli.md#openspec-update) says so and can install it for you; that upgrade is once per machine. Every run refreshes the project's generated skills and commands, which never update on their own. A current project prints `✓ All 2 tool(s) up to date (v1.7.0)`.


> [!WARNING]
> On Deno, re-run the [Deno install](#deno) with `-f`; it won't overwrite the installed command without it. On Nix, use `nix profile upgrade openspec`.

> [!NOTE]
> A global npm install belongs to one Node installation. Switch Node versions with nvm and the `openspec` command doesn't come along; install it again under the new version.

## Uninstalling

To uninstall OpenSpec, run through the steps below; none of them touch your source code. You can also point your agent at this section and let it handle the removal.

**1. Remove [shell completions](../reference/cli.md#openspec-completion)**, if you set them up, while the CLI can still do it. In your terminal:

```bash
openspec completion uninstall
```

**2. Remove the package.** In your terminal:

```npm
npm uninstall -g @fission-ai/openspec
```

On Deno: `deno uninstall --global openspec`. On Nix: `nix profile remove openspec`. Your shell should no longer find `openspec`.

**3. Delete what's left, or keep it.**

- Generated agent files: `openspec-*` skills and `opsx` commands under directories like `.claude/` or `.agents/`, per project. [Supported tools](../reference/supported-tools.md) lists each tool's paths; MiniMax Code keeps skills in `~/.minimax/skills`.
- Leftovers from older versions: marker blocks in `CLAUDE.md` or `AGENTS.md` (delete the block, keep the file) and `opsx-*.md` prompts in `~/.codex/prompts`.
- The `openspec/` folder: pause first. `specs/` and `changes/archive/` are your record of the system, plain Markdown that reads fine without OpenSpec.
- Per-machine state: settings and the telemetry id in `~/.config/openspec/`; schema overrides and store registrations in `~/.local/share/openspec/` (Windows: `%APPDATA%\openspec`, `%LOCALAPPDATA%\openspec`). Registrations are pointers; the store repos they point to are untouched.
