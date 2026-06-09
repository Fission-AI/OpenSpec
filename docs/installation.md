# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## Package Managers

### npm

```bash
npm install -g clearspec@latest
```

### pnpm

```bash
pnpm add -g clearspec@latest
```

### yarn

```bash
yarn global add clearspec@latest
```

### bun

Bun can install ClearSpec globally, but ClearSpec currently runs on Node.js.
You still need Node.js 20.19.0 or higher available on `PATH`.

```bash
bun add -g clearspec@latest
```

## Nix

Run ClearSpec directly without installation:

```bash
nix run github:<you>/clearspec -- init
```

Or install to your profile:

```bash
nix profile install github:<you>/clearspec
```

Or add to your development environment in `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    clearspec.url = "github:<you>/clearspec";
  };

  outputs = { nixpkgs, clearspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ clearspec.packages.x86_64-linux.default ];
    };
  };
}
```

## Verify Installation

```bash
clearspec --version
```

## Next Steps

After installing, initialize ClearSpec in your project:

```bash
cd your-project
clearspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
