# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Install with your AI assistant

Rather not do this by hand? Paste the prompt below into any coding assistant that can run shell commands — Claude Code, Codex, Cursor, Gemini CLI, Copilot, and the rest of the [supported tools](supported-tools.md). It detects your runtime and package manager, installs the CLI, initializes this project, and verifies the result.

The manual steps below are the source of truth — the prompt just runs them for you. If your assistant gets stuck, do it yourself with [Package Managers](#package-managers).

```text
Install OpenSpec in this project and set it up for me.

1. Check that Node.js 20.19.0 or higher is on PATH (`node --version`). If it is
   missing or too old, tell me and stop — do not install or switch Node versions
   for me.

2. Detect which package manager this project uses, then install the CLI globally
   with it:
     npm    → npm install -g @fission-ai/openspec@latest
     pnpm   → pnpm add -g @fission-ai/openspec@latest
     yarn   → yarn global add @fission-ai/openspec@latest
     bun    → bun add -g @fission-ai/openspec@latest
   Ask me first before running anything with sudo or anything that changes
   system-wide configuration. Never edit my shell startup files (.bashrc,
   .zshrc, .profile, fish config) — if the global bin directory is not on PATH,
   print the line I should add and let me add it.

3. Ask me which AI coding tool I use, then set up this directory
   non-interactively: `openspec init --tools <tool-id>`. Run `openspec init
   --help` for the list of tool ids. Tell me before overwriting any existing
   file.

4. Verify, then report back what you found:
   - `openspec --version` prints a version
   - an `openspec/` directory exists and contains `config.yaml`
   - the generated skill and command files for my tool exist — init prints how
     many and where; list the actual files
   Finish by telling me what to restart or reload before the slash commands work.
```

Nothing in the prompt is specific to one vendor: it is plain instructions plus the same commands documented on this page.

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
