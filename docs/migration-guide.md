# 遷移到 OPSX

本指南可協助您從舊版 OpenSpec 工作流程過渡到 OPSX。遷移旨在順利進行—您現有的工作將被保留，而新系統提供了更大的靈活性。

## 發生了什麼變化？

OPSX 以一種流暢的、基於操作的方法取代了舊的鎖相工作流程。這是關鍵的轉變：

| 方面 | 遺產 | OPSX |
|--------|--------|------|
| **命令** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` | 預設: `/opsx:propose`, `/opsx:apply`, `/opsx:archive` （擴充工作流程指令可選） |
| **Workflow** | 一次建立所有工件 | 增量建立或一次性建立—您的選擇 |
| **回去** | 尷尬的相位門 | 自然－隨時更新任何工件 |
| **客製化** | 固定結構 | 模式驅動，完全可破解 |
| **設定** | `CLAUDE.md` 帶標記 + `project.md` | 清理設定 `openspec/config.yaml` |

**理念的改變：**工作不是線性的。 OPSX 不再假裝如此。

---

## 開始之前

### 您現有的工作是安全的

遷移過程的設計考慮到了保護：

- **積極的變化 `openspec/changes/`** — 完整保存。您可以使用 OPSX 命令繼續它們。
- **已存檔的變更** — 未受影響。你的歷史仍然完好無損。
- **主要規格 `openspec/specs/`** — 未受影響。這些就是你的真相來源。
- **您在 CLAUDE.md、AGENTS.md 等中的內容** — 保留。僅刪除 OpenSpec 標記區塊；您寫的所有內容都會保留。

### 什麼被刪除

僅 OpenSpec 託管文件被替換：

| 什麼 | 為什麼 |
|------|-----|
| 舊版斜槓指令目錄/文件 | 被新的技能係統取代 |
| `openspec/AGENTS.md` | 過時的工作流程觸發器 |
| OpenSpec 標記在 `CLAUDE.md`, `AGENTS.md`， ETC。 | 不再需要 |

**按工具劃分的舊命令位置**（範例 - 您的工具可能會有所不同）：

- Claude 代碼： `.claude/commands/openspec/`
- 游標: `.cursor/commands/openspec-*.md`
- 風帆衝浪： `.windsurf/workflows/openspec-*.md`
- 克萊恩： `.clinerules/workflows/openspec-*.md`
- 袋鼠： `.roo/commands/openspec-*.md`
- GitHub 副駕駛： `.github/prompts/openspec-*.prompt.md` （僅限 IDE 擴充；Copilot CLI 不支援）
- 以及其他（Augment、Continue、Amazon Q 等）

遷移會偵測您設定的任何工具並清理其舊檔案。

刪除清單可能看起來很長，但這些都是 OpenSpec 最初建立的檔案。您自己的內容永遠不會被刪除。

### 需要注意什麼

一個檔案需要手動遷移：

**`openspec/project.md`** — 該檔案不會自動刪除，因為它可能包含您所寫的項目上下文。您需要：

1. 檢視其內容
2. 將有用的上下文移至 `openspec/config.yaml` （請參閱下面的指南）
3. 準備好後刪除文件

**我們為何進行此更改：**

舊的 `project.md` 是被動的——代理人可能會讀它，可能不會，也可能會忘記他們讀過的內容。我們發現可靠性不一致。

新的 `config.yaml` 上下文**主動注入到每個 OpenSpec 規劃請求中**。這意味著當人工智慧建立工件時，您的專案約定、技術堆疊和規則始終存在。更高的可靠性。

**權衡：**

由於上下文會注入到每個請求中，因此您需要簡潔。專注於真正重要的事情：
- 技術堆疊和關鍵約定
- 人工智慧需要瞭解的非明顯約束
- 以前常被忽略的規則

不用擔心是否完美。我們仍在學習什麼在這裡最有效，並且我們將在實驗時改進上下文注入的工作方式。

---

## 執行遷移

兩個都 `openspec init` 和 `openspec update` 偵測遺留文件並引導您完成相同的清理過程。使用適合您情況的選項：

- 新安裝預設設定檔 `core` (`propose`, `explore`, `apply`, `archive`).
- 遷移的安裝透過編寫一個檔案來保留您先前安裝的工作流程 `custom` 需要時設定檔。

### 使用 `openspec init`

如果您想要新增工具或重新設定已設定的工具，請執行此命令：

```bash
openspec init
```

init 指令偵測舊檔案並引導您完成清理：

```
Upgrading to the new OpenSpec

