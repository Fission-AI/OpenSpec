# 新增存檔命令參數

## 為什麼
這 `/openspec:archive` 目前，slash 命令缺乏參數支援，迫使 AI 從對話上下文或列出所有更改來推斷要存檔的更改。這會產生安全風險，如果上下文不明確或存在多個更改，則可能會存檔錯誤的提案。使用者希望明確指定更改 ID，以符合 CLI 命令的行為 `openspec archive <id>`.

## 有什麼變化
- 添加 `$ARGUMENTS` OpenCode 存檔斜線指令 frontmatter 的佔位符（與提案指令的現有模式相符）
- 更新存檔命令範本步驟以驗證提供的特定變更 ID 參數
- 注意：Codex、GitHub Copilot 和 Amazon Q 已經有 `$ARGUMENTS` 用於存檔； Claude/Cursor/Windsurf/Kilocode 不支援參數

## 影響
- 受影響的規格： `cli-update` （斜線指令產生邏輯）
- 受影響的代碼：
  - `src/core/configurators/slash/opencode.ts` （新增 `$ARGUMENTS` 存檔前言）
  - `src/core/templates/slash-command-templates.ts` （參數驗證的存檔範本步驟）
- 突破：否 - 這是附加功能，使命令更安全
- 面向用戶：是 - OpenCode 用戶將能夠將更改 ID 作為參數傳遞： `/openspec:archive <change-id>`
