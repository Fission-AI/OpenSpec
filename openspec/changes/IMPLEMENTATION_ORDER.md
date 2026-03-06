# 實施順序和依賴性

## 所需的實施順序

由於依賴性，以下更改必須按此特定順序實施：

### 第一階段：基礎
**1. add-zod-validation**（無依賴項）
- 建立所有核心架構（RequirementSchema、ScenarioSchema、SpecSchema、ChangeSchema、DeltaSchema）
- 實作 Markdown 解析器實用程序
- 實施驗證基礎設施和規則
- 建立所有命令使用的驗證模式
- 必須先完成

### 第 2 階段：更改命令
**2. add-change-commands**（取決於：add-zod-validation）
- 從 zod 驗證導入 ChangeSchema 和 DeltaSchema
- 重複使用 Markdown 解析實用程式
- 透過內建驗證實現更改命令
- 使用驗證基礎結構進行更改 validate 子命令
- 在架構和驗證存在之前無法啟動

### 第 3 階段：規範命令
**3. add-spec-commands** （取決於：add-zod-validation、add-change-commands）
- 從 zod 驗證導入 RequirementSchema、ScenarioSchema、SpecSchema
- 重複使用 Markdown 解析實用程式
- 實作具有內建驗證的spec指令
- 使用規範驗證子命令的驗證基礎結構
- 基於更改命令建立的模式構建

## 依賴圖
```
add-zod-validation
    ↓
add-change-commands
    ↓
add-spec-commands
```

## 關鍵依賴項

### 共享程式碼依賴關係
1. **模式**：在 add-zod-validation 中建立的所有模式，由兩個命令實作使用
2. **驗證**：在 add-zod-validation 中建立的基礎設施，整合到兩個命令中
3. **解析器**：在 add-zod-validation 中建立的 Markdown 解析實用程序，由兩個命令使用

### 文件依賴關係
- `src/core/schemas/*.schema.ts` （由 add-zod-validation 建立）→ 由兩個指令導入
- `src/core/validation/validator.ts` （由 add-zod-validation 建立）→ 由兩個指令使用
- `src/core/parsers/markdown-parser.ts` （由 add-zod-validation 建立）→ 由兩個指令使用

## 實施說明

### 對於開發人員
1. 在進入下一階段之前完全完成每個階段
2. 每個階段後執行測試以確保穩定性
3. 遺產 `list` 命令在整個過程中保持功能

### 對於 CI/CD
1. 每個變更都可以獨立驗證
2. 整合測試應該在每個階段之後執行
3. 第三階段後需要進行完整的系統測試

### 並行工作機會
在每個階段中，可以並行完成以下操作：
- **階段 1**：模式設計、驗證規則和解析器實現
- **階段 2**：更改命令功能和舊版相容性工作
- **階段 3**：規範命令功能和最終集成