OpenSpec now uses agent skills, the emerging standard across coding
agents. This simplifies your setup while keeping everything working
as before.

Files to remove
No user content to preserve:
  • .claude/commands/openspec/
  • openspec/AGENTS.md

Files to update
OpenSpec markers will be removed, your content preserved:
  • CLAUDE.md
  • AGENTS.md

Needs your attention
  • openspec/project.md
    We won't delete this file. It may contain useful project context.

    The new openspec/config.yaml has a "context:" section for planning
    context. This is included in every OpenSpec request and works more
    reliably than the old project.md approach.

    Review project.md, move any useful content to config.yaml's context
    section, then delete the file when ready.

? Upgrade and clean up legacy files? (Y/n)
```

**當你說「是」時會發生什麼：**

1. 舊的斜槓指令目錄被刪除
2. OpenSpec 標記被剝離 `CLAUDE.md`, `AGENTS.md`等等（您的內容保留）
3. `openspec/AGENTS.md` 被刪除
4. 新技能安裝在 `.claude/skills/`
5. `openspec/config.yaml` 使用預設模式建立

### 使用 `openspec update`

如果您只想將現有工具遷移並重新整理到最新版本，請執行此命令：

```bash
openspec update
```

更新命令也會偵測並清理遺留工件，然後重新整理產生的技能/命令以符合您目前的設定檔和交付設定。

### 非互動式/CI 環境

對於腳本化遷移：

```bash
openspec init --force --tools claude
```

這 `--force` flag 跳過提示並自動接受清理。

---

## 將project.md遷移到config.yaml

舊的 `openspec/project.md` 是專案上下文的自由格式 Markdown 檔案。新的 `openspec/config.yaml` 是結構化的，至關重要的是，**注入到每個規劃請求中**，因此當人工智慧工作時，您的約定始終存在。

### 之前（項目.md）

```markdown
# Project Context

This is a TypeScript monorepo using React and Node.js.
We use Jest for testing and follow strict ESLint rules.
Our API is RESTful and documented in docs/api.md.

## Conventions

- All public APIs must maintain backwards compatibility
- New features should include tests
- Use Given/When/Then format for specifications
```

### 之後（config.yaml）

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  Testing: Jest with React Testing Library
  API: RESTful, documented in docs/api.md
  We maintain backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan for risky changes
  specs:
    - Use Given/When/Then format for scenarios
    - Reference existing patterns before inventing new ones
  design:
    - Include sequence diagrams for complex flows
```

### 主要差異

| project.md | config.yaml |
|------------|-------------|
| 自由格式降價 | 結構化YAML |
| 一團文本 | 單獨的上下文和每個工件規則 |
| 不清楚什麼時候使用 | 上下文出現在所有工件中；規則僅出現在符合工件中 |
| 沒有模式選擇 | 顯式的 `schema:` 欄位設定預設工作流程 |

### 保留什麼，放棄什麼

遷移時，要有選擇性。問問自己：“人工智慧是否需要這個來滿足*每個*規劃請求？”

**良好的候選人 `context:`**
- 技術堆疊（語言、框架、資料庫）
- 關鍵架構模式（monorepo、微服務等）
- 非明顯的限制（「我們不能使用庫 X 因為......」）
- 經常被忽略的關鍵約定

**移至 `rules:` 反而**
- 特定於工件的格式（“在規格中使用給定/何時/然後”）
- 審查標準（「提案必須包括回溯計畫」）
- 這些僅針對匹配的工件出現，使其他請求更輕鬆

**完全省略**
- 人工智慧已經知道的一般最佳實踐
- 可以總結的詳細解釋
- 不影響目前工作的歷史背景

### 遷移步驟

1. **建立 config.yaml** （如果 init 尚未建立）：
   ```yaml
   schema: spec-driven
   ```

2. **新增您的上下文**（簡潔扼要 - 這適用於每個請求）：
   ```yaml
   context: |
     Your project background goes here.
     Focus on what the AI genuinely needs to know.
   ```

