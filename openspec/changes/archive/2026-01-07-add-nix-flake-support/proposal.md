## 為什麼

NixOS 上或使用 Nix 軟體套件管理器的 OpenSpec 使用者無法在不經過 npm 的情況下輕鬆安裝或執行 OpenSpec。添加 Nix 薄片使 OpenSpec 成為 Nix 生態系統中的一等公民，使用戶能夠執行 `nix run github:Fission-AI/OpenSpec -- init` 或以聲明方式將 OpenSpec 包含在其開發環境中。

## 有什麼變化

- 添加 `flake.nix` 到具有多平台支援的儲存庫根目錄（x86_64-linux、aarch64-linux、x86_64-darwin、aarch64-darwin）
- 套件使用 pnpm 進行依賴管理（匹配現有的開發工作流程）
- 支援直接執行 `nix run` 並透過安裝 `nix profile install`
- 為使用 Nix 的貢獻者提供開發 shell

## 能力

### 新功能
- `nix-flake-support`：用於建置和執行 OpenSpec 的 Nix flake 設定

### 修改後的功能
- 沒有任何

## 影響

- **新文件**： `flake.nix` 在儲存庫根目錄中
- **文件**：應該為 Nix 使用者新增安裝說明
- **CI/CD**：可為 CI 管道添加薄片檢查（可選）
- **維護**：依賴項變更時需要更新 pnpmDeps 哈希
