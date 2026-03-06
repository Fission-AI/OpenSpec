# 任務：統一變更狀態模型

## 第 1 階段：修復工件工作流程發現

- [x] 更新 `validateChangeExists()` 在 `artifact-workflow.ts` 檢查目錄是否存在而不是使用 `getActiveChangeIds()`
- [x] 更新錯誤訊息以列出所有更改目錄（而不僅僅是那些包含proposal.md的目錄）
- [x] 添加測試 `openspec status --change <scaffolded-change>`
- [x] 添加測試 `openspec next --change <scaffolded-change>`
- [x] 添加測試 `openspec instructions proposal --change <scaffolded-change>`

## 第 2 階段：修復視圖指令

- [x] 更新 `getChangesData()` 在 `view.ts` 回傳三個類別：草稿、活動、完成
- [x] 修復完成邏輯： `total === 0` → 草稿，未完成
- [x] 將“草稿變更”部分新增至儀表板渲染中
- [x] 更新摘要以包括草稿計數
- [x] 新增草稿變更在檢視中正確顯示的測試

## 第三階段：清理和驗證

- [x] 清理測試更改（`test-workflow`, `test-workflow-2`)
- [x] 執行完整的測試套件
- [x] 手動測試： `openspec new change foo && openspec status --change foo`
- [x] 手動測試： `openspec new change foo && openspec view` 在草稿中顯示 foo
- [x] 驗證與 `openspec validate unify-change-state-model --strict`
