# Instalação

## Pré-requisitos

- **Node.js 20.19.0 ou superior** — Verifique sua versão: `node --version`

## Gerenciadores de Pacotes

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

```bash
bun add -g @fission-ai/openspec@latest
```

## Nix

Execute o OpenSpec diretamente sem instalação:

```bash
nix run github:Fission-AI/OpenSpec -- init
```

Ou instale no seu perfil:

```bash
nix profile install github:Fission-AI/OpenSpec
```

Ou adicione ao seu ambiente de desenvolvimento em `flake.nix`:

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

## Verificar Instalação

```bash
openspec --version
```

## Próximos Passos

Após instalar, inicialize o OpenSpec no seu projeto:

```bash
cd your-project
openspec init
```

Veja [Primeiros Passos](../getting-started.md) para um guia completo.
