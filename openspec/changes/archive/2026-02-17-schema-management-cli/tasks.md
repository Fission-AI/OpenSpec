## 1. 設定和命令結構

- [x] 1.1 建立 `src/commands/schema.ts` 和 `registerSchemaCommand(program: Command)` 功能
- [x] 1.2 註冊schema指令 `src/cli/index.ts` （導入並調用 `registerSchemaCommand`)
- [x] 1.3 新增架構命令組，描述為：“管理工作流程架構”

## 2. 架構哪個命令

- [x] 2.1 添加 `schema which <name>` 子命令與 `--json` 和 `--all` 選項
- [x] 2.2 使用實作解析查找 `getSchemaDir()` 與專案根
- [x] 2.3 透過檢查所有三個位置（項目、使用者、套件）來實現陰影偵測
- [x] 2.4 新增文字輸出：顯示來源、路徑和陰影訊息
- [x] 2.5 添加JSON輸出： `{ name, source, path, shadows: [] }`
- [x] 2.6 添加 `--all` 列出所有模式及其解析來源的模式

## 3. 模式驗證命令

- [x] 3.1 添加 `schema validate [name]` 子命令與 `--json` 和 `--verbose` 選項
- [x] 3.2 使用現有的實作單模式驗證 `parseSchema()` 從 `schema.ts`
- [x] 3.3 為每個工件的範本檔案新增範本存在檢查
- [x] 3.4 新增依賴圖循環偵測（複用拓樸排序邏輯）
- [x] 3.5 未提供名稱時新增 validate-all 模式（掃描 `openspec/schemas/`)
- [x] 3.6 新增帶有通過/失敗指示器和錯誤訊息的文字輸出
- [x] 3.7 增加與現有匹配的JSON輸出 `openspec validate` 格式： `{ valid, issues: [] }`
- [x] 3.8 新增詳細模式顯示每個驗證步驟

## 4. 模式分叉指令

- [x] 4.1 添加 `schema fork <source> [name]` 子命令與 `--json` 和 `--force` 選項
- [x] 4.2 使用實作來源解析 `getSchemaDir()` 與專案根
- [x] 4.3 實作預設目的地命名： `<source>-custom`
- [x] 4.4 用遞歸檔案複製實作目錄複製
- [x] 4.5 更新 `name` 複製的字段 `schema.yaml`
- [x] 4.6 新增覆蓋保護：檢查目的地是否存在，要求 `--force` 或確認
- [x] 4.7 新增帶有來源/目標路徑的文字輸出
- [x] 4.8 添加JSON輸出： `{ forked, source, destination, sourceLocation }`

## 5. 模式初始化命令

- [x] 5.1 添加 `schema init <name>` 子命令與 `--json`, `--description`, `--artifacts`, `--default`, `--no-default`, `--force` 選項
- [x] 5.2 實作模式名稱驗證（短橫線大小寫，無空格）
- [x] 5.3 使用以下方法實現描述的互動式提示 `@inquirer/prompts`
- [x] 5.4 實現帶有描述的互動式工件選擇（多選）
- [x] 5.5 建立模式目錄和 `schema.yaml` 與選定的設定
- [x] 5.6 為選定的工件建立預設範本文件
- [x] 5.7 添加 `--default` 要更新的標誌 `openspec/config.yaml` with new schema as default
- [x] 5.8 新增覆蓋保護：檢查schema是否存在，require `--force`
- [x] 5.9 新增帶有建立路徑和後續步驟的文字輸出
- [x] 5.10 添加JSON輸出： `{ created, path, schema }`
- [x] 5.11 新增非互動模式 `--description` 和 `--artifacts` 旗幟

## 6. 測試

- [x] 6.1 新增單元測試 `schema which` 命令輸入 `test/commands/schema.test.ts`
- [x] 6.2 新增單元測試 `schema validate` 命令
- [x] 6.3 新增單元測試 `schema fork` 命令
- [x] 6.4 新增單元測試 `schema init` 命令
- [x] 6.5 測試互動模式模擬 `@inquirer/prompts`
- [x] 6.6 測試所有指令的JSON輸出格式
- [x] 6.7 測試錯誤狀況：名稱無效、未找到、已存在、循環偵測

## 7. 文件和潤色

- [x] 7.1 為所有 schema 子命令新增 CLI 幫助文本
- [x] 7.2 更新 shell 完成以包含模式命令
- [x] 7.3 執行 linting 並修復任何問題 (`npm run lint`)
- [x] 7.4 執行完整的測試套件（`npm test`)
