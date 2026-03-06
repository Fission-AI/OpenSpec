## 1. 實施
- [x] 1.1 重構 `openspec init` 始終生成根 `AGENTS.md` stub (initial run and extend mode) via shared helper logic.
- [x] 1.2 重新設計 AI 工具選擇嚮導，以顯示「本機支援」與「其他工具」分組，並使存根成為非選用。
- [x] 1.3 更新 CLI 訊息傳遞、範本和設定器，以便新流程在 init 和 update 指令之間保持同步。
- [x] 1.4 重新整理單元/整合測試以涵蓋無條件存根和重新分組的提示佈局。
- [x] 1.5 更新文件、README 片段和提及選擇加入的 CHANGELOG 條目 `AGENTS.md` experience.

## 2. 驗證
- [x] 2.1 執行 `pnpm test` 針對 CLI 初始化/更新套件。
- [x] 2.2 執行 `openspec validate update-cli-init-root-agents --strict`.
- [x] 2.3 執行手動冒煙測試：執行 `openspec init` 在暫存目錄中，確認存根+分組提示，在擴充模式下重新執行。
