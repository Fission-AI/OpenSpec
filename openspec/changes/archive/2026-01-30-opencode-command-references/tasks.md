## 1. 實施

- [x] 1.1 建立 `src/utils/command-references.ts` 和 `transformToHyphenCommands()` 功能
- [x] 1.2 出口 `transformToHyphenCommands` 從 `src/utils/index.ts`
- [x] 1.3 更新 `generateSkillContent()` 在 `src/core/shared/skill-generation.ts` 接受可選的 `transformInstructions` 打回來
- [x] 1.4 更新 OpenCode 適配器 `src/core/command-generation/adapters/opencode.ts` 使用 `transformToHyphenCommands()` 用於正文
- [x] 1.5 更新 `init.ts` 為 OpenCode 產生技能時傳遞 Transformer
- [x] 1.6 更新 `update.ts` 為 OpenCode 產生技能時傳遞 Transformer

## 2. 測試

- [x] 2.1 建立 `test/utils/command-references.test.ts` 單元測試 `transformToHyphenCommands()`
- [x] 2.2 新增測試 `test/core/command-generation/adapters.test.ts` 用於 OpenCode 主體轉換
- [x] 2.3 新增測試 `test/core/shared/skill-generation.test.ts` 用於變壓器回調

## 3. 驗證

- [x] 3.1 執行 `npx vitest run test/utils/command-references.test.ts test/core/command-generation/adapters.test.ts test/core/shared/skill-generation.test.ts` 確保測試通過
- [x] 3.2 執行 `pnpm run build` 確保沒有TypeScript錯誤
- [x] 3.3 執行 `openspec init --tools opencode` 在暫存目錄中並驗證：
  - 命令檔位於 `.opencode/command/` 包含 `/opsx-` 參考文獻（不 `/opsx:`)
  - 技能檔案在 `.opencode/skills/` 包含 `/opsx-` 參考文獻（不 `/opsx:`)
