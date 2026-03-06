# 實作任務（第 3 階段：基於 add-zod-validation 和 add-change-commands 建置）

## 1. 命令執行
- [x] 1.1 建立src/commands/spec.ts
- [x] 1.2 從 src/core/schemas/ 導入 RequirementSchema、ScenarioSchema、SpecSchema
- [x] 1.3 從 src/core/parsers/markdown-parser.ts 導入 markdown 解析器
- [x] 1.4 從 src/core/validation/validator.ts 匯入 SpecValidator
- [x] 1.5 從 src/core/converters/json-converter.ts 導入 JSON 轉換器
- [x] 1.6 使用現有轉換器實作具有 JSON 輸出的 show 子指令
- [x] 1.7 實作list子指令
- [x] 1.8 使用現有 SpecValidator 實作 validate 子指令
- [x] 1.9 新增過濾選項（--requirements、--no-scenarios、-r）
- [x] 1.10 新增 --strict 模式支援（利用現有的驗證基礎設施）
- [x] 1.11 為驗證報告新增 --json 標誌

## 2. 整合
- [x] 2.1 在src/cli/index.ts註冊spec指令
- [x] 2.2 為所有子指令新增整合測試
- [x] 2.3 測試JSON輸出驗證
- [x] 2.4 測試過濾選項
- [x] 2.5 使用嚴格模式進行測試驗證
- [x] 2.6 更新%CLI幫助文件（在主幫助中新增'spec'指令，文件子指令：show、list、validate）