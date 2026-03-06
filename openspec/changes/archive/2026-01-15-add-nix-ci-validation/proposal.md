# 添加 Nix CI 驗證

## 為什麼

該專案最近新增了 Nix flake 支援 (flake.nix) 和自動更新腳本 (scripts/update-flake.sh)，以使 Nix 使用者能夠安裝 OpenSpec。然而，沒有 CI 驗證確保這些 Nix 工件隨著專案的發展繼續工作。這會帶來重大變更可能在未被偵測到的情況下合併的風險​​。

## 有什麼變化

- 新增新的 GitHub Actions 工作流程作業以驗證 Nix flake 建置是否成功
- 新增 update-flake.sh 腳本執行時沒有錯誤的驗證
- 在 Linux 上進行測試（其中 Nix 支援最常見）
- 如果 Nix 建置或更新腳本中斷，確保 CI 失敗
- 啟用本地測試 `act` 對於開發人員

## 影響

- 受影響的規格：新功能 `ci-nix-validation`
- 受影響的代碼： `.github/workflows/ci.yml` （新增工作）
- 受影響的基礎設施：GitHub 安裝了 Nix 的 Actions 執行者
- 好處：防止 Nix 支援出現倒退，為 Nix 使用者帶來信心
- 權衡：將 CI 執行時間增加約 2-3 分鐘
