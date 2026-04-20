# OpenSpec × Superpowers 整合狀況

> 本文件說明 `sdd-plus-superpowers` schema 如何把 OpenSpec 的 artifact 治理流程與
> Superpowers 的執行技能整合為單一工作流。適合作為新成員 onboarding、change review
> 時的對照表，以及日後修改 schema 前必讀。
>
> 對應 schema 版本：`sdd-plus-superpowers` v1

---

## 一、整合的本質：什麼掛在哪裡

OpenSpec 負責 **「做什麼」（WHAT）**—— proposal / specs / design / tasks 這些 markdown artifact 的治理、驗證、歸檔。
Superpowers 負責 **「怎麼做」（HOW）**—— brainstorming 對話、TDD 紀律、subagent 派發、code review 等**執行技能**。

兩者透過自定義 schema [schema.yaml](./schema.yaml) 整合。整合手法不是程式碼層級，而是在 OpenSpec 的 artifact instruction 裡寫「在這一步 use the Skill tool to invoke `superpowers:xxx`」。**不修改任一 superpowers skill 檔案**，也不修改 OpenSpec CLI —— 純粹透過 instruction 層串接。

---

## 二、7 個 Superpowers 觸點一覽

| # | Superpowers skill | 掛在哪 | 觸發方式 |
|---|---|---|---|
| 1 | `superpowers:brainstorming` | `brainstorm` artifact instruction | 直接 |
| 2 | `superpowers:writing-plans` | `plan` artifact instruction | 直接 |
| 3 | `superpowers:using-git-worktrees` | apply step 1 | 直接 |
| 4 | `superpowers:subagent-driven-development` | apply step 2a | 直接 |
| 5 | `superpowers:test-driven-development` | （#4 內部自動觸發） | **傳遞**（SKILL.md L205 / L274） |
| 6 | `superpowers:requesting-code-review` | （#4 內部自動觸發） | **傳遞**（SKILL.md L270） |
| 7 | `superpowers:finishing-a-development-branch` | apply step 4 | 直接 |

另外還有一個 **fallback**：

- `superpowers:executing-plans`（apply step 2b）—— 只在「當前平台無 subagent 支援」時才用。Claude Code 上永遠用 2a。依據 `superpowers:executing-plans` SKILL.md L14 原文：「If subagents are available, use `superpowers:subagent-driven-development` instead of this skill」。

---

## 三、Artifact DAG（含 superpowers 注入點）

```text
┌──────────────┐
│  brainstorm  │ ◄── superpowers:brainstorming
│  (root)      │     （2-3 方案 + Alternatives Considered）
└──────┬───────┘
       │
       ├──► ┌──────────┐
       │    │ proposal │    Why (50-1000 字元) / What Changes / Capabilities
       │    └────┬─────┘
       │         │
       │         ▼
       │    ┌──────────────────┐
       │    │ specs/**/*.md    │    ADDED / MODIFIED / REMOVED / RENAMED
       │    │ (delta specs)    │    每 requirement 含 SHALL/MUST + scenario
       │    └────┬─────────────┘
       │         │
       │         ▼
       │    ┌──────────┐
       │    │  tasks   │    粗粒度 checkbox（apply 的追蹤載體）
       │    └────┬─────┘
       │         │
       │         ▼
       │    ┌──────────┐
       │    │  plan    │ ◄── superpowers:writing-plans
       │    └────┬─────┘     （2-5 分鐘 micro-step）
       │         │
       │         │ ─────────┐
       │         │          │
       │         │     ┌────▼──────┐
       │         │     │  apply    │ ◄── superpowers:using-git-worktrees
       │         │     │  (phase)  │ ◄── superpowers:subagent-driven-development
       │         │     │           │         ├── superpowers:test-driven-development (transitive)
       │         │     │           │         └── superpowers:requesting-code-review (transitive)
       │         │     │           │ ◄── superpowers:finishing-a-development-branch
       │         │     └────┬──────┘
       │         │          │
       ▼         ▼          ▼
    ┌──────────┐    ┌──────────┐
    │  design  │    │  verify  │ ◄── openspec-verify-change (5 checks)
    │ (optional)│   └──────────┘
    └──────────┘
```

