# 工作流程

本指南涵蓋了 OpenSpec 的常見工作流程模式以及何時使用每種模式。有關基本設置，請參閱 [入門](getting-started.md)。命令參考請參見 [命令](commands.md).

## 理念：行動，而非階段

傳統的工作流程迫使您經歷幾個階段：規劃、實施、最後完成。但真正的工作並不完全適合盒子。

OPSX 採用不同的方法：

```text
Traditional (phase-locked):

  PLANNING ────────► IMPLEMENTING ────────► DONE
      │                    │
      │   "Can't go back"  │
      └────────────────────┘

OPSX (fluid actions):

  proposal ──► specs ──► design ──► tasks ──► implement
```

**關鍵原則：**

- **行動，而不是階段** - 命令是你可以做的事情，而不是你陷入的階段
- **依賴關係是推動者** - 它們顯示什麼是可能的，而不是接下來需要什麼

> **自訂：** OPSX 工作流程由定義工件序列的模式驅動。看 [客製化](customization.md) 有關建立自訂架構的詳細資訊。

## 兩種模式

### 預設快速路徑 (`core` 輪廓）

新安裝預設為 `core`，它提供：
- `/opsx:propose`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`

典型流程：

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

### 擴展/完整工作流程（自訂選擇）

如果您想要顯式的腳手架和建置命令（`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`），啟用它們：

```bash
openspec config profile
openspec update
```

## 工作流程模式（擴充模式）

### 快速功能

當您知道要建立什麼並且只需要執行時：

```text
/opsx:new ──► /opsx:ff ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

**對話範例：**

```text
You: /opsx:new add-logout-button

AI:  Created openspec/changes/add-logout-button/
     Ready to create: proposal

You: /opsx:ff

AI:  Creating all planning artifacts...
     ✓ proposal.md
     ✓ specs/
     ✓ design.md
     ✓ tasks.md
     Ready for implementation!

You: /opsx:apply

AI:  Working through tasks...
     ✓ Added logout button to header
     ✓ Implemented session clearing
     ✓ Added confirmation dialog
     All tasks complete!

You: /opsx:archive

AI:  ✓ Merged specs
     ✓ Archived change
```

**最適合：** 中小型功能、錯誤修復、簡單更改。

### 探索性

當需求不明確或需要先調查時：

```text
/opsx:explore ──► /opsx:new ──► /opsx:continue ──► ... ──► /opsx:apply
```

**對話範例：**

```text
You: /opsx:explore

AI:  What would you like to explore?

You: I want to improve page load performance but I'm not sure
     where the bottlenecks are.

AI:  Let me help investigate...
     [Analyzes bundle sizes, identifies slow queries, reviews
     component render patterns]

     I found three main bottlenecks:
     1. Large unoptimized images
     2. Synchronous data fetching in ProductList
     3. Re-renders from context changes

     Which would you like to address first?

You: Let's tackle the data fetching issue.

You: /opsx:new optimize-product-list-fetching

AI:  Created change. Ready to create: proposal

You: /opsx:continue

AI:  Creating proposal based on our exploration...
     [Writes proposal incorporating investigation insights]

     Ready to create: specs, design
     Which would you like next?

You: /opsx:continue

AI:  Creating specs...
```

**最適合：** 效能最佳化、除錯、架構決策、不明確的需求。

### 平行變化

一次處理多個更改：

```text
Change A: /opsx:new ──► /opsx:ff ──► /opsx:apply (in progress)
                                         │
                                    context switch
                                         │
Change B: /opsx:new ──► /opsx:ff ──────► /opsx:apply
```

**對話範例：**

```text
You: I'm working on add-dark-mode but got pulled into a bug fix

You: /opsx:new fix-login-redirect

AI:  Created openspec/changes/fix-login-redirect/

You: /opsx:ff

AI:  ✓ Created planning artifacts

You: /opsx:apply

AI:  Working on fix-login-redirect...
     [Implements the fix]
     All tasks complete!

You: /opsx:archive

AI:  ✓ Archived fix-login-redirect

You: Let's get back to dark mode

You: /opsx:apply add-dark-mode

AI:  Resuming add-dark-mode...
     Picking up at task 2.3: Update Header...
```

**最適合：** 並行工作流程、緊急中斷、團隊合作。

當您有多個已完成的變更時，請使用 `/opsx:bulk-archive`:

```text
You: /opsx:bulk-archive

AI:  Found 3 completed changes:
     - add-dark-mode (all tasks done)
     - fix-login-redirect (all tasks done)
     - update-footer (all tasks done)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will apply in chronological order.

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-redirect
     ✓ Archived update-footer
     Specs merged in order: add-dark-mode → update-footer
```

批次存檔可偵測多個變更何時觸及相同規範，並透過檢查實際實施的內容來解決衝突。

### 完成變更

推薦的完成流程：

```text
/opsx:apply ──► /opsx:verify ──► /opsx:archive
                    │                 │
              validates          prompts to sync
              implementation     if needed
```

#### 驗證：檢查您的工作

`/opsx:verify` 跨三個維度驗證您的工件的實作：

```text
You: /opsx:verify

AI:  Verifying add-auth...

     COMPLETENESS
     ✓ All 12 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "Session timeout after inactivity" not tested

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "event-driven" but implementation uses polling

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for session timeout scenario
     2. Consider refactoring to event-driven as designed, or update design.md
```

**驗證檢查的內容：**

| 方面 | 它驗證了什麼 |
|-----------|------------------|
| 完整性 | 所有任務已完成，所有要求已實現，並已覆蓋場景 |
| 正確性 | Implementation matches spec intent, edge cases handled |
| 連貫性 | 設計決策體現在程式碼中，模式一致 |

