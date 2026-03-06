# 實作任務（第 2 階段：基於 add-zod-validation 建置）

## 1. 命令執行
- [x] 1.1 建立src/commands/change.ts
- [x] 1.2 從 src/core/schemas/change.schema.ts 導入 ChangeSchema 和 DeltaSchema
- [x] 1.3 從 src/core/parsers/markdown-parser.ts 導入 markdown 解析器
- [x] 1.4 從 src/core/validation/validator.ts 導入 ChangeValidator
- [x] 1.5 從 src/core/converters/json-converter.ts 導入 JSON 轉換器
- [x] 1.6 使用現有轉換器實作具有 JSON 輸出的 show 子指令
- [x] 1.7 實作list子指令
- [x] 1.8 使用現有的 ChangeValidator 實作 validate 子指令
- [x] 1.9 新增 --requirements-only 過濾選項
- [x] 1.10 新增 --strict 模式支援（利用現有的驗證基礎設施）
- [x] 1.11 為驗證報告新增 --json 標誌

## 2.特定於更改的解析器擴展
- [x] 2.1 建立 src/core/parsers/change-parser.ts （擴充基礎 markdown 解析器）
- [x] 2.2 解析提案結構（原因、變化部分）
- [x] 2.3 提取ADDED/MODIFIED/REMOVED/RENAMED部分
- [x] 2.4 解析每個部分內的增量操作
- [x] 2.5 為變更解析器新增測試

## 3. 舊版相容性
- [x] 3.1 更新 src/core/list.ts 新增棄用通知
- [x] 3.2 確保現有的清單指令繼續運作
- [x] 3.3 新增針對已棄用指令使用的控制台警告

## 4. 整合
- [x] 4.1 在src/cli/index.ts註冊更改指令
- [ ] 4.2 為所有子指令新增整合測試
- [x] 4.3 測試 JSON 輸出是否有變化
- [x] 4.4 測試遺留相容性
- [x] 4.5 使用嚴格模式進行測試驗證
- [x] 4.6 更新%CLI幫助文件（在主說明中新增「change」指令，文件子指令：show、list、validate）