3. **新增每個工件的規則**（可選）：
   ```yaml
   rules:
     proposal:
       - Your proposal-specific guidance
     specs:
       - Your spec-writing rules
   ```

4. **一旦你移動了所有有用的東西，就刪除project.md**。

**不要想太多。 ** 從要點開始並迭代。如果您發現人工智慧遺漏了一些重要的內容，請添加它。如果上下文感覺臃腫，請修剪它。這是一份動態文件。

### 需要幫助嗎？使用此提示

如果您不確定如何提取您的project.md，請詢問您的 AI 助理：

```
I'm migrating from OpenSpec's old project.md to the new config.yaml format.

Here's my current project.md:
[paste your project.md content]

Please help me create a config.yaml with:
1. A concise `context:` section (this gets injected into every planning request, so keep it tight—focus on tech stack, key constraints, and conventions that often get ignored)
2. `rules:` for specific artifacts if any content is artifact-specific (e.g., "use Given/When/Then" belongs in specs rules, not global context)

Leave out anything generic that AI models already know. Be ruthless about brevity.
```

人工智慧將幫助您確定哪些是必要的，哪些是可以修剪的。

---

## 新指令

命令可用性取決於設定檔：

**預設 (`core` 輪廓）：**

| 命令 | 目的 |
|---------|---------|
| `/opsx:propose` | 一步建立變更並產生規劃工件 |
| `/opsx:explore` | 思考沒有結構的想法 |
| `/opsx:apply` | 從tasks.md實現任務 |
| `/opsx:archive` | 完成並存檔變更 |

**擴充工作流程（自訂選擇）：**

| 命令 | 目的 |
|---------|---------|
| `/opsx:new` | 開始新的變革鷹架 |
| `/opsx:continue` | 建立下一個工件（一次一個） |
| `/opsx:ff` | 快轉－立即建立規劃工件 |
| `/opsx:verify` | 驗證實施是否符合規範 |
| `/opsx:sync` | 預覽/規格合併，無需存檔 |
| `/opsx:bulk-archive` | 一次存檔多個更改 |
| `/opsx:onboard` | 引導式端到端入職工作流程 |

啟用擴充命令 `openspec config profile`，然後執行 `openspec update`.

### 傳統命令映射

| 遺產 | OPSX 等效 |
|--------|-----------------|
| `/openspec:proposal` | `/opsx:propose` （預設）或 `/opsx:new` 然後 `/opsx:ff` （擴展） |
| `/openspec:apply` | `/opsx:apply` |
| `/openspec:archive` | `/opsx:archive` |

### 新功能

這些功能是擴充工作流程指令集的一部分。

**精細的工件建立：**
```
/opsx:continue
```
根據依賴關係一次建立一個工件。當您想要檢視每個步驟時使用此選項。

**探索模式：**
```
/opsx:explore
```
在做出改變之前，與夥伴一起思考想法。

---

## 瞭解新架構

### 從鎖相到流體

遺留工作流程強制線性進展：

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │
│    PHASE     │      │    PHASE     │      │    PHASE     │
└──────────────┘      └──────────────┘      └──────────────┘

If you're in implementation and realize the design is wrong?
Too bad. Phase gates don't let you go back easily.
```

OPSX 使用操作，而不是階段：

```
         ┌───────────────────────────────────────────────┐
         │           ACTIONS (not phases)                │
         │                                               │
         │     new ◄──► continue ◄──► apply ◄──► archive │
         │      │          │           │             │   │
         │      └──────────┴───────────┴─────────────┘   │
         │                    any order                  │
         └───────────────────────────────────────────────┘
```

### 依賴圖

工件形成有向圖。依賴是推動者，不是大門：

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
```

當你執行時 `/opsx:continue`，它檢查已準備好的內容並提供下一個工件。您也可以以任意順序建立多個現成的工件。

### 技能與命令

舊系統使用特定於工具的命令檔案：

```
.claude/commands/openspec/
├── proposal.md
├── apply.md
└── archive.md
```

OPSX 使用新興的**技能**標準：

```
.claude/skills/
├── openspec-explore/SKILL.md
├── openspec-new-change/SKILL.md
├── openspec-continue-change/SKILL.md
├── openspec-apply-change/SKILL.md
└── ...
```

技能可以透過多種人工智慧編碼工具得到認可，並提供更豐富的元資料。

---

## 延續現有的變化

您正在進行的變更可與 OPSX 指令無縫協作。

**對舊工作流程有正面的改變嗎？ **

```
/opsx:apply add-my-feature
```

OPSX 讀取現有工件並從您上次停下的地方繼續。

**想要為現有變更添加更多工件嗎？ **

```
/opsx:continue add-my-feature
```

顯示根據已存在的內容準備建立的內容。

**需要檢視狀態嗎？ **

```bash
openspec status --change add-my-feature
```

---

## 新的設定系統

### config.yaml 結構

```yaml
# Required: Default schema for new changes
schema: spec-driven

# Optional: Project context (max 50KB)
# Injected into ALL artifact instructions
context: |
  Your project background, tech stack,
  conventions, and constraints.

# Optional: Per-artifact rules
# Only injected into matching artifacts
rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format
  design:
    - Document fallback strategies
  tasks:
    - Break into 2-hour maximum chunks
```

### 模式解析

在決定要使用哪個架構時，OPSX 會依序檢查：

1. **CLI 標誌**： `--schema <name>` （最高優先權）
2. **更改元資料**： `.openspec.yaml` 在更改目錄中
3. **專案設定**： `openspec/config.yaml`
4. **預設**: `spec-driven`

### 可用模式

| 模式 | 文物 | 最適合 |
|--------|-----------|----------|
| `spec-driven` | 提案→規格→設計→任務 | 大多數項目 |

列出所有可用的模式：

```bash
openspec schemas
```

### 自訂模式

建立您自己的工作流程：

```bash
openspec schema init my-workflow
```

或分叉一個現有的：

```bash
openspec schema fork spec-driven my-workflow
```

看 [客製化](customization.md) 瞭解詳情。

---

## 故障排除

### “在非交互模式下偵測到舊文件”

您正在 CI 或非互動式環境中執行。使用：

```bash
openspec init --force
```

### 遷移後指令不出現

重新啟動您的 IDE。技能在啟動時被偵測到。

### “規則中未知的工件 ID”

檢查您的 `rules:` 鍵與您的架構的工件 ID 相符：

- **規範驅動**： `proposal`, `specs`, `design`, `tasks`

執行此命令以檢視有效的工件 ID：

```bash
openspec schemas --json
```

### 設定未套用

1. 確保文件位於 `openspec/config.yaml` （不是 `.yml`)
2. 驗證 YAML 語法
3. 設定變更立即生效－無需重啟

