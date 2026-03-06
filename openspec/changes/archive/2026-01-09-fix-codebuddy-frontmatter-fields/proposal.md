## 為什麼

與其他工具相比，CodeBuddy斜杠命令設定器目前使用不一致的 frontmatter 欄位。它使用 `category` 和 `tags` 欄位（如 Crush）但應該使用 `argument-hint` 欄位（例如 Factory、Auggie 和 Codex）以獲得更好的一致性。此外， `proposal` 命令完全缺少 frontmatter 欄位。檢視CodeBuddy的官方文件後，正確的格式應該使用 `description` 和 `argument-hint` 帶有方括號參數格式的欄位。

## 有什麼變化

- 代替 `category` 和 `tags` 字段與 `argument-hint` CodeBuddy frontmatter 中的字段
- 將缺少的 frontmatter 欄位加入到 `proposal` 命令
- 使用正確的方括號格式 `argument-hint` 參數（例如， `[change-id]`)
- 確保與CodeBuddy官方文件的一致性

## 影響

- 受影響的規範：cli-init、cli-update
- 受影響的代碼： `src/core/configurators/slash/codebuddy.ts`
- CodeBuddy 用戶將以正確的格式獲得斜杠命令的正確參數提示