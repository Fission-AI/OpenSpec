# 實施任務

## 1.新增Nix安裝到CI

- [x] 1.1 Research Nix 安裝選項的 GitHub 操作（nix-installer-action 與手動安裝）
- [x] 1.2 將Nix安裝步驟加入.github/workflows/ci.yml
- [x] 1.3 設定Nix並啟用實驗性功能（flakes，nix-指令）
- [x] 1.4 新增 Nix 儲存快取以提高 CI 效能

## 2. 建立 Nix 建置驗證作業

- [x] 2.1 新增 `nix-flake-validate` 工作到 .github/workflows/ci.yml
- [x] 2.2 實施 `nix build` 採取正確的錯誤處理步驟
- [x] 2.3 新增驗證步驟以確認建置輸出中存在二進位文件
- [x] 2.4 新增測試二進位執行的步驟（`nix run . -- --version`)

## 3.新增更新腳本驗證

- [x] 3.1 新增作業步驟以在乾執行或測試模式下執行scripts/update-flake.sh
- [x] 3.2 驗證腳本執行沒有錯誤
- [x] 3.3 新增驗證從 package.json 中正確擷取版本
- [x] 3.4 驗證 flake.nix 已更新為正確的格式（版本和雜湊值）

## 4. 設定作業依賴關係和要求

- [x] 4.1 設定 Nix 驗證作業在 pull_request 和推播事件上執行
- [x] 4.2 將 Nix 驗證新增至所需檢查清單中
- [x] 4.3 設定作業與現有測驗/lint 作業並行執行
- [x] 4.4 設定適當的超時時間（5-10分鐘）

## 5. 本地測試

- [x] 5.1 如果尚不可用，請在本機安裝
- [x] 5.2 使用測驗 Nix 驗證作業 `act pull_request`
- [x] 5.3 驗證act可以在安裝了Nix的情況下執行工作流程
- [x] 5.4 在 .actrc 或 README 中記錄所需的任何特定於操作的設定

## 6. 文件記錄和最終確定

- [x] 6.1 將有關 Nix CI 驗證的文件加入 README 或 CONTRIBUTING.md
- [x] 6.2 記錄如何使用 act 在本地測試 CI
- [ ] 6.3 如有需要，更新 CI 徽章或狀態指示器
- [ ] 6.4 透過建立測試 PR 進行端到端測試

## 7. 存檔變更

- [x] 7.1 合併並驗證後，在 openspec/specs/ci-nix-validation/spec.md 建立新的spec文件
- [x] 7.2 將更改目錄移至 openspec/changes/archive/[date]-add-nix-ci-validation/
- [x] 7.3 執行 `openspec validate --strict` 確認存檔的變更通行證
