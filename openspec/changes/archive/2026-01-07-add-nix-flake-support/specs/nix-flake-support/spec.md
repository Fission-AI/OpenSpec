## 新增要求

### 需求：多平台 Nix flake
系統應提供一個 Nix flake，為多個平台建構 OpenSpec。

#### 場景：在 Linux x86_64 上構建
- **何時** 使用者執行 `nix build` 在 x86_64-linux 系統上
- **那麼** 系統成功建置 OpenSpec 包
- **和** 套餐包括 `openspec` 二進位

#### 場景：基於 macOS ARM 構建
- **何時** 使用者執行 `nix build` 在 aarch64-darwin 系統上
- **那麼** 系統成功建置 OpenSpec 包
- **和** 套餐包括 `openspec` 二進位

#### 場景：基於 Linux ARM 構建
- **何時** 使用者執行 `nix build` 在aarch64-linux系統上
- **那麼** 系統成功建置 OpenSpec 包

#### 場景：在 macOS x86_64 上構建
- **何時** 使用者執行 `nix build` 在 x86_64-darwin 系統上
- **那麼** 系統成功建置 OpenSpec 包

### 要求：透過nix run直接執行
系統應允許用戶直接從GitHub執行OpenSpec而無需安裝。

#### 場景：從 GitHub 執行 init 指令
- **何時** 使用者執行 `nix run github:Fission-AI/OpenSpec -- init`
- **然後**系統下載並建置OpenSpec
- **AND** 執行 `openspec init` 命令

#### 場景：執行任意 OpenSpec 指令
- **何時** 使用者執行 `nix run github:Fission-AI/OpenSpec -- <command> <args>`
- **然後**系統執行 `openspec <command> <args>`

### 要求：pnpm 依賴管理
系統應使用 pnpm 在 Nix 片中建構 OpenSpec。

#### 場景：使用 pnpm 取得依賴項
- **何時** Nix 建立軟體包
- **那麼**系統使用 `fetchPnpmDeps` 下載依賴項
- **AND** 使用 pnpm-lock.yaml 進行可重現的構建
- **AND** 對鎖定檔案版本 9.0 使用 fetcherVersion 3

#### 場景：使用 pnpm 構建
- **何時** Nix 執行建置階段
- **然後**系統執行 `pnpm run build`
- **AND** 產生已編譯的 dist 目錄 TypeScript

### 要求：Node.js版本相容性
系統應使用 package.json 引擎欄位中指定的 Node.js 20。

#### 場景：使用正確的 Node 版本進行構建
- **何時** Nix 建構 OpenSpec
- **那麼**系統使用nixpkgs中的nodejs_20
- **且**建置成功，沒有版本相容性錯誤

### 需求：開發外殼
系統應為貢獻者提供 Nix 開發 shell。

#### 場景：進入dev shell
- **何時** 使用者執行 `nix develop` 在 OpenSpec 儲存庫中
- **那麼**系統提供了一個有nodejs_20和pnpm_9的shell
- **AND** 顯示帶有版本的歡迎訊息
- **AND** 提供執行指令 `pnpm install`

### 要求：正確的二進位安裝
系統應正確安裝 openspec 二進位。

#### 場景：PATH 中的二進位文件
- **何時** 軟體包被建置或安裝
- **然後** `openspec` 二進位檔案可用於 `$out/bin/openspec`
- **並且** 二進位檔案是可執行的
- **和** 安裝時可以在沒有完整路徑的情況下呼叫二進位文件

#### 場景：二進位正確執行
- **何時** 使用者執行已安裝的 `openspec` 命令
- **那麼**系統執行%%%31%入口點
- **並且** 所有子命令都能正常工作
