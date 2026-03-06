# 更新代理指令檔名 - 任務

## 1. 重新命名指令文件
- [x] 重新命名 `openspec/README.md` 到 `openspec/AGENTS.md`
- [x] 將根引用更新為新路徑

## 2. 更新模板
- [x] 重新命名 `src/core/templates/readme-template.ts` 到 `agents-template.ts`
- [x] 更新匯出常數 `readmeTemplate` 到 `agentsTemplate`

## 3.調整CLI命令
- [x] 調整 `openspec init` 產生 `AGENTS.md`
- [x] 更新 `openspec update` 重新整理 `AGENTS.md`
- [x] 確保 CLAUDE.md 標記連結到 `@openspec/AGENTS.md`

## 4. 更新規格
- [x] 調整 `cli-init` 參考規格 `AGENTS.md`
- [x] 調整 `cli-update` 參考規格 `AGENTS.md`
- [x] 調整 `openspec-conventions` 規格包括 `AGENTS.md` 在專案結構中

## 5. 驗證
- [x] `pnpm test`