**注意幾件事**：

- `design` 是**可選的 leaf**。brainstorm 仍會嘗試預填 design.md，但 tasks 不再硬依賴（`tasks.requires: [specs]`）。依據 OpenSpec conventions：`design.md` 只在需要解釋非 trivial 技術決策時才寫。
- `verify` 的 `requires: [plan]` 是為了讓 schema graph 完整；它的 instruction 明寫「**MUST run on a completed implementation, NOT during planning**」。這是 OpenSpec DAG 與實際時序的刻意錯位，為的是讓 `openspec status` 能顯示 verify 進度。
- `apply` 不產生 artifact，它是一個 **phase**，改動的是 source code + tasks.md checkbox。

---

## 四、完整開發 workflow（一次 change 的生命週期）

### 步驟 0：決定是否走 change 流程

先問自己：這是行為變更嗎？

| 類型 | 是否需要 change | 用哪個 schema |
|---|---|---|
| 新功能 / 新 capability | ✅ 需要 | `sdd-plus-superpowers` |
| Breaking change | ✅ 需要 | `sdd-plus-superpowers` |
| 架構變更 | ✅ 需要 | `sdd-plus-superpowers` |
| Bug fix（恢復原本行為） | ❌ 不需要 | 直接 PR |
| 測試補寫 / 覆蓋率 | ❌ 不需要 | 直接 PR |
| 建置工具微調（linter 規則、覆蓋率門檻等） | ❌ 不需要 | 直接 PR |
| 依賴升級（非破壞性） | ❌ 不需要 | 直接 PR |
| 文件更新 | ❌ 不需要 | 直接 PR |

這個判斷邏輯寫在 [openspec/specs/README.md](../../specs/README.md) 的「何時不建立 Spec」段。

---

### 步驟 1：建立 change + 進入 brainstorming

```bash
/opsx:new my-feature --schema sdd-plus-superpowers
# → 建立 openspec/changes/my-feature/ 空目錄 + .openspec.yaml
# → 顯示 brainstorm artifact 的 instructions
```

接著：

```bash
/opsx:continue
# → 觸發 brainstorm artifact
# → instruction 說「use the Skill tool to invoke superpowers:brainstorming」
# → 進入多輪互動對話：context 探索 → 釐清問題 → 2-3 方案 + 取捨 → 批准設計
# → 對話結束後寫入 brainstorm.md（含 Alternatives Considered）
# → 若有產出設計文件，同時寫入 design.md（預填）
```

**關鍵**：這一步是整個流程的對齊儀式。後續的 proposal / specs 都是從 brainstorm.md 萃取出來的。

---

### 步驟 2：串行產出 proposal → specs → tasks → plan

可以 `/opsx:continue` 一步步做（每一步都有人類 review 機會），也可以 `/opsx:ff` 一口氣補齊剩下所有 artifact。

| 步驟 | 產物 | 關鍵規則 |
|---|---|---|
| 2a | `proposal.md` | Why 段 50-1000 字元；Capabilities 區段列出新增 / 修改的 capability |
| 2b | `specs/<capability>/spec.md` | 4 種 delta（ADDED / MODIFIED / REMOVED / RENAMED）；每 requirement 含 SHALL/MUST + `#### Scenario:` |
| 2c (opt) | `design.md` | 只有需要解釋技術決策時才寫；brainstorm 可能已經預填 |
| 2d | `tasks.md` | 粗粒度 checkbox（`- [ ] X.Y 描述`），會被 apply 追蹤進度 |
| 2e | `plan.md` | `/opsx:continue` 觸發 `superpowers:writing-plans`，把 tasks 拆成 2-5 分鐘 micro-step |

完成後跑：

```bash
openspec validate --all --json
# → 本地 git hook 已經掛了 pre-commit，commit 時會自動驗證
```

---

### 步驟 3：Apply（實作階段）

```bash
/opsx:apply
```

