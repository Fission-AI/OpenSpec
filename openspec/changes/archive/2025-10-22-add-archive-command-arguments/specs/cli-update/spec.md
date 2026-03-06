# CLI 更新規格增量

## 修改後的要求

### 需求：Slash 指令更新
更新命令應重新整理已設定工具的現有斜杠命令文件，而不建立新文件，並確保 OpenCode 存檔命令接受更改 ID 參數。

#### 場景：更新 OpenCode 的斜杠指令
- **什麼時候** `.opencode/command/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明
- **並且**確保存檔命令包括 `$ARGUMENTS` frontmatter 中的佔位符用於接受更改 ID 參數

### 需求：存檔命令參數支援
歸檔斜線命令範本應支援可選的變更 ID 參數，以支援以下工具： `$ARGUMENTS` placeholder.

#### 場景：帶有更改 ID 參數的存檔命令
- **何時** 用戶調用 `/openspec:archive <change-id>` 更改 ID
- **然後** 範本應指示 AI 驗證提供的變更 ID `openspec list`
- **並且** 使用提供的更改 ID 進行存檔（如果有效）
- **並且** 如果提供的更改 ID 與可存檔更改不匹配，則會快速失敗

#### 場景：不含參數的 Archive 指令（向後相容）
- **何時** 用戶調用 `/openspec:archive` 無需提供變更 ID
- **那麼** 範本應指示 AI 從上下文中或透過執行來識別更改 ID `openspec list`
- **並且** 繼續現有行為（保持向後相容性）

#### 場景：OpenCode 歸檔模板生成
- **何時** 產生 OpenCode 存檔斜線命令文件
- **然後** 包括 `$ARGUMENTS` 前面的佔位符
- **並且**將其包裝在一個清晰的結構中，例如 `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` 指示預期的參數
- **並且** 在範本正文中包含驗證步驟以檢查更改 ID 是否有效
