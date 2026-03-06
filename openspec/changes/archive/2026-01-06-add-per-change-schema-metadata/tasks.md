## 1. Zod 架構和型別

- [x] 1.1 添加 `ChangeMetadataSchema` Zod 架構為 `src/core/artifact-graph/types.ts`
- [x] 1.2 出口 `ChangeMetadata` 從模式推斷的類型

## 2. 核心元資料功能

- [x] 2.1 建立 `src/utils/change-metadata.ts` 和 `writeChangeMetadata()` 功能
- [x] 2.2 添加 `readChangeMetadata()` 帶 Zod 驗證的函數
- [x] 2.3 更新 `createChange()` 接受可選的 `schema` 參數並寫入元資料

## 3. 指令載入器自動偵測

- [x] 3.1 修改 `loadChangeContext()` 從中讀取架構 `.openspec.yaml`
- [x] 3.2 製作 `schemaName` 參數可選（回退到元資料，然後是預設值）

## 4.CLI更新

- [x] 4.1 添加 `--schema <name>` 選項 `openspec new change` 命令
- [x] 4.2 驗證現有命令（`status`, `instructions`) 與自動檢測一起使用

## 5. 測試

- [x] 5.1 測試 `ChangeMetadataSchema` 正確驗證（有效/無效情況）
- [x] 5.2 測試 `writeChangeMetadata()` 創造有效的YAML
- [x] 5.3 測試 `readChangeMetadata()` 解析和驗證模式
- [x] 5.4 測試 `loadChangeContext()` 從元資料自動檢測模式
- [x] 5.5 當不存在元資料時測試回退到預設值
- [x] 5.6 測試 `--schema` 標誌覆蓋元資料
