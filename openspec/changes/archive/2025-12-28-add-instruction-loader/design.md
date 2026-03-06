## 情境

這是工件圖 POC 的切片 3。我們有：
- `ArtifactGraph` 具有圖形操作的類別（切片 1）
- `detectCompleted()` 用於基於檔案系統的狀態檢測（切片 1）
- `resolveSchema()` 用於 XDG 架構解析（切片 1）
- `createChange()` 和 `validateChangeName()` 實用程式（第 2 部分）

後 `restructure-schema-directories` 實現後，模式將是獨立的目錄：
```
schemas/<name>/
├── schema.yaml
└── templates/
    └── *.md
```

該提案在該結構之上添加了模板載入和指令豐富。

## 目標/非目標

**目標：**
- 從架構目錄載入模板
- 使用特定於變更的上下文（依賴狀態）豐富模板
- CLI 輸出的格式變更狀態

**非目標：**
- 模板創作 UI
- 動態模板編譯/執行
- 快取（像其他一樣保持無狀態）

## 決定

### 1. 純函數優於類

遵循中的模式 `resolver.ts` 和 `state.ts`。使用一個簡單的 `ChangeContext` 與純函數的介面：

```typescript
interface ChangeContext {
  changeName: string;
  changeDir: string;
  schemaName: string;
  graph: ArtifactGraph;
  completed: CompletedSet;
}

function loadChangeContext(projectRoot: string, changeName: string, schemaName?: string): ChangeContext
function loadTemplate(schemaName: string, templatePath: string): string
function getInstructions(artifactId: string, context: ChangeContext): string
function formatStatus(context: ChangeContext): string
```

**為什麼：** 符合現有的程式碼庫模式。更容易測試。無隱藏狀態。

### 2. schema目錄下的模板解析

模板是從架構載入的 `templates/` 子目錄：

```typescript
function loadTemplate(schemaName: string, templatePath: string): string {
  const schemaDir = getSchemaDir(schemaName);  // From resolver.ts
  const fullPath = path.join(schemaDir, 'templates', templatePath);
  return fs.readFileSync(fullPath, 'utf-8');
}
```

解析度由以下人員處理 `getSchemaDir()` 它已經檢查了用戶覆蓋範圍→內建包。

**為什麼：** 利用現有架構解析。模板與模式位於相同位置。

### 3. 工件定義的範本路徑

神器的 `template` 字段是相對於模式的路徑 `templates/` 目錄：

```yaml
artifacts:
  - id: proposal
    template: "proposal.md"  # → schemas/<schema>/templates/proposal.md
```

**為什麼：** 明確、簡單、沒有魔法。

### 4. 最少的上下文注入

模板是降價的。注入會在標頭部分前面加入上下文：

```markdown
---
change: add-auth
artifact: proposal
schema: spec-driven
output: openspec/changes/add-auth/proposal.md
---

## Dependencies
- [x] (none - this is a root artifact)

## Next Steps
After creating this artifact, you can work on: design, specs

---

[original template content...]
```

**為什麼：** 簡單的字串連接。沒有模板引擎依賴性。清晰分離。

### 5. 狀態輸出格式

```markdown
## Change: add-auth (spec-driven)

| Artifact | Status | Output |
|----------|--------|--------|
| proposal | done | proposal.md |
| specs | ready | specs/*.md |
| design | blocked (needs: proposal) | design.md |
| tasks | blocked (needs: specs, design) | tasks.md |
```

**為什麼：** Markdown 表格在終端機和文件中可讀。匹配 CLI 輸出樣式。

## 文件結構

```
src/core/artifact-graph/
├── index.ts              # Add new exports
├── template.ts           # NEW: Template loading
├── context.ts            # NEW: ChangeContext loading
└── instructions.ts       # NEW: Enrichment and formatting
```

## 風險/權衡

**對重組架構目錄的依賴：**
- 該提案要求首先進行架構重組
- 緩解措施：記錄清晰的依賴關係，依序實施

**沒有模板引擎：**
- 優點：零依賴，簡單的程式碼
- 缺點：表達能力有限
- 緩解措施：目前用例僅需要靜態模板+標頭注入

## 遷移計劃

N/A - 新功能，沒有現有要遷移的程式碼。

## 開放式問題

None.
