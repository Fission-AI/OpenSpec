## 為什麼
- Codex（VS Code 擴展，以前稱為 Codeium Chat）透過讀取 Markdown 提示檔案來公開“斜線命令” `~/.codex/prompts/`。每個檔案名稱變成 `/command` 使用者可以執行，元資料的 YAML frontmatter (`description`, `argument-hint`） 和 `$ARGUMENTS` 捕獲用戶輸入。 Kevin Kern（「Codex 問題分析器」）分享的工作流程螢幕截圖顯示了 OpenSpec 應該定位的格式，以便團隊可以直接從聊天面板呼叫策劃的工作流程。
- 團隊已經依靠 OpenSpec 來管理 Claude、Cursor、OpenCode、Kilo Code 和 Windsurf 的斜線命令表面積。留下 Codex 會迫使他們手動將 OpenSpec 護欄複製/貼上到 `~/.codex/prompts/*.md`，它變化很快，破壞了 CLI 的「單一事實來源」承諾。
- Codex 命令位於儲存庫外部（在使用者的主目錄下），因此需要提供一個自動設定器，該設定器既可以建立提示並透過以下方式保持提示重新整理： `openspec update` 消除了容易出錯的手動步驟，並使 OpenSpec 指令在助手之間保持同步。

## 有什麼變化
- 添加 Codex 到 `openspec init` 工具選擇器與我們用於其他編輯器的相同「已設定」檢測，連接將託管 Markdown 提示直接寫入 Codex 的全域目錄的實作（`~/.codex/prompts` 或者 `$CODEX_HOME/prompts`）與 OpenSpec 標記塊。
- 產生三個Codex提示檔——`openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`-其內容鏡像共用斜線指令模板，同時使用 YAML frontmatter (`description` 和 `argument-hint` 字段）和 `$ARGUMENTS` 將所有參數捕獲為單一字串（匹配 GitHub Copilot 模式和官方 Codex 規範）。
- 記錄 Codex 的僅全域發現以及 OpenSpec 將提示直接寫入 `~/.codex/prompts` （或者 `$CODEX_HOME/prompts`).
- 教 `openspec update` 重新整理全域目錄中現有的 Codex 提示（並且僅當它們已經存在時），同時更新 frontmatter 和 body。
- 記錄 Codex 支援以及其他斜杠命令集成，並添加回歸覆蓋範圍，透過以下方式對臨時全域提示目錄執行初始化/更新行為 `CODEX_HOME`.

## 影響
- 規格： `cli-init`, `cli-update`
- 代碼： `src/core/config.ts`, `src/core/configurators/slash/*`, `src/core/templates/slash-command-templates.ts`, CLI 工具摘要、文檔
- 測試：Codex 提示鷹架和重新整理邏輯的整合覆蓋率
- 文件：README 和 CHANGELOG 條目宣布 Codex 斜杠命令支援

## 目前規格參考
- `specs/cli-init/spec.md`
  - 要求涵蓋 init UX、目錄腳手架、AI 工具設定以及對 Claude Code、Cursor 和 OpenCode 的現有斜杠命令支援。
  - 我們的 `## MODIFIED` 德爾塔 `changes/.../specs/cli-init/spec.md` 在附加新的 Codex 場景之前複製完整的「斜線命令設定」要求（標頭、描述和所有場景），以便存檔將保留每個先前的場景。
- `specs/cli-update/spec.md`
  - 要求定義 Claude Code、Cursor 和 OpenCode 的更新前提條件、模板重新整理行為和斜杠命令重新整理邏輯。
  - 相應的增量保留了整個“斜杠命令更新”要求，同時添加了 Codex 重新整理場景，確保存檔工作流程替換區塊而不會丟失現有場景或“缺少斜杠命令文件”護欄。
