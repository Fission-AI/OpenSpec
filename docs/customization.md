# 客製化

OpenSpec 提供三個等級的客製化：

| 等級 | 它的作用 | 最適合 |
|-------|--------------|----------|
| **專案設定** | 設定預設值，注入上下文/規則 | 大多數球隊 |
| **自訂架構** | 定義您自己的工作流程工件 | 具有獨特流程的團隊 |
| **全域覆蓋** | 跨所有專案共享架構 | 進階用戶 |

---

## 專案設定

這 `openspec/config.yaml` 文件是為您的團隊客製化 OpenSpec 的最簡單方法。它可以讓您：

- **設定預設架構** - 跳過 `--schema` 在每個命令上
- **注入專案上下文** - AI 可以看到您的技術堆疊、約定等。
- **新增每個工件規則** - 針對特定工件的自訂規則

### 快速設定

```bash
openspec init
```

這將引導您以互動方式建立設定。或手動建立一個：

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
```

### 它是如何運作的

**預設架構：**

```bash
# Without config
openspec new change my-feature --schema spec-driven

# With config - schema is automatic
openspec new change my-feature
```

**上下文與規則注入：**

產生任何工件時，您的上下文和規則將被注入到 AI 提示中：

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
...
</context>

<rules>
- Include rollback plan
- Identify affected teams
</rules>

<template>
[Schema's built-in template]
</template>
```

- **上下文**出現在所有工件中
- **規則** 僅針對符合的工件出現

### 模式解析順序

當 OpenSpec 需要架構時，它會依照以下順序檢查：

1. CLI 標誌： `--schema <name>`
2. 更改元資料（`.openspec.yaml` 在更改資料夾中）
3. 項目設定（`openspec/config.yaml`)
4. 預設 (`spec-driven`)

---

## 自訂模式

當專案設定不夠時，可以使用完全自訂的工作流程來建立自己的架構。自訂模式存在於您的專案中 `openspec/schemas/` 目錄並由您的程式碼進行版本控制。

```text
your-project/
├── openspec/
│   ├── config.yaml        # Project config
│   ├── schemas/           # Custom schemas live here
│   │   └── my-workflow/
│   │       ├── schema.yaml
│   │       └── templates/
│   └── changes/           # Your changes
└── src/
```

### 分叉現有架構

最快的自訂方法是分叉內建模式：

```bash
openspec schema fork spec-driven my-workflow
```

這會複製整個 `spec-driven` 架構到 `openspec/schemas/my-workflow/` 您可以在其中自由編輯它。

**你得到什麼：**

```text
openspec/schemas/my-workflow/
├── schema.yaml           # Workflow definition
└── templates/
    ├── proposal.md       # Template for proposal artifact
    ├── spec.md           # Template for specs
    ├── design.md         # Template for design
    └── tasks.md          # Template for tasks
```

現在編輯 `schema.yaml` 變更工作流程，或編輯範本以變更 AI 產生的內容。

### 從頭開始建立架構

對於全新的工作流程：

```bash
# Interactive
openspec schema init research-first

# Non-interactive
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

### 模式結構

架構定義了工作流程中的工件以及它們如何相互依賴：

```yaml
# openspec/schemas/my-workflow/schema.yaml
name: my-workflow
version: 1
description: My team's custom workflow

artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal document
    template: proposal.md
    instruction: |
      Create a proposal that explains WHY this change is needed.
      Focus on the problem, not the solution.
    requires: []

  - id: design
    generates: design.md
    description: Technical design
    template: design.md
    instruction: |
      Create a design document explaining HOW to implement.
    requires:
      - proposal    # Can't create design until proposal exists

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires:
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

**關鍵字段：**

| 場地 | 目的 |
|-------|---------|
| `id` | 唯一標識符，用於命令和規則 |
| `generates` | 輸出檔名（支援像 `specs/**/*.md`) |
| `template` | 模板檔案位於 `templates/` 目錄 |
| `instruction` | 建立此工件的 AI 指令 |
| `requires` | 依賴關係 - 哪些工件必須先存在 |

### 範本

模板是指導 AI 的 Markdown 文件。建立該工件時，它們會被注入到提示中。

```markdown
<!-- templates/proposal.md -->
## Why

<!-- Explain the motivation for this change. What problem does this solve? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities or modifications. -->

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

模板可以包括：
- AI 應填寫的節標題
- 帶有 AI 指導的 HTML 註釋
- 顯示預期結構的範例格式

### 驗證您的架構

在使用自訂架構之前，請先驗證它：

```bash
openspec schema validate my-workflow
```

這會檢查：
- `schema.yaml` 語法正確
- 所有引用的模板都存在
- 無循環依賴
- 工件 ID 有效

### 使用您的自訂架構

建立後，將您的架構用於：

```bash
# Specify on command
openspec new change feature --schema my-workflow

# Or set as default in config.yaml
schema: my-workflow
```

### 偵錯模式解析

不確定正在使用哪個架構？檢查：

```bash
# See where a specific schema resolves from
openspec schema which my-workflow

# List all available schemas
openspec schema which --all
```

輸出顯示它是來自您的專案、使用者目錄還是套件：

```text
Schema: my-workflow
Source: project
Path: /path/to/project/openspec/schemas/my-workflow
```

---

> **注意：** OpenSpec 也支援用戶級架構 `~/.local/share/openspec/schemas/` 用於跨專案共享，但專案級架構 `openspec/schemas/` 建議使用它們，因為它們是由您的程式碼進行版本控制的。

---

## 範例

### Rapid Iteration Workflow

用於快速迭代的最小工作流程：

```yaml
# openspec/schemas/rapid/schema.yaml
name: rapid
version: 1
description: Fast iteration with minimal overhead

artifacts:
  - id: proposal
    generates: proposal.md
    description: Quick proposal
    template: proposal.md
    instruction: |
      Create a brief proposal for this change.
      Focus on what and why, skip detailed specs.
    requires: []

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires: [proposal]

apply:
  requires: [tasks]
  tracks: tasks.md
```

### 新增評論工件

分叉預設值並新增審核步驟：

```bash
openspec schema fork spec-driven with-review
```

然後編輯 `schema.yaml` 添加：

```yaml
  - id: review
    generates: review.md
    description: Pre-implementation review checklist
    template: review.md
    instruction: |
      Create a review checklist based on the design.
      Include security, performance, and testing considerations.
    requires:
      - design

  - id: tasks
    # ... existing tasks config ...
    requires:
      - specs
      - design
      - review    # Now tasks require review too
```

---

## 參見

- [CLI 參考：架構指令](cli.md#schema-commands) - 完整的命令文檔
