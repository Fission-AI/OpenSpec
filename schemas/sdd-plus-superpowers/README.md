# sdd-plus-superpowers Schema

將 OpenSpec 的 artifact 治理流程與 Superpowers 的執行技能整合為單一工作流。

## 這個 Schema 解決什麼問題

OpenSpec 管理「做什麼」（proposal → specs → design → tasks），Superpowers 管理「怎麼做」（brainstorming、writing-plans、subagent-driven-development）。兩者各自優秀，但在實際開發中交替使用時出現三個結構性問題：

1. **產出重複** — brainstorming 產出設計文件在 Superpowers 目錄（`docs/superpowers/specs/`），OpenSpec 又在 change 目錄重新撰寫 proposal/design，內容高度重疊。
2. **Task 分裂** — OpenSpec 的 `tasks.md`（粗粒度 checkbox）和 Superpowers 的 plan（微型 TDD 步驟）描述同一件事，但格式、位置、狀態追蹤各自獨立。
3. **手動編排** — 使用者必須自行判斷「現在該用哪個技能」，兩個系統之間沒有自動銜接。

### 為什麼用自定義 Schema 而非修改現有技能

曾考慮兩種替代方案：

- **在 config.yaml 加自定義欄位**（如 `skill_bindings`）：OpenSpec CLI 不認識這些欄位，無驗證、無發現性，且需要修改多個 SKILL.md 才能讀取。
- **直接修改 opsx 技能檔案**：侵入性高，影響所有 change，且 SKILL.md 升級時會被覆蓋。

自定義 schema 利用 OpenSpec **原生支援的專案級 schema 機制**：
- CLI 會驗證 schema 結構
- `openspec schemas` 自動列出
- 每個 change 可獨立選擇 schema（`--schema spec-driven` 或 `--schema sdd-plus-superpowers`）
- 不動任何現有 SKILL.md 或 command 檔案

---

## 工作流概覽

```
brainstorm ──→ proposal ──→ specs ──→ tasks ──→ plan
                  │                     ↑
                  └──→ design ──────────┘
```

與 `spec-driven` 的差異：

| | spec-driven | sdd-plus-superpowers |
|---|---|---|
| 起點 | proposal（手動撰寫） | **brainstorm**（調用 brainstorming skill） |
| 終點 | tasks（粗粒度） | **plan**（微型 TDD 步驟） |
| apply 需要 | tasks | **plan** |
| apply 方式 | 標準 task-by-task | **worktree + subagent-driven-development** |
| 新增 artifacts | — | brainstorm, plan |

---

## 整合的 Superpowers 技能

| Schema 階段 | 調用的 Superpowers 技能 | 觸發方式 |
|------------|------------------------|---------|
| brainstorm artifact | `superpowers:brainstorming` | artifact instruction 指示 |
| plan artifact | `superpowers:writing-plans` | artifact instruction 指示 |
| apply phase | `superpowers:using-git-worktrees` | apply instruction 指示 |
| apply phase | `superpowers:subagent-driven-development` | apply instruction 指示 |
| apply 完成後 | `superpowers:finishing-a-development-branch` | apply instruction 指示 |

所有整合都透過 schema.yaml 的 `instruction` 欄位實現 — 指示 AI 在適當時機用 Skill tool 調用對應技能。不修改任何 Superpowers 技能檔案本身。

### Output Redirection（產出重導）

Superpowers 技能有預設的輸出路徑（如 brainstorming 寫到 `docs/superpowers/specs/`）。在此 schema 中，artifact instruction 包含重導指示，告知被調用的技能將產出寫入 change 目錄：

- brainstorming → `openspec/changes/<name>/brainstorm.md`（+ 可選 `design.md`）
- writing-plans → `openspec/changes/<name>/plan.md`

這透過上下文注入實現（在調用技能時附加指示），而非修改技能程式碼。

---

## 使用方式

### 快速流程（推薦）
```bash
/opsx:ff my-feature    # 一條龍：建目錄 + brainstorm + proposal + design + specs + tasks + plan
/opsx:apply            # worktree + subagent-driven-development
/opsx:archive          # 封存
```

### 逐步流程
```bash
/opsx:new my-feature --schema sdd-plus-superpowers
/opsx:continue         # → brainstorm（互動式對話）
/opsx:continue         # → proposal
/opsx:continue         # → design
/opsx:continue         # → specs
/opsx:continue         # → tasks
/opsx:continue         # → plan
/opsx:apply
/opsx:archive
```

### 切回 spec-driven
```bash
# 單一 change 使用不同 schema
/opsx:new my-simple-fix --schema spec-driven

# 或修改專案預設
# openspec/config.yaml: schema: spec-driven
```

---

## 設計決策紀錄

### 為什麼 brainstorm 是 artifact 而非 hook

brainstorming 是互動式多輪對話，需要使用者參與。將它做為第一個 artifact 而非 schema-level hook，有兩個好處：
1. **可跳過** — 如果使用者已經知道要做什麼，可以直接建立 brainstorm.md 而不調用技能
2. **可追蹤** — `openspec status` 能顯示 brainstorm 是否完成，後續 artifacts 有明確的依賴關係

### 為什麼 plan 獨立於 tasks

`tasks.md` 是粗粒度的 checkbox（「新增 PdfServiceTest」），`plan.md` 是微型步驟（「建立測試骨架 → 寫 downloadPdf 測試 → 執行 → commit」）。兩者的粒度和用途不同：
- `tasks.md` → 追蹤整體進度（apply phase 的 `tracks` 欄位解析 checkbox）
- `plan.md` → 指導 subagent 逐步實作（executor 的輸入）

apply phase 要求 `plan` 而非 `tasks`，因為 executor 需要微型步驟才能有效工作。但 `tracks: tasks.md` 確保進度仍由粗粒度 checkbox 追蹤。

### 降級策略

如果 Superpowers 技能不可用（未安裝、版本不相容等），每個 instruction 都包含降級路徑：
- brainstorm → 手動撰寫 brainstorm.md
- plan → 手動撰寫 plan.md
- apply → 標準 task-by-task 手動實作
