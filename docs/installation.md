# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Package Managers

### npm

```bash
npm install -g @fission-ai/pastelsdd@latest
```

### pnpm

```bash
pnpm add -g @fission-ai/pastelsdd@latest
```

### yarn

```bash
yarn global add @fission-ai/pastelsdd@latest
```

### bun

Bun can install Pastelsdd globally, but Pastelsdd currently runs on Node.js.
You still need Node.js 20.19.0 or higher available on `PATH`.

```bash
bun add -g @fission-ai/pastelsdd@latest
```

## Nix

Run Pastelsdd directly without installation:

```bash
nix run github:Fission-AI/Pastelsdd -- init
```

Or install to your profile:

```bash
nix profile install github:Fission-AI/Pastelsdd
```

Or add to your development environment in `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    pastelsdd.url = "github:Fission-AI/Pastelsdd";
  };

  outputs = { nixpkgs, pastelsdd, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ pastelsdd.packages.x86_64-linux.default ];
    };
  };
}
```

## Verify Installation

```bash
pastelsdd --version
```

## Next Steps

After installing, initialize Pastelsdd in your project:

```bash
cd your-project
pastelsdd init
```

See [Getting Started](getting-started.md) for a full walkthrough.
