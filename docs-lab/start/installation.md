# Installation

> Install the `openspec` CLI on your machine, update it, and uninstall it.


## Install

On macOS or Linux:

```bash
curl -fsSL https://openspec.dev/cli/install.sh | sh
```

On Windows, in PowerShell:

```powershell
irm https://openspec.dev/cli/install.ps1 | iex
```

Then [check it worked](#check-it-worked). Need a specific version or folder? See [install options](#install-options).

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

1. Skip the install if the CLI is already on your machine, and offer to update it the way it was installed. If that was npm or Homebrew, mention once that `openspec install` switches to the standalone install, without pushing it. Otherwise, show you the install command above and wait for your confirmation before running it.
2. Use npm instead only if you ask for it or the installer fails, and stop if your Node is older than 20.19.0.
3. Verify `openspec` is on your PATH.
4. Name the folder it thinks you mean, suggest the AI tool you're already talking to, and ask which others you use, then run `openspec init` there (the [project setup](setup.md) step).
5. Report what init created and the exact spelling to invoke OpenSpec in your tool.

It stops before anything privileged and never edits your shell startup files. The [install command above](#install) and the [package managers below](#package-managers) are the source of truth, and the prompt runs them for you.

This install method is new and can have varying results depending on model used. Only use if you're comfortable correcting AI mistakes. Otherwise we recommend following the standard method below.

## Package managers

These install OpenSpec as a Node.js package, so they need Node.js 20.19.0 or newer (Homebrew and Nix bring their own). In your terminal:

```bash
node --version
```

If that prints `v20.19.0` or higher, install with npm:

```npm
npm install -g @fission-ai/openspec@latest
```

If not, install a newer Node from [nodejs.org](https://nodejs.org) or through your version manager (nvm, fnm, asdf, volta), or use the [standalone install](#install) instead.

### Homebrew

Homebrew installs OpenSpec and its Node.js dependency on macOS or Linux. In your terminal:

```bash
brew install openspec
```

The formula is published in [homebrew-core](https://formulae.brew.sh/formula/openspec), so you don't need to add a tap.

### Yarn

`yarn global add` is Yarn Classic (1.x) only. Modern Yarn removed global installs, so use npm, pnpm, or bun instead. A global CLI doesn't have to share your project's package manager.

### Bun

Bun installs OpenSpec but doesn't run it, so you still need Node on your machine (see [Package managers](#package-managers)). Without it, every command fails with `env: node: No such file or directory`. Bun treats [every Node CLI](https://bun.com/docs/pm/bunx#shebangs) this way.

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

The OpenSpec repo ships a Nix flake. Install it into your profile. In your terminal:

```bash
nix profile install github:Fission-AI/OpenSpec
```

Or run a one-off command first, without installing:

```bash
nix run github:Fission-AI/OpenSpec -- --version
```

That leaves nothing on your PATH, so there's no install to check afterward.

To put OpenSpec in a project dev shell instead, add the flake as an input and use its default package; [flake.nix](https://github.com/Fission-AI/OpenSpec/blob/main/flake.nix) lists the outputs.

The Nix package ships the Bash, Fish, and Zsh completion scripts at the standard
locations (`share/bash-completion/completions`, `share/fish/vendor_completions.d`,
`share/zsh/site-functions`), so they load with the package and there is no need to run
`openspec completion install`.

## Check it worked

Whichever method you used, in your terminal:

```bash
openspec --version
```

If that prints a version number, the CLI is on your PATH. It installs once per machine.

Next, [set up your project](setup.md). If your assistant already ran init, that page shows what it wrote and how to adjust it.

## Install options

- **Folder**: set `OPENSPEC_INSTALL_DIR`. The default is `~/.local/bin` (Windows: `%LOCALAPPDATA%\Programs\openspec`).
- **Version**: set `OPENSPEC_VERSION`, for example `OPENSPEC_VERSION=v1.15.0`.
- **Alpine Linux**: run `apk add libstdc++ libgcc` first.

To download by hand, get the archive for your machine from the [latest release](https://github.com/Fission-AI/OpenSpec/releases/latest), unpack it, and put `openspec` on your PATH. On macOS, also run `xattr -d com.apple.quarantine openspec`.

| Platform | File |
|---|---|
| macOS (Apple silicon / Intel) | `openspec-darwin-arm64.tar.gz` / `openspec-darwin-x64.tar.gz` |
| Linux (arm64 / x64) | `openspec-linux-arm64.tar.gz` / `openspec-linux-x64.tar.gz` |
| Alpine (arm64 / x64) | `openspec-linux-arm64-musl.tar.gz` / `openspec-linux-x64-musl.tar.gz` |
| Windows (arm64 / x64) | `openspec-windows-arm64.zip` / `openspec-windows-x64.zip` |

To check a download came from our release workflow, use the [GitHub CLI](https://cli.github.com):

```bash
gh attestation verify openspec-darwin-arm64.tar.gz --repo Fission-AI/OpenSpec
```

## Switch from npm to the standalone install

Switching is optional; npm keeps working. Your settings and your projects carry over; only the program changes.

**1. Install the standalone copy.** In your terminal:

```bash
openspec install
```

It installs the standalone `openspec` and prints the command that removes your npm or Homebrew copy.

**2. Remove the old copy.** It usually comes first on your PATH, so until it's gone it keeps running instead. Run the command step 1 printed, for example:

```npm
npm uninstall -g @fission-ai/openspec
```

**3. Check which copy runs.** Open a new terminal:

```bash
openspec version
```

It should print `OpenSpec <version> (standalone)`. If it names a package manager instead, another copy is still on your PATH: `which -a openspec` (Windows: `where.exe openspec`) lists every copy, so remove the others.

No project needs re-initializing. To switch back, delete the file and run the npm install again.

## Updating

In your terminal, in each project where you ran init:

```bash
openspec update
```

When a newer CLI is out, [`openspec update`](../reference/cli.md#openspec-update) says so and can install it for you; that upgrade is once per machine. Every run refreshes the project's generated skills and commands, which never update on their own. A current project prints `✓ All 2 tool(s) up to date (v1.7.0)`.


> [!WARNING]
> With the standalone install, run `openspec install` to replace your copy in place; `openspec update` tells you when a newer one is out. On Homebrew, run `brew upgrade openspec`. On Deno, re-run the [Deno install](#deno) with `-f`; it won't overwrite the installed command without it. On Nix, use `nix profile upgrade openspec`.

> [!NOTE]
> A global npm install belongs to one Node installation. Switch Node versions with nvm and the `openspec` command doesn't come along, so install it again under the new version.

## Uninstalling

To uninstall OpenSpec, run through the steps below; none of them touch your source code. You can also point your agent at this section and let it handle the removal.

**1. Remove [shell completions](../reference/cli.md#openspec-completion)**, if you set them up, while the CLI can still do it. In your terminal:

```bash
openspec completion uninstall
```

**2. Remove the CLI.** For the standalone install, delete `~/.local/bin/openspec` (Windows: `%LOCALAPPDATA%\Programs\openspec`, and that folder from your user PATH). For npm, in your terminal:

```npm
npm uninstall -g @fission-ai/openspec
```

On Homebrew: `brew uninstall openspec`. On Deno: `deno uninstall --global openspec`. On Nix: `nix profile remove openspec`. Your shell should no longer find `openspec`.

**3. Delete what's left, or keep it.**

- Generated agent files: `openspec-*` skills and `opsx` commands under directories like `.claude/` or `.agents/`, per project. [Supported tools](../reference/supported-tools.md) lists each tool's paths; MiniMax Code keeps skills in `~/.minimax/skills`.
- Leftovers from older versions: marker blocks in `CLAUDE.md` or `AGENTS.md` (delete the block, keep the file) and `opsx-*.md` prompts in `~/.codex/prompts`.
- The `openspec/` folder: pause first. `specs/` and `changes/archive/` are your record of the system, plain Markdown that reads fine without OpenSpec.
- Per-machine state: settings and the telemetry id in `~/.config/openspec/`; schema overrides, store registrations, and the standalone install's built-in schemas (`binary-schemas/`) in `~/.local/share/openspec/` (Windows: `%APPDATA%\openspec`, `%LOCALAPPDATA%\openspec`). Registrations are pointers; the store repos they point to are untouched.
