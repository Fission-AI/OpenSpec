## 為什麼

目前，內建架構作為 TypeScript 物件嵌入到 `builtin-schemas.ts`。這適用於架構，但不支援共置模板。為了啟用獨立的模式套件（模式+模板在一起），我們需要將模式重組為目錄。

## 有什麼變化

- **破壞（內部）：** 將內建模式從嵌入式 TS 物件移至實際目錄結構
- 模式成為包含以下內容的目錄 `schema.yaml` + `templates/`
- 更新 `resolveSchema()` 從目錄結構加載
- 消除 `builtin-schemas.ts` （以檔案為基礎的模式取代）
- 更新解析度以檢查使用者目錄 → 包目錄

## 影響

- 受影響的規格： `artifact-graph` （架構解析更改）
- 受影響的代碼：
  - 消除 `src/core/artifact-graph/builtin-schemas.ts`
  - 更新 `src/core/artifact-graph/resolver.ts`
  - 添加 `schemas/` 包根目錄
- 無外部 API 變化（分辨率仍返回 `SchemaYaml`)
