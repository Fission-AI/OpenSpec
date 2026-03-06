# OPSX工作流程

> 歡迎回饋 [Discord](https://discord.gg/YctCnvvshC).

## 它是什麼？

OPSX 現在是 OpenSpec 的標準工作流程。

這是一個**流暢、迭代的工作流程**，可進行 OpenSpec 的變更。不再有嚴格的階段—只需您可以隨時採取的行動。

## 為什麼存在

舊的 OpenSpec 工作流程可以工作，但它被 **鎖定**：

- **指令是硬編碼的** - 隱藏在 TypeScript 中，你無法更改它們
- **全有或全無** - 一個大命令建立一切，無法測試單個部分
- **固定結構** — 每個人的工作流程相同，無需定制
- **黑盒子**－當AI輸出不好時，你無法調整提示

**OPSX 打開它。 ** 現在任何人都可以：

1. **依照指示進行實驗** — 編輯模板，看看 AI 是否做得更好
2. **精細測試** - 獨立驗證每個工件的指令
3. **自訂工作流程** — 定義您自己的工件和依賴項
4. **快速迭代** — 更改模板，立即測試，無需重建

```
Legacy workflow:                      OPSX:
┌────────────────────────┐           ┌────────────────────────┐
│  Hardcoded in package  │           │  schema.yaml           │◄── You edit this
│  (can't change)        │           │  templates/*.md        │◄── Or this
│        ↓               │           │        ↓               │
│  Wait for new release  │           │  Instant effect        │
│        ↓               │           │        ↓               │
│  Hope it's better      │           │  Test it yourself      │
└────────────────────────┘           └────────────────────────┘
```

**這適合所有人：**
- **團隊** — 建立符合您實際運作方式的工作流程
- **進階使用者** — 調整提示，為您的程式碼庫獲得更好的 AI 輸出
- **OpenSpec 貢獻者** — 在不發布版本的情況下嘗試新方法

我们仍在学习什么是最有效的。 OPSX 讓我們一起學習。

## 使用者體驗

**線性工作流程的問題：**
您處於“計劃階段”，然後“實施階段”，然後“完成”。但真正的工作卻並非如此。你實現了一些東西，意識到你的設計是錯誤的，需要更新規範，繼續實現。線性階段與工作的實際發生方式相矛盾。

**OPSX 方法：**
- **行動，而不是階段** — 建立、實施、更新、存檔 — 隨時執行其中任何一項
- **依賴關係是推動者** - 它們顯示什麼是可能的，而不是接下來需要什麼

```
  proposal ──→ specs ──→ design ──→ tasks ──→ implement
```

## 設定

```bash
# Make sure you have openspec installed — skills are automatically generated
openspec init
```

這創造了技能 `.claude/skills/` (or equivalent) that AI coding assistants auto-detect.

預設情況下，OpenSpec 使用 `core` 工作流程設定檔（`propose`, `explore`, `apply`, `archive`）。如果您想要擴充工作流程指令（`new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard`），將它們設定為 `openspec config profile` 並執行 `openspec update`.

在設定過程中，系統會提示您建立 **專案設定** (`openspec/config.yaml`）。這是可選的，但建議這樣做。

## 專案設定

專案設定可讓您設定預設值並將特定於專案的上下文注入到所有工件中。

### 建立設定

設定是在期間建立的 `openspec init`，或手動：

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  API conventions: RESTful, JSON responses
  Testing: Vitest for unit tests, Playwright for e2e
  Style: ESLint with Prettier, strict TypeScript

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format for scenarios
  design:
    - Include sequence diagrams for complex flows
```

### 設定字段

| 場地 | 類型 | 描述 |
|-------|------|-------------|
| `schema` | 細繩 | 新更改的預設架構（例如， `spec-driven`) |
| `context` | 細繩 | 專案上下文注入到所有工件指令中 |
| `rules` | 目的 | 每個工件的規則，由工件 ID 鍵入 |

### 它是如何運作的

**架構優先權**（從最高到最低）：
1. CLI 標誌 (`--schema <name>`)
2. 更改元資料（`.openspec.yaml` 在更改目錄中）
3. 項目設定（`openspec/config.yaml`)
4. 預設 (`spec-driven`)

**上下文注入：**
- 上下文被加入到每個工件的指令之前
- 包裹在 `<context>...</context>` 標籤
- 幫助人工智慧理解您專案的慣例

**規則注入：**
- 僅針對符合工件注入規則
- 包裹在 `<rules>...</rules>` 標籤
- 出現在上下文之後、範本之前

### 按架構劃分的工件 ID

**規格驅動**（預設）：
- `proposal` — 變更提案
- `specs` - 規格
- `design` — 技術設計
- `tasks` ——實施任務

### 設定驗證

- 中的未知工件 ID `rules` 生成警告
- Schema names are validated against available schemas
- Context has a 50KB size limit
- 報告行號無效 YAML

### 故障排除

**「規則中的未知工件 ID：X」**
- 檢查工件 ID 是否與您的架構相符（請參閱上面的清單）
- 執行 `openspec schemas --json` 檢視每個模式的工件 ID

**設定未套用：**
- 確保文件位於 `openspec/config.yaml` （不是 `.yml`)
- 使用驗證器檢查 YAML 語法
- 設定變更立即生效（無需重新啟動）

**上下文太大：**
- 上下文限制為 50KB
- 總結或連結到外部文檔

## 命令

| 命令 | 它的作用 |
|---------|--------------|
| `/opsx:propose` | 一步建立變更並產生計劃工件（預設快速路徑） |
| `/opsx:explore` | 思考思路、研究問題、明確需求 |
| `/opsx:new` | 啟動新的變革鷹架（擴展的工作流程） |
| `/opsx:continue` | 建立下一個工件（擴充工作流程） |
| `/opsx:ff` | 快轉規劃工件（擴充工作流程） |
| `/opsx:apply` | 實施任務，根據需要更新工件 |
| `/opsx:verify` | 根據工件驗證實施（擴充工作流程） |
| `/opsx:sync` | 將增量規格同步到主規格（擴充工作流程，可選） |
| `/opsx:archive` | 完成後存檔 |
| `/opsx:bulk-archive` | 存檔多個已完成的變更（擴充工作流程） |
| `/opsx:onboard` | 端到端變更的引導演練（擴充工作流程） |

## 用法

### 探索一個想法
```
/opsx:explore
```
思考想法、調查問題、比較選項。不需要結構－只需一個有思想的合作夥伴。當見解具體化時，過渡到 `/opsx:propose` （預設）或 `/opsx:new`/`/opsx:ff` （擴展）。

### 開始新的改變
```
/opsx:propose
```
建立變更並產生實施前所需的規劃工件。

如果您啟用了擴充工作流程，則可以改為使用：

```text
/opsx:new        # scaffold only
/opsx:continue   # create one artifact at a time
/opsx:ff         # create all planning artifacts at once
```

### 建立工件
```
/opsx:continue
```
根據依賴關係顯示準備建立的內容，然後建立一個工件。重複使用以逐步建立您的變更。

```
/opsx:ff add-dark-mode
```
立即建立所有計劃工件。當您對正在建立的內容有清晰的瞭解時使用。

### 實施（流體部分）
```
/opsx:apply
```
完成任務，邊做邊檢查。如果您要處理多個更改，您可以執行 `/opsx:apply <name>`;否則，它應該從對話中進行推斷，並提示您選擇是否無法判斷。

### 完成
```
/opsx:archive   # Move to archive when done (prompts to sync specs if needed)
```

## 何時更新與重新開始

您始終可以在實施之前編輯您的提案或規格。但什麼時候精煉變成了「這是不同的工作」呢？

### 提案的重點是什麼

提案定義了三件事：
1. **意圖** — 您要解決什麼問題？
2. **範圍** — 什麼是界內/界外？
3. **方法** — 你會如何解決它？

問題是：哪些改變了，改變了多少？

### 在以下情況下更新現有變更：

**同樣的意圖，精緻的執行**
- 你發現了你沒有考慮到的邊緣情況
- 方法需要調整，但目標不變
- 實施顯示設計略有偏差

**範圍縮小**
- 您意識到全面範圍太大，想要先交付 MVP
- “新增深色模式”→“新增深色模式切換（v2 中的系統偏好設定）”

**學習驅動的修正**
- 程式碼庫的結構與您的想法不同
- 依賴項未如預期工作
- “使用 CSS 變數”→“使用 Tailwind 的 dark: 前綴代替”

### 在以下時間開始新的改變：

**意圖從根本上改變**
- 現在問題本身不同了
- “添加深色模式”→“添加具有自訂顏色、字體、間距的綜合主題系統”

**範圍爆炸**
- 變化如此之大，本質上是不同的工作
- 更新後原提案將無法識別
- “修復登入錯誤”→“重寫認證系統”

**原件已完成**
- 原始更改可以標記為“完成”
- 新作品是獨立的，而不是改進
- 完成“新增黑暗模式 MVP”→ 檔案 → 新更改“增強黑暗模式”

### 啟發法

```
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

| 測試 | 更新 | 新變化 |
|------|--------|------------|
| **身份** | “同樣的事情，精緻” | 《不一樣的工作》 |
| **範圍重疊** | >50% 重疊 | <50% 重疊 |
| **完成** | 不進行改變就無法“完成” | 可以獨立完成原創、新作 |
| **故事** | 更新鏈講述連貫的故事 | 補丁只會讓人困惑而不是澄清 |

### 原則

> **更新保留上下文。新的變化提供了清晰度。 **
>
> 當您的思維歷史很有價值時，請選擇更新。
> 重新開始時選擇新的比修補更清晰。

把它想像成 git 分支：
- 在開發同一個功能的同時不斷投入
- 當真正的新工作出現時開始一個新的分支
- 有時會合併部分功能並在第二階段重新開始

## 有什麼不同？

| | 遺產 （`/openspec:proposal`) | OPSX（`/opsx:*`) |
|---|---|---|
| **結構** | 一份大提案文件 | 具有依賴性的離散工件 |
| **Workflow** | 線性階段：計畫→實施→歸檔 | 流暢的行動－隨時做任何事 |
| **迭代** | 不好意思回去 | 在學習時更新工件 |
| **客製化** | 固定結構 | 模式驅動（定義您自己的工件） |

