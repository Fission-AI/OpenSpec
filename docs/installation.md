# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

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

## Troubleshooting PATH Visibility

If `openspec --version` works in one terminal but fails in an editor, AI agent,
GUI app, or automation, OpenSpec is usually installed correctly but that process
started with a different `PATH`.

Global package managers create an executable shim in a bin directory, then your
shell or launcher must put that directory on `PATH`. Common ways to inspect the
directory are:

```bash
# npm
printf '%s/bin\n' "$(npm prefix -g)"

# pnpm
pnpm bin -g

# bun
bun pm bin -g

# current shell
command -v openspec
```

Make sure the environment that launches your editor, agent, GUI app, or
automation includes the package-manager bin directory. For shell startup files,
keep this to a minimal `PATH` export in a file that the target environment
actually reads. Do not move interactive setup such as prompts, themes,
completions, or commands that can block into always-loaded startup files.

To bypass global bin discovery while debugging, run OpenSpec through a package
manager:

```bash
npx -y @fission-ai/openspec@latest --version
pnpm dlx @fission-ai/openspec@latest --version
```

## Next Steps

After installing, initialize OpenSpec in your project:

```bash
cd your-project
openspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
