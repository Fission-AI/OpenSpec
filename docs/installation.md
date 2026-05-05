# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Package Managers

### npm

```bash
npm install -g @fkmatsuda/br-openspec@latest
```

### pnpm

```bash
pnpm add -g @fkmatsuda/br-openspec@latest
```

### yarn

```bash
yarn global add @fkmatsuda/br-openspec@latest
```

### bun

```bash
bun add -g @fkmatsuda/br-openspec@latest
```

## Nix

Run BR-OpenSpec directly without installation:

```bash
nix run github:fkmatsuda/BR-OpenSpec -- init
```

Or install to your profile:

```bash
nix profile install github:fkmatsuda/BR-OpenSpec
```

Or add to your development environment in `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:fkmatsuda/BR-OpenSpec";
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

After installing, initialize BR-OpenSpec in your project:

```bash
cd your-project
openspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
