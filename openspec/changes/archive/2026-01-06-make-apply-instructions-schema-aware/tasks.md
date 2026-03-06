## 先決條件

- [x] 0.1 實施 `add-per-change-schema-metadata` 首先（自動偵測模式）

## 1. 模式格式

- [x] 1.1 添加 `ApplyPhaseSchema` Zod 架構為 `src/core/artifact-graph/types.ts`
- [x] 1.2 更新 `SchemaYamlSchema` 包括可選的 `apply` 場地
- [x] 1.3 出口 `ApplyPhase` 類型

## 2. 更新現有架構

- [x] 2.1 添加 `apply` 阻止到 `schemas/spec-driven/schema.yaml`
- [x] 2.2 添加 `apply` 阻止到 `schemas/tdd/schema.yaml`

## 3. 重構generateApplyInstructions

- [x] 3.1 載入模式透過 `resolveSchema(schemaName)`
- [x] 3.2 讀取 `apply.requires` 確定所需的工件
- [x] 3.3 動態檢查工件是否存在（不是硬式編碼路徑）
- [x] 3.4 使用 `apply.tracks` 用於進度追蹤（如果為空則跳過）
- [x] 3.5 使用 `apply.instruction` 對於說明文本
- [x] 3.6 構建 `contextFiles` 來自架構中所有現有的工件

## 4. 處理回退

- [x] 4.1 如果 schema 沒有 `apply` 阻止，要求所有工件都存在
- [x] 4.2 預設指令：“所有工件均已完成。繼續實施。”

## 5. 測試

- [x] 5.1 使用規範驅動模式測試應用指令
- [x] 5.2 使用 tdd 模式測試應用指令
- [x] 5.3 當 schema 沒有 apply 區塊時測試回退
- [x] 5.4 缺少所需工件時測試阻塞狀態
