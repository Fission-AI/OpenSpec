## 為什麼

使用者和代理商需要一種簡單的方法來直接從 CLI 提交有關 OpenSpec 的回饋。目前沒有任何機制可以以支援後續對話的方式收集使用者回饋、功能請求或錯誤報告。使用 GitHub Issues 使我們能夠追蹤回饋、透過 GitHub 身份驗證防止垃圾郵件，並能夠與用戶聯繫。

## 有什麼變化

- 添加 `openspec feedback <message>` CLI命令
- 槓桿作用 `gh` CLI for GitHub authentication and issue creation
- 添加 `/feedback` 透過情境豐富進行代理輔助回饋的技能
- 確保跨平台相容性（macOS、Linux、Windows）

## 影響

- 受影響的規格：新 `cli-feedback` 能力
- 受影響的代碼：
  - `src/cli/index.ts` - 註冊回饋指令
  - `src/commands/feedback.ts` - 使用指令執行 `gh` CLI
  - `src/core/templates/skill-templates.ts` - 回饋技能模板
  - `src/core/completions/command-registry.ts` - 殼牌完井
- 外部依賴：需要 `gh` CLI已安裝並經過身份驗證
