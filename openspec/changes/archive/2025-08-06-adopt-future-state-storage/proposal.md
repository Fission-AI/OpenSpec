# 採用未來狀態儲存進行 OpenSpec 的更改

## 為什麼

目前將規範變更儲存為 diff 檔案的方法（`.spec.md.diff`）給人類和人工智慧帶來摩擦。差異語法與 `+` 和 `-` 前綴使規格難以閱讀，AI 工具在理解未來狀態時難以適應格式，並且 GitHub 無法顯示不同資料夾中當前規格和建議規格之間的良好比較。

## 有什麼變化

- 更改儲存差異（`patches/[capability]/spec.md.diff`）來儲存完整的未來狀態（`specs/[capability]/spec.md`)
- 更新所有文件以反映新的儲存格式
- 遷移現有的 `add-init-command` 更改為新格式
- 新增新的 `openspec-conventions` 記錄這些約定的能力



## 影響

- 受影響的規格：新 `openspec-conventions` 能力
- 受影響的代碼： 
  - openspec/README.md（第 85-108 行）
  - docs/PRD.md（第 376-382、778-783 行）
  - docs/openspec-walkthrough.md（第 58-62、112-126 行）
  - openspec/changes/add-init-command/ （需要遷移）

