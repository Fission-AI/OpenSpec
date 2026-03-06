## 為什麼

維護 Nix flake 需要在發布新版本或更新依賴項時手動更新版本和依賴項雜湊。這很容易出錯，並且需要維護人員來瞭解 Nix 的內部結構。自動化此流程可確保一致性並減少發布摩擦。

## 有什麼變化

- 添加 `scripts/update-flake.sh` 自動更新 flake.nix 版本和依賴項哈希
- 添加 `scripts/README.md` 記錄所有維護腳本
- 腳本從 package.json 中提取版本並自動確定正確的 pnpm 依賴項哈希

## 能力

### 新功能
- `flake-update-script`：用於維護 flake 的自動化腳本。 nix

### 修改後的功能
- 沒有任何

## 影響

- **新文件**： `scripts/update-flake.sh`, `scripts/README.md`
- **維護者工作流程**：版本更新現在包含執行 `./scripts/update-flake.sh`
- **依賴項**：腳本需要 Node.js （已經是依賴項）和 Nix （對於使用 Nix 的維護者）
