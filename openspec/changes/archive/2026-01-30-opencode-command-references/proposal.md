## 為什麼

OpenCode uses hyphen-based command syntax (`/opsx-new`）但我們的範本包含基於冒號的引用（`/opsx:new`）。這會造成不一致，生成的命令檔案和技能檔案包含與實際命令呼叫語法不匹配的引用，從而使 AI 和使用者感到困惑。

## 有什麼變化

- 建立共享轉換實用程式（`transformToHyphenCommands`）用於轉換 `/opsx:` 到 `/opsx-`
- 更新 OpenCode 命令適配器以使用此實用程式轉換正文文本
- 添加一個可選的 `transformInstructions` 回呼參數為 `generateSkillContent()`
- 更新 `init.ts` 和 `update.ts` 為 OpenCode 產生技能時傳遞變壓器

## 能力

### 新功能

無 - 這是錯誤修復，而不是新功能。

### 修改後的功能

無 - 沒有規範層級的行為變化。這是 OpenCode 適配器和技能生成中的實作修復，不會更改任何外部要求或合約。

## 影響

- **代碼**： 
  - `src/utils/command-references.ts` （新文件）
  - `src/utils/index.ts` （出口）
  - `src/core/shared/skill-generation.ts` （新增回呼參數）
  - `src/core/command-generation/adapters/opencode.ts` （使用變壓器）
  - `src/core/init.ts` （OpenCode 的傳遞變壓器）
  - `src/core/update.ts` （OpenCode 的傳遞變壓器）
- **使用者**：OpenCode 用戶將看到正確的 `/opsx-` 產生的命令檔案和技能檔案中的命令引用
- **其他工具**：沒有影響 - 轉換僅適用於 OpenCode
