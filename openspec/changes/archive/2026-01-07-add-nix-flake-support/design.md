## 情境

OpenSpec 是一個 TypeScript CLI 工具，使用 pnpm 進行依賴管理。該項目要求Node.js≥20.19.0。 Nix 使用自己的建置系統，該系統需要瞭解如何取得依賴項並可重複地建置專案。

Nix 生態系統具有與傳統 npm 生態系統不同的特定模式來打包 Node.js/pnpm 專案。

## 目標

- 啟用 OpenSpec 直接執行 `nix run github:Fission-AI/OpenSpec`
- Support all major platforms (Linux x86/ARM, macOS x86/ARM)
- 使用現有的 pnpm-lock.yaml 進行可重現的構建
- 為Nix用戶提供開發環境

## Non-Goals

- 替換現有的 npm/pnpm 發布工作流程
- 發佈到 nixpkgs（可以稍後單獨完成）
- 支援 Windows（Nix 不在 Windows 上本地執行）

## 決定

### 使用 stdenv.mkDerivation 而不是 buildNpmPackage

**決定**：使用 OpenSpec 包 `stdenv.mkDerivation` 有 pnpm 鉤子。

**基本原理**：nixpkgs 中的 zigbee2mqtt 套件演示了 pnpm 專案的當前最佳實踐。使用 `buildNpmPackage` pnpm 需要複雜的設定，而 `mkDerivation` 使用正確的鉤子會更簡單並且得到更好的支撐。

**考慮的替代方案**：使用 `buildNpmPackage` 和 `npmConfigHook = pkgs.pnpmConfigHook` - 這是較舊的模式，會導致依賴項獲取問題。

### 將 fetchPnpmDeps 與顯式 pnpm 版本一起使用

**決定**：使用 `pkgs.fetchPnpmDeps` 和 `pnpm = pkgs.pnpm_9` 和 `fetcherVersion = 3`.

**理由**：
- pnpm 鎖定檔案版本 9.0 需要 fetcherVersion 3
- 顯式 pnpm_9 確保獲取和建置之間的一致性
- 這是處理 nixpkgs 中 pnpm 項目的記錄方法

### 無需 flake-utils 的多平台支援

**決定**：使用 plain Nix 實現多平台支援 `nixpkgs.lib.genAttrs`.

**基本原理**：根據使用者要求，避免額外的依賴關係。這 `genAttrs` 此模式在 Nix 社群中很簡單且易於理解。

### Node.js 20 而不是最新的

**決定**：固定到nodejs_20以符合package.json引擎的要求。

**基本原理**：確保與開發環境和npm套件要求的一致性。避免與較新的 Node 版本的潛在相容性問題。

## 關鍵實施細節

### 依賴項哈希管理

這 `pnpmDeps.hash` 每當依賴關係發生變化時，必須更新欄位。工作流程：
1. 將哈希設為假值（全零）
2. 執行 `nix build`
3. Nix 因實際哈希值而失敗
4. 使用正確的雜湊更新 flake.nix

這是固定輸出推導的標準 Nix 工作流程。

### 建構輸入

所需的nativeBuildInputs：
- `nodejs_20` - 執行時
- `npmHooks.npmInstallHook` - 處理安裝階段
- `pnpmConfigHook` - 設定pnpm環境
- `pnpm_9` - pnpm 可執行文件

這 `dontNpmPrune = true` 在建置後保留所有依賴項很重要。

## 風險/權衡

**[風險]** 當依賴關係改變時，雜湊值需要更新 → **緩解**：清楚地記錄這一點；來自 Nix 的錯誤訊息提供了正確的雜湊值

**[風險]** Nix 版本可能落後於 npm 版本 → **緩解**：這很好；如果 Nix 用戶需要前沿技術，他們仍然可以使用 npm

**[權衡]** 雜湊更新的額外維護負擔 → **好處**：為 Nix 生態系統使用者提供更好的體驗

## 遷移計劃

1. 將 flake.nix 新增至儲存庫
2. 在多個平台上進行測試建置（可以使用 Nix 的 GitHub 操作）
3. 使用 Nix 安裝說明更新 README
4. 可以選擇添加到 CI 管道以儘早捕獲哈希不匹配

沒有重大變化 - 這純粹是附加的。

## 開放式問題

- 我們應該為 CI 添加自動哈希更新嗎？ （可以使用nix-update-script）
- 驗證後我們是否應該提交nixpkgs？ （單獨決定）
- 我們想要在 flake 中支援較舊的 Node 版本嗎？ （可能不會 - 遵守 package.json 要求）
