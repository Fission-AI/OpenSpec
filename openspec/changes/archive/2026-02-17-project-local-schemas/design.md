## 情境

OpenSpec 目前從兩個位置解析架構：
1. 用戶覆蓋： `~/.local/share/openspec/schemas/<name>/`
2. 包內建： `<npm-package>/schemas/<name>/`

此變更新增了第三個最高優先權：專案本地架構 `./openspec/schemas/<name>/`.

解析器的功能在 `src/core/artifact-graph/resolver.ts` 目前不採取 `projectRoot` 參數，因為使用者和包路徑是絕對路徑。為了支援專案本地模式，我們需要將專案根上下文傳遞到解析器中。

## 目標/非目標

**目標：**
- 啟用版本控制的自訂工作流程架構
- 允許團隊透過 git 共享架構，無需每台機器進行設置
- 保持與現有解析器的向後相容性API
- 整合於 `config.yaml`的 `schema` 字段（來自項目設定更改）

**非目標：**
- 模式繼承或 `extends` 關鍵字
- 模板級覆蓋（部分分叉）
- 架構管理 CLI 指令（`openspec schema copy/which/diff/reset`)
- 驗證專案本機模式名稱與內建模式名稱不衝突（陰影是有意的）

## 決定

### 決定 1：新增可選 `projectRoot` 解析器函數的參數

**選擇：** 新增可選 `projectRoot?: string` 解析器函數的參數而不是使用 `process.cwd()` internally.

**考慮的替代方案：**
- 使用 `process.cwd()` 內部：較簡單 API 但隱式，難以測試，與現有程式碼庫模式不匹配
- 建立單獨的項目感知函數：沒有重大更改，但尷尬 API，呼叫者必須撰寫

**基本原理：** 程式碼庫已經遵循一種模式，其中 CLI 命令透過以下方式取得專案根目錄 `process.cwd()` 並將其傳遞給需要它的函數。新增可選參數可以保持向後相容性，同時啟用明確的、可測試的行為。

**受影響的功能：**
```typescript
getSchemaDir(name: string, projectRoot?: string): string | null
listSchemas(projectRoot?: string): string[]
listSchemasWithInfo(projectRoot?: string): SchemaInfo[]
resolveSchema(name: string, projectRoot?: string): SchemaYaml
```

### 決策2：解決順序是項目→使用者→包

**選擇：** 專案本地架構具有最高優先級，然後是使用者覆蓋，然後是打包內建程式。

**理由：**
- 專案在地化應該獲勝，因為它代表了團隊意圖（版本控制、共享）
- 用戶覆蓋對於個人實驗仍然有用，而不影響團隊
- 包內建是後備預設值

```
1. ./openspec/schemas/<name>/              # Project-local (highest)
2. ~/.local/share/openspec/schemas/<name>/ # User override
3. <npm-package>/schemas/<name>/           # Package built-in (lowest)
```

### 決策 3：添加 `getProjectSchemasDir()` 輔助函數

**選擇：** 建立一個專用函數來取得專案模式目錄路徑。

```typescript
function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'schemas');
}
```

**基本原理：** 將現有模式與 `getPackageSchemasDir()` 和 `getUserSchemasDir()`。保持路徑邏輯集中。

### 決定 4：延長 `SchemaInfo.source` 包括 `'project'`

**選擇：** 更新來源類型 `'package' | 'user'` 到 `'project' | 'user' | 'package'`.

**理由：** 消費者需要區分專案本地模式以用於顯示目的（例如， `schemasCommand` 輸出）。

### 決策 5：不對模式名稱衝突進行特殊處理

**選擇：** 如果專案本地模式與內建模式具有相同的名稱（例如， `spec-driven`），項目本地版本獲勝。沒有警告，沒有錯誤。

**理由：** 這是故意的陰影。團隊可能希望自訂內建架構，同時保留相同的名稱以方便熟悉。

## 風險/權衡

### 風險：專案架構陰影內建時會造成混亂
一個團隊可以創造 `openspec/schemas/spec-driven/` 這會遮蔽內建功能，當有人期望預設行為時會造成混亂。

**緩解措施：** `openspec schemas` 命令顯示每個模式的來源。用戶可以看到 `spec-driven (project)` 與 `spec-driven (package)`.

### 風險：缺少projectRoot參數
如果來電者忘記轉接電話 `projectRoot`，將找不到專案本地架構。

**減輕：**
- 逐步進行更改，更新需要專案本地支援的呼叫站點
- 現有行為（僅用戶+套件）將保留 `projectRoot` 未定義

### 權衡：可選參數與必要參數
製作 `projectRoot` 可選保持向後相容性，但意味著某些程式碼路徑可能會默默地跳過專案本地解析。

**接受：** 向後相容性更重要。主要入口點（CLI 命令）將始終通過 `projectRoot`.

## 實施方式

1. **更新 `resolver.ts`:**
   - 添加 `getProjectSchemasDir(projectRoot: string)` 功能
   - 更新 `getSchemaDir()` 首先檢查項目本地 `projectRoot` 假如
   - 更新 `listSchemas()` 包括項目模式 `projectRoot` 假如
   - 更新 `listSchemasWithInfo()` 返回 `source: 'project'` 對於專案模式
   - 更新 `SchemaInfo` 鍵入要包含的內容 `'project'` 在源聯盟中

2. **更新 `artifact-workflow.ts`:**
   - 更新 `schemasCommand` 透過 `projectRoot` 並顯示來源標籤

3. **更新呼叫站點：**
   - 任何需要專案本地解析的現有程式碼都應該透過 `projectRoot`
   - `config.yaml` 模式解析已經可以存取 `projectRoot`
