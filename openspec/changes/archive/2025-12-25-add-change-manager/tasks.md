## 第一階段：實施名稱驗證

- [x] 1.1 建立 `src/utils/change-utils.ts`
- [x] 1.2 實施 `validateChangeName()` with kebab-case pattern
- [x] 1.3 模式： `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- [x] 1.4 返回 `{ valid: boolean; error?: string }`
- [x] 1.5 新增測試：接受有效名稱（`add-auth`, `refactor`, `add-feature-2`)
- [x] 1.6 新增測試：大寫拒絕
- [x] 1.7 新增測試：空格被拒絕
- [x] 1.8 增加測試：底線拒絕
- [x] 1.9 增加測試：特殊字元拒絕
- [x] 1.10 新增測試：拒絕前導/尾隨連字符
- [x] 1.11 增加測試：拒絕連續連字符

## 第二階段：實施變革創造

- [x] 2.1 實施 `createChange(projectRoot, name)`
- [x] 2.2 建立前驗證名稱
- [x] 2.3 如果需要的話建立父目錄（`openspec/changes/`)
- [x] 2.4 如果更改已經存在則拋出
- [x] 2.5 新增測試：建立目錄
- [x] 2.6 新增測試：重複更改拋出錯誤
- [x] 2.7 新增測試：無效名稱拋出驗證錯誤
- [x] 2.8 新增測試：如果需要，建立父目錄

## 第三階段：整合

- [x] 3.1 導出函數 `src/utils/index.ts`
- [x] 3.2 新增JSDoc註釋
- [x] 3.3 執行所有測試以驗證沒有回歸
