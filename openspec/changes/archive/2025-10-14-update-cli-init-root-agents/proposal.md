## 為什麼
OpenSpec 目前建立根級別 `AGENTS.md` 僅當團隊在期間明確選擇「AGENTS.md 標準」工具時才進行存根 `openspec init`。跳過該核取方塊的項目永遠不會獲得託管存根，因此非本地助手（Copilot、Codeium 等）沒有入口點，之後 `openspec update` 在沒有任何上下文的情況下靜默執行建立檔案。我們需要將存根烘焙到初始化中，澄清工具選擇體驗，並保持更新工作流程一致，以便每個團隊成員從第一天起就掌握正確的指令。

## 有什麼變化
- 更新 `openspec init` 所以根 `AGENTS.md` 始終產生存根（首次執行和擴展模式）並從共享實用程式重新整理，而不是與工具選擇綁定。
- 重新設計 AI 工具選擇嚮導，將選項分為「本機支援」（Claude、遊標、OpenCode 等）和解釋始終在線的資訊性「其他工具」部分 `AGENTS.md` hand-off.
- 調整 CLI 規範、提示和成功訊息以反映新類別，同時保持擴展模式行為一致。
- 更新自動化測試和固定裝置以涵蓋無條件存根建立和重新設計的提示流程。
- 重新整理文件和入門片段，以便他們不再將存根描述為選擇加入，而是調出新的分組。
- 確保 `openspec update` 繼續調解雙方 `openspec/AGENTS.md` 和根存根，記錄預期的行為，以便不匹配的設定可以自我修復。

## 影響
- 受影響的規格： `cli-init`, `cli-update`
- 受影響的代碼： `src/core/init.ts`, `src/core/config.ts`, `src/core/configurators/agents.ts`, `src/core/templates/agents-root-stub.ts`, `src/core/update.ts`，相關測試下 `test/core/`
- 文件和資產：README、變更日誌、任何引用選擇「AGENTS.md 標準」選項的設定指南
