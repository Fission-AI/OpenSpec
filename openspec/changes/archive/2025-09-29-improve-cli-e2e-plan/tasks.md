## 1. 第一階段 – 穩定本地生成覆蓋範圍
- [x] 1.1 添加 `test/helpers/run-cli.ts` 確保建置執行一次並執行 `node dist/cli/index.js` 使用非 TTY 預設值；更新 `vitest.setup.ts` 重用共享的建置步驟。
- [x] 1.2 種子 `test/cli-e2e` 使用最小的夾具組（`tmp-init` 或複製）以覆蓋幫助/版本，一條快樂的道路 `validate`，以及透過新助手的代表性錯誤流。
- [x] 1.3 將最高價值的現有 CLI 執行測試（例如，驗證）遷移到 `runCLI` 並總結本提案中第一階段的涵蓋範圍以供下一階段使用。

## 2. 第 2 階段 – 擴展跨 Shell 驗證
- [x] 2.1 運用兩個切入點（`node dist/cli/index.js`, `bin/openspec.js`）在生成套件中並添加 shell/OS 上下文的診斷。
- [x] 2.2 擴展 GitHub 操作以在 bash 作業上執行生成套件 Linux/macOS 和 `pwsh` Windows 上的工作；擷取 shell/作業系統診斷並記錄其他 shell 的後續情況。