**關鍵見解：**工作不是線性的。 OPSX 不再假裝如此。

## 架構深度探究

本節介紹 OPSX 的底層工作原理以及它與傳統工作流程的比較。
本節中的範例使用擴展命令集（`new`, `continue`， ETC。 );預設 `core` 使用者可以將相同的流程映射到 `propose → apply → archive`.

### 哲學：短語和行動

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEGACY WORKFLOW                                      │
│                    (Phase-Locked, All-or-Nothing)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │             │
│   │    PHASE     │      │    PHASE     │      │    PHASE     │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│   /openspec:proposal   /openspec:apply      /openspec:archive              │
│                                                                             │
│   • Creates ALL artifacts at once                                          │
│   • Can't go back to update specs during implementation                    │
│   • Phase gates enforce linear progression                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                            OPSX WORKFLOW                                     │
│                      (Fluid Actions, Iterative)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              ┌────────────────────────────────────────────┐                 │
│              │           ACTIONS (not phases)             │                 │
│              │                                            │                 │
│              │   new ◄──► continue ◄──► apply ◄──► archive │                 │
│              │    │          │           │           │    │                 │
│              │    └──────────┴───────────┴───────────┘    │                 │
│              │              any order                     │                 │
│              └────────────────────────────────────────────┘                 │
│                                                                             │
│   • Create artifacts one at a time OR fast-forward                         │
│   • Update specs/design/tasks during implementation                        │
│   • Dependencies enable progress, phases don't exist                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 元件架構

