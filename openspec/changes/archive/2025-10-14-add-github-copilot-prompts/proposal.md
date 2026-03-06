## 為什麼
- GitHub Copilot 支援透過 markdown 檔案自訂斜線指令 `.github/prompts/<name>.prompt.md`。每個文件包含 YAML frontmatter 以及 `description` 標籤和用途 `$ARGUMENTS` 捕獲用戶輸入。這種格式允許團隊直接在 Copilot 的聊天介面中公開策劃的工作流程。
- 團隊已經依賴 OpenSpec 來管理 Claude Code、Cursor、OpenCode、Codex、Kilo Code 和 Windsurf 的斜線指令設定。排除 GitHub Copilot 會強制開發人員手動維護 OpenSpec 提示 `.github/prompts/`，這會導致偏差並破壞 OpenSpec 的「單一事實來源」承諾。
- GitHub Copilot 從儲存庫中發現提示 `.github/prompts/` 目錄，使版本控制和在團隊中共享變得簡單。透過新增自動產生和重新整理 `openspec init` 和 `openspec update` 消除了手動同步，並在所有 AI 助理中保持 OpenSpec 指令一致。

## 有什麼變化
- 將 GitHub 副駕駛添加到 `openspec init` 與其他編輯器類似的具有“已設定”檢測功能的工具選擇器，連接將託管 Markdown 提示文件寫入到的實現 `.github/prompts/` 帶有 OpenSpec 標記塊。
- 產生三個 GitHub Copilot 提示檔 —`openspec-proposal.prompt.md`, `openspec-apply.prompt.md`， 和 `openspec-archive.prompt.md`-其內容鏡像共享斜線命令模板，同時符合 Copilot 的 frontmatter 和 `$ARGUMENTS` 佔位符約定。
- 記錄 GitHub Copilot 基於儲存庫的發現以及 OpenSpec 將提示寫入 `.github/prompts/` 與託管區塊。
- 教 `openspec update` 重新整理儲存庫中現有的 GitHub Copilot 提示（僅當它們已經存在時） `.github/prompts/` 目錄。
- 記錄 GitHub Copilot 支援以及其他斜杠命令集成，並添加測試覆蓋率，以執行初始化/更新行為 `.github/prompts/` files.

## 影響
- 規格： `cli-init`, `cli-update`
- 代碼： `src/core/configurators/slash/github-copilot.ts` （新的）， `src/core/configurators/slash/registry.ts`, `src/core/templates/slash-command-templates.ts`, CLI 工具摘要、文檔
- 測試：GitHub Copilot 提示支架和重新整理邏輯的整合覆蓋率
- 文件：README 和 CHANGELOG 條目宣布 GitHub Copilot 斜杠命令支援

## 目前規格參考
- `specs/cli-init/spec.md`
  - 要求涵蓋 init UX、目錄鷹架、AI 工具設定以及對 Claude Code、Cursor、OpenCode、Codex、Kilo Code 和 Windsurf 的現有斜杠命令支援。
  - 我們的 `## MODIFIED` 德爾塔 `changes/.../specs/cli-init/spec.md` 將在附加新的 GitHub Copilot 場景之前複製完整的「Slash 命令設定」要求（標題、描述和所有場景），以便存檔保留每個先前的場景。
- `specs/cli-update/spec.md`
  - 需求定義了現有工具的更新前提條件、範本重新整理行為和斜線指令重新整理邏輯。
  - 相應的增量保留了整個「斜線指令更新」要求，同時新增了 GitHub Copilot 重新整理場景，確保存檔工作流程替換區塊而不會遺失現有場景或「缺少斜線指令檔」護欄。
