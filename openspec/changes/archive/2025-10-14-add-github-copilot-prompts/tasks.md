## 實施任務

- [x] 創造 `src/core/configurators/slash/github-copilot.ts` 實施 `SlashCommandConfigurator` 基底類
  - 實施 `getRelativePath()` 返回 `.github/prompts/openspec-{proposal,apply,archive}.prompt.md`
  - 實施 `getFrontmatter()` 生成 YAML frontmatter `description` 字段並包括 `$ARGUMENTS` 佔位符
  - 實施 `generateAll()` 創造 `.github/prompts/` 目錄並編寫三個帶有 frontmatter、標記和共享模板主體的提示文件
  - 實施 `updateExisting()` 僅重新整理標記之間的託管區塊，同時保留 frontmatter
  - 放 `toolId = "github-copilot"` 和 `isAvailable = true`

- [x] 將 GitHub Copilot 設定器註冊到 `src/core/configurators/slash/registry.ts`
  - 進口 `GitHubCopilotSlashCommandConfigurator`
  - 添加 `SLASH_COMMAND_CONFIGURATORS` 大批
  - 將工具選擇器顯示名稱更新為“GitHub Copilot”

- [x] 更新 `src/core/init.ts` 在 AI 工具選擇提示中包含 GitHub Copilot
  - 將 GitHub Copilot 新增至可用工具清單中，並偵測現有工具 `.github/prompts/openspec-*.prompt.md` 文件
  - 提示檔案存在時顯示“（已設定）”

- [x] 更新 `src/core/update.ts` 重新整理 GitHub Copilot 提示（如果存在）
  - 稱呼 `updateExisting()` 對於 GitHub Copilot 設定器，當 `.github/prompts/` 包含OpenSpec提示文件

- [x] 增加 GitHub Copilot 斜線指令產生的整合測試
  - 測試 `generateAll()` 建立三個具有正確結構的提示檔案（frontmatter + 標記 + 正文）
  - 測試 `updateExisting()` 保留 frontmatter 並且只更新託管區塊
  - 測試更新期間不會建立遺失的提示文件

- [x] 更新文件
  - 將 GitHub Copilot 新增至 README 斜線命令支援表
  - 文件 `.github/prompts/` 作為發現位置
  - 新增 CHANGELOG 條目以支援 GitHub Copilot 支援
