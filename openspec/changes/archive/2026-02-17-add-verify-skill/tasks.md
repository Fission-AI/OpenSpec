# 任務：新增/opsx:驗證技能

## 1. 技能範本功能
- [x] 1.1 添加 `getVerifyChangeSkillTemplate()` 到技能模板.ts
- [x] 1.2 添加 `getOpsxVerifyCommandTemplate()` 到技能模板.ts

## 2. 與artifact-experimental-setup集成
- [x] 2.1 導入artifact-workflow.ts中驗證範本函數
- [x] 2.2 在artifactExperimentalSetupCommand中的skills數組中新增驗證
- [x] 2.3 在artifactExperimentalSetupCommand中的commands陣列中加入verify
- [x] 2.4 新增驗證幫助文字輸出

## 3. 驗證（建置和測試）
- [x] 3.1 驗證TypeScript編譯成功
- [x] 3.2 驗證現在包含所有 8 個技能（以前是 7 個，現在是 8 個）
