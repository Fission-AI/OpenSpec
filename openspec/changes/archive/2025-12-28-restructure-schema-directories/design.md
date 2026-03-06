## 情境

內建架構目前嵌入為 TypeScript 物件：

```typescript
// src/core/artifact-graph/builtin-schemas.ts
export const SPEC_DRIVEN_SCHEMA: SchemaYaml = {
  name: 'spec-driven',
  version: 1,
  artifacts: [...]
};
```

這不支援與架構位於相同位置的模板。指令載入器（Slice 3）需要模板，最乾淨的方法是獨立的模式目錄。

## 目標/非目標

**目標：**
- 模式作為獨立目錄（schema.yaml + templates/）
- 使用者透過 XDG 資料目錄覆蓋
- 簡單的2級解析（用戶→套件）
- 模板與其架構位於相同位置

**非目標：**
- 共享模板後備（有意避免複雜性）
- 執行時模式編譯
- 模式繼承

## 決定

### 1.目錄結構

每個模式都是一個包含以下內容的目錄 `schema.yaml` 和 `templates/`:

```
<package>/schemas/
├── spec-driven/
│   ├── schema.yaml
│   └── templates/
│       ├── proposal.md
│       ├── design.md
│       ├── spec.md
│       └── tasks.md
└── tdd/
    ├── schema.yaml
    └── templates/
        ├── spec.md
        ├── test.md
        ├── implementation.md
        └── docs.md
```

**為什麼：** 像 Helm 圖表一樣獨立。沒有跨模式依賴。每個模式都有其模板。

### 2. 決議順序（2級）

```
1. ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml   # User override
2. <package>/schemas/<name>/schema.yaml                    # Built-in
3. Error (not found)
```

**為什麼：** 簡單的心理模型。使用者可以覆蓋整個模式目錄或僅部分目錄。

### 3. schema.yaml中的模板路徑

這 `template` 字段是相對於模式的 `templates/` 目錄：

```yaml
# schemas/spec-driven/schema.yaml
artifacts:
  - id: proposal
    template: "proposal.md"  # → schemas/spec-driven/templates/proposal.md
```

**為什麼：** 路徑是相對於架構的，而不是全域範本目錄。

### 4.透過import.meta.url解析套件目錄

```typescript
function getPackageSchemasDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // Navigate from src/core/artifact-graph/ to package root
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas');
}
```

**為什麼：** 適用於 ESM。没有硬编码路径。

### 5.保持schema.yaml格式不變

YAML 格式保持不變 - 只是儲存位置變更：

```yaml
name: spec-driven
version: 1
description: Specification-driven development
artifacts:
  - id: proposal
    generates: "proposal.md"
    template: "proposal.md"
    requires: []
```

**原因：** 模式格式沒有重大變更。只是從 TS 移動到 YAML 檔案。

## 遷移

1. 創造 `schemas/` 包根目錄
2. 轉變 `SPEC_DRIVEN_SCHEMA` 到 `schemas/spec-driven/schema.yaml`
3. 轉變 `TDD_SCHEMA` 到 `schemas/tdd/schema.yaml`
4. 更新 `resolveSchema()` 從目錄載入
5. 消除 `builtin-schemas.ts`
6. 更新 `listSchemas()` 掃描目錄

## 風險/權衡

**執行時的檔案I/O：**
- 以前模式是記憶體中的對象
- 現在需要讀取 YAML 文件
- 緩解措施：模式很小，每次操作載入一次

**包裝分發：**
- 必須保證 `schemas/` 目錄包含在 npm 包中
- 添加 `files` 在 package.json 中

## 開放式問題

None.