**舊工作流程**使用 TypeScript 中的硬編碼範本：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEGACY WORKFLOW COMPONENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Hardcoded Templates (TypeScript strings)                                  │
│                    │                                                        │
│                    ▼                                                        │
│   Tool-specific configurators/adapters                                      │
│                    │                                                        │
│                    ▼                                                        │
│   Generated Command Files (.claude/commands/openspec/*.md)                  │
│                                                                             │
│   • Fixed structure, no artifact awareness                                  │
│   • Change requires code modification + rebuild                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**OPSX** 使用外部模式和依賴圖引擎：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPSX COMPONENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Schema Definitions (YAML)                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  name: spec-driven                                                  │   │
│   │  artifacts:                                                         │   │
│   │    - id: proposal                                                   │   │
│   │      generates: proposal.md                                         │   │
│   │      requires: []              ◄── Dependencies                     │   │
│   │    - id: specs                                                      │   │
│   │      generates: specs/**/*.md  ◄── Glob patterns                    │   │
│   │      requires: [proposal]      ◄── Enables after proposal           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Artifact Graph Engine                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • Topological sort (dependency ordering)                           │   │
│   │  • State detection (filesystem existence)                           │   │
│   │  • Rich instruction generation (templates + context)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Skill Files (.claude/skills/openspec-*/SKILL.md)                          │
│                                                                             │
│   • Cross-editor compatible (Claude Code, Cursor, Windsurf)                 │
│   • Skills query CLI for structured data                                    │
│   • Fully customizable via schema files                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 依賴圖模型

工件形成有向無環圖 (DAG)。依賴項是**推動者**，而不是門：

```
                              proposal
                             (root node)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
                 specs                       design
              (requires:                  (requires:
               proposal)                   proposal)
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                               tasks
                           (requires:
                           specs, design)
                                  │
                                  ▼
                          ┌──────────────┐
                          │ APPLY PHASE  │
                          │ (requires:   │
                          │  tasks)      │
                          └──────────────┘
```

**狀態轉換：**

```
   BLOCKED ────────────────► READY ────────────────► DONE
      │                        │                       │
   Missing                  All deps               File exists
   dependencies             are DONE               on filesystem
```

### 資訊流

**舊工作流程** — 代理程式接收靜態指令：

```
  User: "/openspec:proposal"
           │
           ▼
  ┌─────────────────────────────────────────┐
  │  Static instructions:                   │
  │  • Create proposal.md                   │
  │  • Create tasks.md                      │
  │  • Create design.md                     │
  │  • Create specs/<capability>/spec.md    │
  │                                         │
  │  No awareness of what exists or         │
  │  dependencies between artifacts         │
  └─────────────────────────────────────────┘
           │
           ▼
  Agent creates ALL artifacts in one go
```

**OPSX** — 代理程式查詢豐富的上下文：

```
  User: "/opsx:continue"
           │
           ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Step 1: Query current state                                             │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec status --change "add-auth" --json                      │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "artifacts": [                                                  │  │
  │  │      {"id": "proposal", "status": "done"},                         │  │
  │  │      {"id": "specs", "status": "ready"},      ◄── First ready      │  │
  │  │      {"id": "design", "status": "ready"},                          │  │
  │  │      {"id": "tasks", "status": "blocked", "missingDeps": ["specs"]}│  │
  │  │    ]                                                               │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 2: Get rich instructions for ready artifact                        │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec instructions specs --change "add-auth" --json          │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "template": "# Specification\n\n## ADDED Requirements...",      │  │
  │  │    "dependencies": [{"id": "proposal", "path": "...", "done": true}│  │
  │  │    "unlocks": ["tasks"]                                            │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 3: Read dependencies → Create ONE artifact → Show what's unlocked  │
  └──────────────────────────────────────────────────────────────────────────┘
```

### 迭代模型

**遺留工作流程** - 難以迭代：

```
  ┌─────────┐     ┌─────────┐     ┌─────────┐
  │/proposal│ ──► │ /apply  │ ──► │/archive │
  └─────────┘     └─────────┘     └─────────┘
       │               │
       │               ├── "Wait, the design is wrong"
       │               │
       │               ├── Options:
       │               │   • Edit files manually (breaks context)
       │               │   • Abandon and start over
       │               │   • Push through and fix later
       │               │
       │               └── No official "go back" mechanism
       │
       └── Creates ALL artifacts at once
```

**OPSX** — 自然迭代：

```
  /opsx:new ───► /opsx:continue ───► /opsx:apply ───► /opsx:archive
      │                │                  │
      │                │                  ├── "The design is wrong"
      │                │                  │
      │                │                  ▼
      │                │            Just edit design.md
      │                │            and continue!
      │                │                  │
      │                │                  ▼
      │                │         /opsx:apply picks up
      │                │         where you left off
      │                │
      │                └── Creates ONE artifact, shows what's unlocked
      │
      └── Scaffolds change, waits for direction
```

### 自訂模式

使用架構管理命令建立自訂工作流程：

```bash
# Create a new schema from scratch (interactive)
openspec schema init my-workflow

# Or fork an existing schema as a starting point
openspec schema fork spec-driven my-workflow

# Validate your schema structure
openspec schema validate my-workflow

# See where a schema resolves from (useful for debugging)
openspec schema which my-workflow
```

模式儲存在 `openspec/schemas/` （專案本地，版本控制）或 `~/.local/share/openspec/schemas/` （全域用戶）。

**架構結構：**
```
openspec/schemas/research-first/
├── schema.yaml
└── templates/
    ├── research.md
    ├── proposal.md
    └── tasks.md
```

**範例 schema.yaml：**
```yaml
name: research-first
artifacts:
  - id: research        # Added before proposal
    generates: research.md
    requires: []

  - id: proposal
    generates: proposal.md
    requires: [research]  # Now depends on research

  - id: tasks
    generates: tasks.md
    requires: [proposal]
```

**依賴關係圖：**
```
   research ──► proposal ──► tasks
```

### 概括

| 方面 | 遺產 | OPSX |
|--------|----------|------|
| **模板** | 硬編碼TypeScript | 外部 YAML + Markdown |
| **依賴關係** | 無（一次全部） | 具有拓撲排序的 DAG |
| **狀態** | 基於階段的心理模型 | 檔案系統存在 |
| **客製化** | 編輯原始碼，重建 | 建立 schema.yaml |
| **迭代** | Phase-locked | 流暢，編輯任何內容 |
| **編輯支援** | 特定於工具的設定器/適配器 | 單一技能目錄 |

## 模式

模式定義存在哪些工件及其相依性。目前可用：

- **規範驅動**（預設）：提案→規範→設計→任務

```bash
# List available schemas
openspec schemas

# See all schemas with their resolution sources
openspec schema which --all

# Create a new schema interactively
openspec schema init my-workflow

# Fork an existing schema for customization
openspec schema fork spec-driven my-workflow

# Validate schema structure before use
openspec schema validate my-workflow
```

## 尖端

- 使用 `/opsx:explore` 在做出改變之前仔細考慮一個想法
- `/opsx:ff` 當你知道自己想要什麼時 `/opsx:continue` 當探索時
- 期間 `/opsx:apply`，如果出現問題 - 修復工件，然後繼續
- 任務透過核取方塊追蹤進度 `tasks.md`
- 隨時檢視狀態： `openspec status --change "name"`

## 回饋

這很粗糙。這是有意為之的——我們正在學習什麼是有效的。

發現錯誤？有想法嗎？加入我們 [Discord](https://discord.gg/YctCnvvshC) 或打開一個問題 [GitHub](https://github.com/Fission-AI/openspec/issues).