這會觸發 [schema.yaml](./schema.yaml) `apply.instruction` 的 4 個步驟：

#### 3-1. Workspace — 呼叫 `superpowers:using-git-worktrees`

- 建立 `.worktrees/<change-name>/` 隔離工作區
- 切到新 branch
- 跑專案 setup、確認 test baseline 乾淨

#### 3-2. Executor — 呼叫 `superpowers:subagent-driven-development`（2a 預設路徑）

- Main agent 讀 plan.md，為每個 micro-task **派發 fresh subagent**
- 每個 subagent 內部會自動：
  - **TDD enforcement**（`superpowers:test-driven-development` 傳遞觸發）
    - 先寫 failing test
    - 看著它 fail
    - 寫最小程式碼讓它 pass
    - 寫 production code **前**沒測試？刪掉重來
  - **Per-task code review**（`superpowers:requesting-code-review` 傳遞觸發）
    - spec compliance review（有符合 plan 嗎？）
    - code quality review（有 smell 嗎？）
    - Critical issue 擋下進度
- Coarse task 完成就更新 `tasks.md` checkbox
- 全部 task 跑完後，對整個 implementation 再做一次 final code review

> **2b fallback**：只在當前平台沒有 subagent 支援時才改用 `superpowers:executing-plans`。Claude Code 有 subagent，所以永遠用 2a。若被迫使用 2b，需自行手動維持 TDD 紀律並呼叫 `superpowers:requesting-code-review`。

#### 3-3. Verification — 呼叫 `openspec-verify-change`（產出 `verify.md`）

5 項檢查：

1. **Structural validation**：`openspec validate --all --json` 全部 PASS
2. **Task completion**：`tasks.md` 所有 `- [ ]` 變 `- [x]`
3. **Delta spec sync state**：`changes/<name>/specs/` 是否已 sync 到 `openspec/specs/`
4. **Design / specs coherence**：抽查 design 決策與 specs requirement 是否一致（非阻塞警告）
5. **Implementation signal**：worktree 沒有未 staged 檔案

若有失敗項目，退回對應 artifact 修正後重跑 verify。

#### 3-4. Completion — 呼叫 `superpowers:finishing-a-development-branch`

- 確認 tests 全綠
- 呈現選項：merge / PR / keep branch / discard
- 清理 worktree

---

### 步驟 4：Archive

```bash
/opsx:archive my-feature
```

- 驗證 + 檢查 task 完成度（未完成會 warn，不 block）
- 同步 delta specs 回 `openspec/specs/<capability>/spec.md`
  - 順序：RENAMED → REMOVED → MODIFIED → ADDED
  - 若已手動 sync 過，可用 `--skip-specs`
- 把 `changes/my-feature/` 整個搬到 `changes/archive/YYYY-MM-DD-my-feature/`
- 歷史定格，unix 時間線視為 source of truth

---

## 五、實際 CLI cheat sheet

| 情境 | 指令 |
|---|---|
| **首次 clone 專案後** | `bash scripts/install-git-hooks.sh` |
| 新 change（互動式一步步） | `/opsx:new <name> --schema sdd-plus-superpowers` 接著 `/opsx:continue` 若干次 |
| 新 change（一鍵補齊所有 artifact） | `/opsx:ff <name>` |
| 恢復中斷的 change | `/opsx:continue <name>` |
| 進入實作 | `/opsx:apply <name>` |
| 手動 verify | `/opsx:verify <name>` |
| 歸檔 | `/opsx:archive <name>` |
| 用原生 OpenSpec schema（跳過 brainstorm） | `/opsx:new <name> --schema spec-driven` |
| 查看專案所有 schema | `openspec schemas` |
| 查看當前 change 進度 | `openspec status --change <name> --json` |
| 列出 active changes | `openspec list` |
| 全專案驗證 | `openspec validate --all --json` |

---

## 六、整合的精巧之處（值得記住的 5 個設計）

### 1. Output redirection

