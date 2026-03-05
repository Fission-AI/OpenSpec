# Встановлення

## Передумови

- **Node.js 20.19.0 або вище** — перевірте свою версію: `node --version`

## Менеджери пакетів

### npm

```bash
npm install -g @fission-ai/openspec@latest
```

### pnpm

```bash
pnpm add -g @fission-ai/openspec@latest
```

### пряжа

```bash
yarn global add @fission-ai/openspec@latest
```

### булочка

```bash
bun add -g @fission-ai/openspec@latest
```

## Нікс

Запустіть OpenSpec безпосередньо без встановлення:

```bash
nix run github:Fission-AI/OpenSpec -- init
```

Або встановіть у свій профіль:

```bash
nix profile install github:Fission-AI/OpenSpec
```

Або додайте до свого середовища розробки у `flake.nix`:

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

## Перевірте встановлення

```bash
openspec --version
```

## Наступні кроки

Після встановлення ініціалізуйте OpenSpec у своєму проекті:

```bash
cd your-project
openspec init
```

Див. [Початок роботи](getting-started.md), щоб отримати повну інструкцію.
