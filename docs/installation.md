# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Install with your AI assistant

Rather not do this by hand? Paste the prompt below into any coding assistant that can run shell commands — Claude Code, Codex, Cursor, Gemini CLI, Copilot, and the rest of the [supported tools](supported-tools.md). It installs the CLI, initializes this project, and reports back what actually happened.

The manual steps below are the source of truth — the prompt just runs them for you. If your assistant stops and hands something back, that's by design: it asks before anything privileged and never edits your shell startup files. Finish those bits yourself with [Package Managers](#package-managers) and [Troubleshooting](troubleshooting.md).

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
   do with how this repo's own dependencies are installed.
   Stop and ask me first if the install needs sudo or admin rights, fails with a
   permissions error, or reports that its global bin directory is missing or
   unconfigured. Never edit my shell startup files (.bashrc, .zshrc, .profile,
   fish, PowerShell profile), and never run a setup command that edits them for
   me — show me the change and let me make it.

3. PATH. Run `openspec --version`. If the command isn't found, it may just be
   missing from this shell: tell me where the package manager installed it and
   how to add that directory to PATH for my shell and OS, then stop until I
   confirm. If I use a version manager, say so rather than editing PATH around
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
   you find and wait for my go-ahead. An existing `openspec/` folder is not a
   problem — init refreshes it and leaves my specs and changes alone.
   Confirm I'm in the right folder too: init creates `openspec/` wherever it
   runs, including inside a monorepo package.
   Then run: openspec init --tools <ids>

5. REPORT. Don't assume what should exist — tell me what init actually printed:
   how many skills and/or commands it created and where, the config file line,
   any "Setup required" note, and what to restart or reload. Some tools are
   skills-only and correctly create zero command files, so missing commands is
   not a failure on its own. If init said nothing was generated, relay the fix
   it suggested instead of retrying. Finish by telling me how to invoke OpenSpec
   in my tool — slash commands like /opsx:propose for most tools, a skill
   invocation for skills-only ones.
```

Nothing in the prompt is vendor-specific: it's plain instructions plus the same commands documented on this page. It works on macOS, Linux, and Windows, and it deliberately stops rather than improvising when a step needs your permission. Your assistant does need to be able to run shell commands — a few IDE integrations can't.

## Package Managers

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

Yarn 2 and later (Berry) removed the `global` command. On those versions, install OpenSpec with npm, pnpm, or bun instead — a global CLI doesn't need to share your project's package manager.

### bun

Bun can install OpenSpec globally, but OpenSpec currently runs on Node.js.
You still need Node.js 20.19.0 or higher available on `PATH`.

```bash
bun add -g @fission-ai/openspec@latest
```

## Nix

Run OpenSpec directly without installation:

```bash
nix run github:Fission-AI/OpenSpec -- init
```

Or install to your profile:

```bash
nix profile install github:Fission-AI/OpenSpec
```

Or add to your development environment in `flake.nix`:

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

## Verify Installation

```bash
openspec --version
```

## Updating

Upgrade the package, then refresh each project's generated files:

```bash
npm install -g @fission-ai/openspec@latest   # or pnpm/yarn/bun equivalent
openspec update                              # run inside each project
```

`openspec update` regenerates the skill and command files for the tools you've configured, so your slash commands stay current with the installed version.

## Uninstalling

There's no `openspec uninstall` command, because OpenSpec is just a global package plus some files in your project. Removing it is a few manual steps, and nothing here touches your source code.

**1. Remove the global package:**

```bash
npm uninstall -g @fission-ai/openspec   # or: pnpm rm -g / yarn global remove / bun rm -g
```

**2. Remove OpenSpec from a project (optional).** Delete the `openspec/` directory if you no longer want its specs and changes:

```bash
rm -rf openspec/
```

Think before you do this: `openspec/specs/` and `openspec/changes/archive/` are your record of how the system behaves and why it changed. If you might want that history, keep the folder (or keep it in git) even after uninstalling.

**3. Remove generated AI tool files (optional).** OpenSpec writes skill and command files into per-tool directories like `.claude/skills/openspec-*/`, `.cursor/commands/opsx-*`, and so on. Delete the `openspec-*` skills and `opsx-*` commands for whichever tools you configured. The exact paths per tool are listed in [Supported Tools](supported-tools.md).

If you also have OpenSpec marker blocks in files like `CLAUDE.md` or `AGENTS.md`, remove those blocks by hand; your own content in those files is yours to keep.

## Next Steps

After installing, initialize OpenSpec in your project:

```bash
cd your-project
openspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