### 項目.md 未遷移

系統有意保留 `project.md` 因為它可能包含您的自訂內容。手動審核，將有用的部分移至 `config.yaml`，然後將其刪除。

### 想看看會清理什麼嗎？

執行 init 並拒絕清理提示 — 您將看到完整的偵測摘要，而無需進行任何變更。

---

## 快速參考

### 遷移後的文件

```
project/
├── openspec/
│   ├── specs/                    # Unchanged
│   ├── changes/                  # Unchanged
│   │   └── archive/              # Unchanged
│   └── config.yaml               # NEW: Project configuration
├── .claude/
│   └── skills/                   # NEW: OPSX skills
│       ├── openspec-propose/     # default core profile
│       ├── openspec-explore/
│       ├── openspec-apply-change/
│       └── ...                   # expanded profile adds new/continue/ff/etc.
├── CLAUDE.md                     # OpenSpec markers removed, your content preserved
└── AGENTS.md                     # OpenSpec markers removed, your content preserved
```

### 消失了什麼

- `.claude/commands/openspec/` — 替換為 `.claude/skills/`
- `openspec/AGENTS.md` - 過時的
- `openspec/project.md` — 遷移到 `config.yaml`，然後刪除
- OpenSpec 標記塊 `CLAUDE.md`, `AGENTS.md`， ETC。

### 指令備忘單

```text
/opsx:propose      Start quickly (default core profile)
/opsx:apply        Implement tasks
/opsx:archive      Finish and archive

# Expanded workflow (if enabled):
/opsx:new          Scaffold a change
/opsx:continue     Create next artifact
/opsx:ff           Create planning artifacts
```

---

## 尋求協助

- **Discord**： [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub 問題**： [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **文件**: [docs/opsx.md](opsx.md) 完整的 OPSX 參考