Superpowers 的 brainstorming 原本會寫到 `docs/superpowers/specs/`，writing-plans 寫到 `docs/superpowers/plans/`。我們的 artifact instruction **覆寫這個行為**，透過 prompt 上下文注入「寫到 change 目錄」的指示。不改 superpowers 源碼、不改 OpenSpec CLI。

### 2. Schema-level vs prompt-level 整合

整合完全發生在 `instruction` 欄位（純 prompt）。如果 superpowers 升級了某個 skill 的行為，我們**完全不用動 schema**。只有當 skill 被重新命名或移除時才需要 touch schema.yaml。

### 3. 傳遞依賴顯式化

TDD 和 code-review 原本藏在 subagent-driven-development 內部（SKILL.md 裡才看得到）。schema 在 apply step 2a 的 instruction 裡**直接列出**這兩個 transitive activation，讓讀者一眼就看懂「apply 階段到底會發生什麼」。

### 4. Fallback 路徑誠實標註

2b（executing-plans）存在但標為「platforms without subagent support」的 fallback，引用 superpowers 官方 SKILL.md L14 原文。我們不發明「小 change 用 2b」這種自創規則。

### 5. Verify 是 schema graph 的 leaf 但實際在 apply 之後

`verify` 的 `requires: [plan]` 只是為了讓 schema graph 完整；它的 instruction 明寫「**MUST run on a completed implementation, NOT during planning**」。這是 OpenSpec DAG 與實際時序的刻意錯位，為的是讓 `openspec status` 能顯示 verify 進度。

---

## 七、採用本 schema 的專案建議補充一個 snapshot 區段

建議每個採用 `sdd-plus-superpowers` 的專案，在自家 repo 的對應文件裡維護一份如下格式的 snapshot，讓新成員 onboarding 時一眼看清楚「本 repo 現在長什麼樣」：

```markdown
## 本專案現況（snapshot: YYYY-MM-DD）

- **OpenSpec CLI**：v<version>
- **Schema**：`sdd-plus-superpowers` v<n>
- **Specs（bounded-context 粒度）**：<n> domain 存在、<n> domain 預留 lazy backfill
  - 已存在：`<capability-a>` / `<capability-b>` / ...
  - 預留：`<capability-c>` / ...
- **Automation**：<pre-commit / CI 跑什麼 openspec 指令>
- **Superpowers plugin**：`superpowers@<version>` 安裝於 `<path>`，本整合用到 N 個 skill
```

> 此 snapshot 區段會隨時間 stale，權威狀態請用 `openspec list` + `openspec schemas` 現場查。

---

## 八、最重要的一件事

整合的核心價值不是「把很多 skill 串起來」，而是：

> **把「需求對齊」（OpenSpec）和「嚴謹執行」（Superpowers）接起來，讓一個 change 從「想做什麼」到「code 已經通過 TDD + code review」這整條路徑全部可追溯、可重跑、可審計。**

傳統流程的斷點是：

- 需求在 Slack / 對話中 → apply 階段 LLM 靠記憶做事 → 對不上 spec
- 或：spec 寫在 Confluence → code 在 repo → 兩者漂移

sdd-plus-superpowers 的兩層約束解決這個問題：

1. **OpenSpec 的 delta spec 治理** → 確保「要做什麼」不會漂移
2. **Superpowers 的 subagent-driven + TDD + review** → 確保「已經做的」有品質紀律

換個角度看：OpenSpec 負責**把需求從對話中救出來**，Superpowers 負責**把紀律從人類意志中救出來**。兩者結合才是完整的 spec-driven development。

---

## 相關文件

- [schema.yaml](./schema.yaml) — 本 schema 的機器可讀定義
- [README.md](./README.md) — schema 的設計動機與高層概覽
- [templates/](./templates/) — 各 artifact 的 markdown 模板
- [../../specs/README.md](../../specs/README.md) — capability 領域歸類指引
- [openspec-conventions spec](https://github.com/Fission-AI/OpenSpec/blob/main/openspec/specs/openspec-conventions/spec.md) — OpenSpec 官方 conventions
- [obra/superpowers](https://github.com/obra/superpowers) — Superpowers skill 來源
