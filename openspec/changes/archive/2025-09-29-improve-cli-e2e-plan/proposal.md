## 為什麼
最近的跨殼回歸 `openspec` 命令顯示我們現有的單元/整合測試不會執行打包的 CLI 或特定於 shell 的行為。 Vitest 衍生測試之前的嘗試陷入停滯，因為它將 e2e 覆蓋與 `pnpm pack` 安裝，在網路受限環境中會失敗。納入這些發現後，我們現在需要一項經批准的計劃來重新調整工作。

## 有什麼變化
- 採用分階段策略，先穩定內建CLI的直接生成測試（`node dist/cli/index.js`）使用輕量級固定裝置和共享 `runCLI` helper.
- 一旦生成工具穩定，就擴大覆蓋範圍，將初始矩陣集中在 bash 作業上 Linux/macOS 和 `pwsh` 在 Windows 上同時行使直接 `node dist/cli/index.js` 呼叫和具有非 TTY 預設值和捕獲的診斷資訊的 bin shim。
- 將打包/安裝驗證視為可選的 CI 保護措施：當執行者俱有註冊表訪問權限時，執行一個簡單的基於 pnpm 的包→安裝→冒煙測試流程；否則將其記錄為超出範圍，同時關閉剩餘的強化項目。
- 關閉剩餘的跨殼硬化項目：確保 `.gitattributes` 涵蓋打包資產，在 CI 期間強制執行 CLI 填充程序的可執行位，並完成待處理的 SIGINT 處理改進。

## 影響
- 測試：新增 `test/cli-e2e` 生成套件，建立共享 `runCLI` 幫助者，並調整 `vitest.setup.ts` 根據需要。
- 工具：使用上面的輕量級矩陣更新 GitHub Actions 工作流程，並（可選）在網路可用的情況下進行打包安裝檢查。
- 文件：記下本提案（或相關規範）中的階段進度和任何限制，以便未來階段有明確的背景。

### 第一階段狀態
- 共享 `test/helpers/run-cli.ts` 保證 CLI bundle 在產生之前存在，並為每次呼叫強制執行非 TTY 預設值。
- 新的 `test/cli-e2e/basic.test.ts` 封面 `--help`, `--version`, 一個成功的 `validate --all --json`，以及針對的未知項錯誤路徑 `tmp-init` 夾具副本。
- 傳統頂級 `validate` exec 測試現在依賴 `runCLI`，避免手動 `execSync` 使用，同時保持其夾具創作完好無損。
- CI 矩陣基礎已就位（bash 在 Linux/macOS 上，pwsh 在 Windows 上），因此產生套件的運作方式與助手在受支援的 shell 上的運作方式相同。
