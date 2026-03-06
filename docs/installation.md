# 安裝

## 先決條件

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## 套件管理器

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

## 尼克

無需安裝直接運作OpenSpec：

```bash
nix run github:Fission-AI/OpenSpec -- init
```

或安裝到您的個人資料：

```bash
nix profile install github:Fission-AI/OpenSpec
```

或添加到您的開發環境中 `flake.nix`:

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

## 驗證安裝

```bash
openspec --version
```

## 下一步

安裝後，在專案中初始化OpenSpec：

```bash
cd your-project
openspec init
```

看 [入門](getting-started.md) 完整的演練。
