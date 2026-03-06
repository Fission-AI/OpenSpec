## 1. 建立架構目錄

- [ ] 1.1 建立 `schemas/` 包根目錄
- [ ] 1.2 建立 `schemas/spec-driven/schema.yaml` 從 `SPEC_DRIVEN_SCHEMA`
- [ ] 1.3 建立 `schemas/spec-driven/templates/` 帶有佔位符模板
- [ ] 1.4 建立 `schemas/tdd/schema.yaml` 從 `TDD_SCHEMA`
- [ ] 1.5 建立 `schemas/tdd/templates/` 帶有佔位符模板

## 2. 更新架構解析

- [ ] 2.1 添加 `getPackageSchemasDir()` 函數使用 `import.meta.url`
- [ ] 2.2 添加 `getSchemaDir(name)` 解析模式目錄路徑
- [ ] 2.3 更新 `resolveSchema()` 從目錄結構加載
- [ ] 2.4 更新 `listSchemas()` 掃描目錄而不是物件鍵
- [ ] 2.5 新增用戶覆蓋解析測試
- [ ] 2.6 新增內建回退測試

## 3. 清理

- [ ] 3.1 刪除 `builtin-schemas.ts`
- [ ] 3.2 更新 `index.ts` 出口（刪除 `BUILTIN_SCHEMAS`, `SPEC_DRIVEN_SCHEMA`, `TDD_SCHEMA`)
- [ ] 3.3 更新匯入已刪除匯出的所有程式碼

## 4. 包分發

- [ ] 4.1 添加 `schemas/` 到 `files` 數組中 `package.json`
- [ ] 4.2 驗證架構是否包含在建置的套件中

## 5.修復模板路徑

- [ ] 5.1 更新 `template` schema.yaml 檔案中的欄位（刪除 `templates/` 前綴）
- [ ] 5.2 確保範本路徑相對於模式的範本目錄
