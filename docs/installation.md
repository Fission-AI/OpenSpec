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

### deno

Deno sometimes has issues parsing the @latest tag, so we can specify a version while installing.
If that happens, you could try to change @latest tag with the version, something like `@^1.3.1`

```bash
deno install --global --allow-all npm:@fission-ai/openspec@latest
# or
deno install --global --allow-all npm:@fission-ai/openspec@^1.3.1
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

## Next Steps

After installing, initialize OpenSpec in your project:

```bash
cd your-project
openspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
