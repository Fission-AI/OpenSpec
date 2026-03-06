## 為什麼
- Kilo Code 透過載入 Markdown 工作流程來執行“斜線命令” `.kilocode/workflows/` （或全球 `~/.kilocode/workflows/`）並在用戶鍵入時執行它們 `/workflow-name.md`，使專案本地工作流程文件類似於我們已經為其他工具提供的斜杠命令文件。 \\
  ([工作流程 | Kilo 程式碼文檔](https://kilocode.ai/docs/features/slash-commands/workflows))
- 這些工作流程是簡單的 Markdown，具有可以呼叫內建工具和 MCP 整合的逐步說明，因此重複使用 OpenSpec 的共享提案/應用程式/存檔主體可以保持助手之間的行為一致，而無需發明新內容。
- OpenSpec 已偵測到已設定的工具並在 `init`/`update`;將相同的機制擴展到 `.kilocode/workflows/openspec-*.md` 確保 Kilo Code 與一個事實來源保持同步。

## 有什麼變化
- 將基洛代碼加入到 `openspec init` 具有「已設定」偵測功能的工具選擇器，包括擴充模式的接線，以便團隊可以重新整理 Kilo 程式碼資產。
- 實施一個 `KiloCodeSlashCommandConfigurator` 創造了 `.kilocode/workflows/openspec-{proposal,apply,archive}.md`，確保工作流程目錄存在並將共享內容包裝在 OpenSpec 標記中（不需要前面的內容）。
- 教 `openspec update` 使用共享的斜線指令範本重新整理現有的 Kilo Code 工作流程（並且僅有那些已經存在的工作流程）。
- Update documentation, release notes, and integration tests so the new workflow support is covered alongside Claude, Cursor, OpenCode, and Windsurf.

## 影響
- 規格： `cli-init`, `cli-update`
- 代碼： `src/core/config.ts`, `src/core/configurators/(registry|slash/*)`, `src/core/templates/slash-command-templates.ts`, CLI 工具摘要接線
- 測試：初始化/更新工作流程覆蓋範圍、標記保存回歸 `.kilocode/workflows/`
- 文件：README / CHANGELOG 更新廣告 Kilo Code 工作流程支援
