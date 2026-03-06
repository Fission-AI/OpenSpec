## 1.更新解析器類型和助手

- [x] 1.1 更新 `SchemaInfo.source` 鍵入要包含的內容 `'project'` 在 `src/core/artifact-graph/resolver.ts`
- [x] 1.2 添加 `getProjectSchemasDir(projectRoot: string): string` 功能

## 2.更新模式解析函數

- [x] 2.1 更新 `getSchemaDir(name, projectRoot?)` 提供projectRoot時首先檢查專案本地
- [x] 2.2 更新 `resolveSchema(name, projectRoot?)` 將projectRoot傳遞給getSchemaDir
- [x] 2.3 更新 `listSchemas(projectRoot?)` 包括專案本地模式
- [x] 2.4 更新 `listSchemasWithInfo(projectRoot?)` 包含項目模式 `source: 'project'`

## 3.更新CLI命令

- [x] 3.1 更新 `schemasCommand` 傳遞projectRoot並在輸出中顯示來源標籤

## 4. 更新呼叫站點

- [x] 4.1 檢查和更新需要專案本地架構支援以傳遞projectRoot的呼叫站點

## 5. 測試

- [x] 5.1 新增單元測試 `getProjectSchemasDir()`
- [x] 5.2 為專案本地模式解析優先權新增單元測試
- [x] 5.3 新增單元測試以實現向後相容性（無projectRoot = 僅使用者+套件）
- [x] 5.4 新增單元測試 `listSchemas()` 包含專案架構
- [x] 5.5 新增單元測試 `listSchemasWithInfo()` 和 `source: 'project'`
- [x] 5.6 新增與包含本地模式的臨時專案的整合測試
