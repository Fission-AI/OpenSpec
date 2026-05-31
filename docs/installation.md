# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Package Managers

### npm

```bash
npm install -g @thiagodiogo/pscode@latest
```

### pnpm

```bash
pnpm add -g @thiagodiogo/pscode@latest
```

### yarn

```bash
yarn global add @thiagodiogo/pscode@latest
```

### bun

Bun can install Pscode globally, but Pscode currently runs on Node.js.
You still need Node.js 20.19.0 or higher available on `PATH`.

```bash
bun add -g @thiagodiogo/pscode@latest
```

## Nix

Run Pscode directly without installation:

```bash
nix run github:thiagodiogo/Pscode -- init
```

Or install to your profile:

```bash
nix profile install github:thiagodiogo/Pscode
```

Or add to your development environment in `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    pscode.url = "github:thiagodiogo/Pscode";
  };

  outputs = { nixpkgs, pscode, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ pscode.packages.x86_64-linux.default ];
    };
  };
}
```

## Verify Installation

```bash
pscode --version
```

## Next Steps

After installing, initialize Pscode in your project:

```bash
cd your-project
pscode init
```

See [Getting Started](getting-started.md) for a full walkthrough.
