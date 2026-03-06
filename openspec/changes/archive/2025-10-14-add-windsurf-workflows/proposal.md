## 為什麼
- Windsurf 將「工作流程」公開為類似斜線自動化的工具：在下面保存了 Markdown 文件 `.windsurf/workflows/` Cascade 在整個工作空間（包括子目錄和 git 根目錄）中發現，然後在使用者鍵入時執行 `/workflow-name`。這些檔案可以由團隊創作，必須保持在 12k 個字元以下，並且可以呼叫其他工作流程，使它們成為為 Windsurf 用戶發布 OpenSpec 指南的自然場所。 \
  ([Windsurf 工作流程文檔](https://docs.windsurf.com/windsurf/cascade/workflows))
- Wave 12 變更日誌重申工作流程是透過斜線命令呼叫的，並且 Windsurf 將它們儲存在 `.windsurf/workflows`，因此 OpenSpec CLI 只需要產生 Markdown 即可參與 Windsurf 的指令面板。 \
  （「自訂工作流程」部分， [風帆衝浪變更日誌](https://windsurf.com/changelog))
- OpenSpec 已經為提案/應用程式/歸檔提供了共享命令主體，並使用標記，以便命令保持最新。將相同的範本擴展到 Windsurf 可以使行為與 Claude、Cursor 和 OpenCode 保持一致，而無需發明新的內容流。

## 有什麼變化
- 將 Windsurf 新增至 CLI 工具選擇器 (`openspec init`）和斜槓命令註冊表，因此選擇它的腳手架 `.windsurf/workflows/openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md` 與標記管理的機構。
- 使用短標題/描述以及標記中包含的現有 OpenSpec 護欄/步驟來塑造每個 Windsurf 工作流程，確保總有效負載遠低於 12,000 個字元的限制。
- 確保 `openspec update` 就地重新整理現有的 Windsurf 工作流程（並且僅重新整理那些已經存在的工作流程），鏡像其他編輯器的當前行為。
- 擴展 init/update 的單元測試以涵蓋 Windsurf 產生和更新，並更新 README/tooling 文件以宣傳 Windsurf 支援。

## 影響
- 規格： `cli-init`, `cli-update`
- 代碼： `src/core/configurators/slash/*`, `src/core/templates/slash-command-templates.ts`, CLI 提示, README
- 測試：Windsurf 工作流程的初始化/更新整合覆蓋範圍
