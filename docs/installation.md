# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Package Managers

### bun (recommended)

```bash
bun add -g @fission-ai/openspec@latest
```

> **Why bun?** Bun blocks untrusted postinstall scripts by default, giving you visibility into what runs during installation. For example, OpenSpec includes a postinstall script that auto-installs shell completions — npm runs it silently, while bun surfaces it so you can review and opt in via `bun pm trust`. For packages you install globally, this default-deny behavior is a meaningful supply chain security improvement.

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

## Next Steps

After installing, initialize OpenSpec in your project:

```bash
cd your-project
openspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
