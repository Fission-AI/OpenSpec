## 為什麼

這 `generateApplyInstructions` 函數被硬編碼以檢查 `spec-driven` 文物（`proposal.md`, `specs/`, `design.md`, `tasks.md`）。如果使用者選擇不同的模式，例如 `tdd`，應用指令毫無意義 - 它們檢查該架構中不存在的檔案。

這會阻止實驗工作流程正確支援多個模式。

## 有什麼變化

**Scope: Experimental artifact workflow** (`openspec instructions apply`)

**取決於：** `add-per-change-schema-metadata` (to know which schema a change uses)

- 製作 `generateApplyInstructions` 從架構讀取工件定義
- 根據模式動態決定存在哪些工件
- 定義變更何時「可實施」（請參閱下方的設計決策）
- 產生適合架構的上下文檔案和說明

## 設計決策：什麼時候可以實施變更？

這是關鍵問題。不同的方法：

### 選項 A：顯式 `apply` 模式中的工件

新增一個欄位來標記哪個工件是「實現門」：

```yaml
artifacts:
  - id: tasks
    generates: tasks.md
    apply: true  # ← This artifact triggers apply mode
```

**優點：** 明確、靈活
**缺點：**需要維護另一個字段，如果有多個工件怎麼辦 `apply: true`?

### 選項 B：葉子工件是可實現的

沒有依賴項（沒有任何東西依賴它們）的工件是應用目標。

- `spec-driven`: `tasks` 是葉子 → apply = 執行任務
- `tdd`: `docs` 是一片葉子 → 但這對 TDD 來說沒有意義...

**優點：** 沒有額外的模式字段，源自圖表
**缺點：** 與 TDD 語意不符（實作是操作，而不是文件）

### 選項 C：模式級別 `apply_phase` 定義

將頂級字段添加到架構中：

```yaml
name: spec-driven
apply_phase:
  requires: [tasks]  # Must exist before apply
  tracks: tasks.md   # File with checkboxes to track
  instruction: "Work through tasks, mark complete as you go"
```

```yaml
name: tdd
apply_phase:
  requires: [tests]  # Must have tests before implementing
  tracks: null       # No checkbox tracking - just make tests pass
  instruction: "Run tests, implement until green, refactor"
```

**優點：** 完全的彈性，模式控制自己的應用語意
**缺點：**更複雜的模式格式

### 選項 D：基於約定（工件 ID 匹配）

如果工件 ID 是 `tasks` 或者 `implementation`，這是應用目標。

**優點：** 簡單，無需更改架構
**缺點：** 脆弱，不適用於自訂模式

### 選項 E：所有工件均已完成 → 應用程式可用

當所有架構工件都存在時，應用變得可用。實施是使用者在規劃後所做的任何事情。

**優點：** 簡單，無需更改架構
**缺點：** 不指導「應用」對於不同工作流程的意義

---

## 決定：添加 `apply` 塊到 schema.yaml

添加頂級 `apply` 字段到架構定義：

```yaml
name: spec-driven
version: 1
description: Default OpenSpec workflow

artifacts:
  # ... existing artifacts ...

apply:
  requires: [tasks]           # Artifacts that must exist before apply
  tracks: tasks.md            # File with checkboxes for progress (optional)
  instruction: |              # Guidance shown to agent
    Read context files, work through pending tasks, mark complete as you go.
    Pause if you hit blockers or need clarification.
```

```yaml
name: tdd
version: 1
description: Test-driven development workflow

artifacts:
  # ... existing artifacts ...

apply:
  requires: [tests]           # Must have tests before implementing
  tracks: null                # No checkbox tracking
  instruction: |
    Run tests to see failures. Implement minimal code to pass each test.
    Refactor while keeping tests green.
```

**關鍵屬性：**
- `requires`：在 apply 可用之前必須存在的工件 ID 陣列
- `tracks`：帶有核取方塊的檔案路徑（相對於更改目錄），或者 `null` 如果沒有追蹤
- `instruction`：應用階段的自訂指導

**後備行為：** 沒有模式 `apply` 區塊預設為“所有工件必須存在”

## 能力

### 修改後的功能
- `cli-artifact-workflow`：應用指令變得具有架構意識

## 影響

- **受影響的代碼**： `src/commands/artifact-workflow.ts` （生成ApplyInstructions）
- **架構格式**：可能需要新的 `apply_phase` 場地
- **現有模式**：需要新增 apply_phase 到 `spec-driven` 和 `tdd`
- **向後相容**：沒有 apply_phase 的模式可以使用預設行為