驗證不會阻止存檔，但它會顯示您可能想要先解決的問題。

#### 存檔：完成更改

`/opsx:archive` 完成更改並將其移至存檔：

```text
You: /opsx:archive

AI:  Archiving add-auth...

     Artifact status:
     ✓ proposal.md exists
     ✓ specs/ exists
     ✓ design.md exists
     ✓ tasks.md exists (12/12 tasks complete)

     Delta specs: Not yet synced to main
     → Would you like to sync now?

You: Yes

AI:  ✓ Synced specs to openspec/specs/auth/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-auth/

     Change archived successfully.
```

如果規格未同步，存檔將提示。它不會阻止未完成的任務，但會警告您。

## 何時使用什麼

### `/opsx:ff` 與 `/opsx:continue`

| 情況 | 使用 |
|-----------|-----|
| 明確需求，準備構建 | `/opsx:ff` |
| 探索中，想回顧每一步 | `/opsx:continue` |
| 想要在規格之前迭代提案 | `/opsx:continue` |
| 時間緊迫，需要快速行動 | `/opsx:ff` |
| 複雜的變化，需要控制 | `/opsx:continue` |

**經驗法則：** 如果您可以預先描述完整範圍，請使用 `/opsx:ff`。如果您邊走邊想，請使用 `/opsx:continue`.

### 何時更新與重新開始

一個常見的問題：什麼時候可以更新現有的更改，什麼時候應該開始新的更改？

**在以下情況下更新現有變更：**

- 相同的意圖，精細的執行
- 範圍縮小（MVP優先，其餘稍後）
- 學習驅動的修正（程式碼庫不是你所期望的）
- 根據實施發現進行設計調整

**在以下情況下開始新的變更：**

- 意圖從根本上改變了
- 範圍完全擴展到不同的工作
- 原始更改可以獨立標記為“完成”
- 補丁只會讓人困惑而不是澄清

```text
                     ┌─────────────────────────────────────┐
                     │     Is this the same work?          │
                     └──────────────┬──────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          Same intent?      >50% overlap?      Can original
          Same problem?     Same scope?        be "done" without
                 │                  │          these changes?
                 │                  │                  │
       ┌────────┴────────┐  ┌──────┴──────┐   ┌───────┴───────┐
       │                 │  │             │   │               │
      YES               NO YES           NO  NO              YES
       │                 │  │             │   │               │
       ▼                 ▼  ▼             ▼   ▼               ▼
    UPDATE            NEW  UPDATE       NEW  UPDATE          NEW
```

**範例：「新增深色模式」**

- 「還需要支援自訂主題」→新變化（範圍爆炸）
- 「系統偏好偵測比預期更難」→更新（相同意圖）
- 「讓我們先發布切換，稍後添加首選項」 → 更新，然後存檔，然後進行新更改

## 最佳實踐

### 保持變革的重點

每個變更一個邏輯工作單元。如果您正在執行“新增功能 X 並重構 Y”，請考慮兩個單獨的變更。

**為什麼重要：**
- 更容易檢視和理解
- 更清晰的存檔歷史記錄
- 可獨立出貨
- 如果需要更簡單的回滾

### 使用 `/opsx:explore` 對於不明確的要求

在做出改變之前，先探索問題空間：

```text
You: /opsx:explore

AI:  What would you like to explore?

You: How should we handle rate limiting for our API?

AI:  Let me investigate your current setup and options...
     [Researches codebase, considers patterns]

     I see three approaches we could take:
     1. Middleware-based (simple, per-endpoint)
     2. Redis-backed (scalable, shared state)
     3. Token bucket per user (fair, complex)

     Your current stack suggests #1 or #2. What's your scale?
```

在建立工件之前，探索可以澄清思路。

### 存檔前驗證

使用 `/opsx:verify` 檢查實作是否符合工件：

```text
You: /opsx:verify

AI:  Verifying add-dark-mode...

     ✓ All tasks in tasks.md are checked
     ✓ Requirements in specs have corresponding code
     ✓ Design decisions are reflected in implementation

     Ready to archive!
```

在結束變更之前捕獲不匹配的情況。

### 名稱變更一目了然

好名字讓人 `openspec list` 有用：

```text
Good:                          Avoid:
add-dark-mode                  feature-1
fix-login-redirect             update
optimize-product-query         changes
implement-2fa                  wip
```

## 指令快速參考

有關完整命令詳細資訊和選項，請參閱 [命令](commands.md).

| 命令 | 目的 | 何時使用 |
|---------|---------|-------------|
| `/opsx:propose` | 建立變更+規劃工件 | 快速預設路徑（`core` 輪廓） |
| `/opsx:explore` | 透過想法思考 | 要求不明確，調查 |
| `/opsx:new` | 啟動變革鷹架 | 擴展模式，顯式工件控制 |
| `/opsx:continue` | 建立下一個工件 | 擴充模式，一步步建立工件 |
| `/opsx:ff` | 建立所有計劃工件 | 擴展模式，範圍清晰 |
| `/opsx:apply` | 落實任務 | 準備寫程式碼了 |
| `/opsx:verify` | 驗證實施 | 歸檔前的擴充模式 |
| `/opsx:sync` | 合併增量規格 | 擴展模式，可選 |
| `/opsx:archive` | 完成變更 | 全部工作完成 |
| `/opsx:bulk-archive` | 存檔多項更改 | 擴展模式，並行工作 |

## 下一步

- [命令](commands.md) - 帶有選項的完整命令參考
- [概念](concepts.md) - 深入研究規格、工件和模式
- [客製化](customization.md) - 建立自訂工作流程
