# 實施任務（基礎階段）

## 1. 核心模式
- [x] 1.1 在package.json中加入zod依賴
- [x] 1.2 使用 ScenarioSchema 和 RequirementSchema 建立 src/core/schemas/base.schema.ts
- [x] 1.3 使用SpecSchema建立src/core/schemas/spec.schema.ts
- [x] 1.4 使用 DeltaSchema 和 ChangeSchema 建立 src/core/schemas/change.schema.ts
- [x] 1.5 建立src/core/schemas/index.ts匯出所有schema

## 2. 解析器實作
- [x] 2.1 建立src/core/parsers/markdown-parser.ts
- [x] 2.2 實作標題提取（##、###、####）
- [x] 2.3 實現標題之間的內容捕獲
- [x] 2.4 新增解析器邊緣情況的測試

## 3. 驗證基礎設施
- [x] 3.1 建立 src/core/validation/types.ts，其中包含 ValidationLevel、ValidationIssue、ValidationReport 類型
- [x] 3.2 建立具有驗證規則和閾值的 src/core/validation/constants.ts
- [x] 3.3 使用SpecValidator和ChangeValidator類別建立src/core/validation/validator.ts

## 4. 增強的驗證規則
- [x] 4.1 新增RequirementValidation細化（必須有場景，必須包含SHALL）
- [x] 4.2 加入SpecValidation細化（必須有要求）
- [x] 4.3 加入ChangeValidation細化（必須有增量，為什麼部分長度）
- [x] 4.4 為每個規則實作自訂錯誤訊息

## 5.JSON轉換器
- [x] 5.1 建立 src/core/converters/json-converter.ts
- [x] 5.2 實現規範到JSON的轉換
- [x] 5.3 實施更改為-JSON轉換
- [x] 5.4 Add metadata fields (version, format, sourcePath)

## 6. 存檔命令增強
- [x] 6.1 使用新驗證器新增預存檔驗證檢查
- [x] 6.2 新增 --no-validate 標誌以及所需的確認提示和警告訊息：“⚠️ 警告：跳過驗證可能會存檔無效規格。繼續？（y/N）”
- [x] 6.3 中止前顯示驗證錯誤
- [x] 6.4 將所有 --no-validate 使用情況記錄到控制台，並包含時間戳記和受影響的文件
- [x] 6.5 新增驗證場景的測試，包括 --no-validate 確認流程

## 7. Diff命令增強
- [x] 7.1 使用新驗證器在 diff 之前新增驗證檢查
- [x] 7.2 顯示驗證警告（非阻塞）
- [x] 7.3 Continue with diff even if warnings present

## 8. 測試
- [x] 8.1 所有模式的單元測試
- [x] 8.2 解析器的單元測試
- [x] 8.3 驗證規則的單元測試
- [x] 8.4 驗證報告的整合測試
- [x] 8.5 測試各種無效的規範/更改格式
- [x] 8.6 測試嚴格模式行為
- [x] 8.7 測試預歸檔驗證
- [x] 8.8 測試驗證報告JSON輸出

## 9. 文件
- [x] 9.1 文件模式結構與驗證規則（openspec/VALIDATION.md）
- [x] 9.2 更新 CLI 存檔幫助（文檔 --no-validate 標誌及其警告）
- [x] 9.3 更新 CLI diff 幫助（文件驗證警告行為）
- [x] 9.4 為未來的指令整合建立遷移指南（openspec/MIGRATION.md）