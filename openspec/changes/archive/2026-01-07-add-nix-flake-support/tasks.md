## 1. 建立片狀結構

- [x] 1.1 在儲存庫根目錄中建立 flake.nix
- [x] 1.2 定義輸入（僅限 nixpkgs，無 flake-utils）
- [x] 1.3 設定支援的系統清單（4個平台）
- [x] 1.4 建立 forAllSystems 輔助函數

## 2. 設定包構建

- [x] 2.1 使用 FinalAttrs 模式設定 stdenv.mkDerivation
- [x] 2.2 用fetchPnpmDeps設定%pnpmDeps
- [x] 2.3 設定 pnpm = pnpm_9 且 fetcherVersion = 3
- [x] 2.4 新增佔位符哈希（全零）
- [x] 2.5 設定nativeBuildInputs（nodejs_20、hooks、pnpm_9）
- [x] 2.6 設定dontNpmPrune = true

## 3. 定義建置階段

- [x] 3.1 使用runHook preBuild添加buildPhase
- [x] 3.2 新增pnpm執行建置指令
- [x] 3.3 新增runHook postBuild

## 4. 設定安裝

- [x] 4.1 讓npmInstallHook自動處理安裝
- [x] 4.2 驗證二進位檔案最終位於 $out/bin/openspec 中

## 5. 新增元資料

- [x] 5.1 設定元描述
- [x] 5.2 設定meta.homepage
- [x] 5.3 設定元許可證(MIT)
- [x] 5.4 設定meta.main程式=“開放規範”

## 6. 設定應用程式入口點

- [x] 6.1 使用 forAllSystems 新增應用程式輸出
- [x] 6.2 將預設應用程式設定為 openspec 二進位文件
- [x] 6.3 測試 nix run 是否有效

## 7.添加開發Shell

- [x] 7.1 使用 forAllSystems 新增 devShells 輸出
- [x] 7.2 在buildInputs中包含nodejs_20和pnpm_9
- [x] 7.3 新增帶有歡迎訊息和說明的 shellHook

## 8. 取得正確的依賴項哈希

- [x] 8.1 執行 nix build 觸發哈希不匹配
- [x] 8.2 從錯誤訊息複製正確的雜湊值
- [x] 8.3 更新 pnpmDeps.hash 為 flake。 nix
- [x] 8.4 驗證建置是否成功

## 9. 測試

- [x] 9.1 測試 `nix build` 在 x86_64-linux 上
- [x] 9.2 測試 `nix run . -- --version` 作品
- [x] 9.3 測試 `nix develop` 提供正確的環境
- [ ] 9.4 在 macOS 上進行測試（如果可用）
- [ ] 9.5 測試 `nix run github:Fission-AI/OpenSpec -- init` 合併到main後

## 10. 文檔

- [x] 10.1 將Nix安裝部分加入README
- [x] 10.2 在 README 中包含常見 Nix 工作流程的範例指令
