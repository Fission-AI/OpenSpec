# 更改：新增 /opsx:驗證技能

## 為什麼

使用者需要一種方法來驗證他們的實作是否確實與歸檔變更之前所要求的相匹配。目前，沒有系統的方法來檢查：
- 各項任務是否真正完成
- 實施是否涵蓋所有規範要求和場景
- 實施是否遵循設計決策
- 代碼是否連貫、有意義

用戶請求：“我們可以得到一個 :verify 來確保實現與所請求的相符嗎？”

## 有什麼變化

- 添加 `getVerifyChangeSkillTemplate()` 功能為 `skill-templates.ts`
- 添加 `getOpsxVerifyCommandTemplate()` 功能為 `skill-templates.ts`
- 將驗證技能整合到 `artifactExperimentalSetupCommand` 在 `artifact-workflow.ts`
- 將驗證新增至 setup 命令中的技能和命令數組中
- 更新說明文字以包含 `/opsx:verify` 在可用命令清單中
- 創造 `opsx-verify-skill` 能力規格

## 驗證尺寸

此技能從三個維度進行驗證：

1. **完整性** - 所有任務都完成了嗎？所有規格都已解決嗎？
2. **正確性** - 實施是否符合規範？場景是否涵蓋？
3. **連貫性** - 實施有意義嗎？它遵循design.md嗎？

## 輸出格式

產生優先權報告：
- 摘要記分卡（任務、規格、設計一致性）
- 首先解決關鍵問題（必須在存檔之前修復）
- 第二個警告（應該要修復）
- 建議三（很高興有）
- 針對每個問題的可行修復建議

## 影響

- 受影響的規格：新 `opsx-verify-skill` 規格
- 受影響的代碼：
  - `src/core/templates/skill-templates.ts` - 新增了2個新的模板功能
  - `src/commands/artifact-workflow.ts` - 將驗證整合到實驗設定中
- 產生的工件：當使用者執行時 `openspec artifact-experimental-setup`:
  - 創造 `.claude/skills/openspec-verify-change/SKILL.md`
  - 創造 `.claude/commands/opsx/verify.md`
- 相關技能： 並肩工作 `/opsx:apply` 和之前 `/opsx:archive`
