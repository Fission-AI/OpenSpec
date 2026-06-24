# RFC: 修復 OpenSpec 並行 archive 丟失 scenario 的合併語義

- 狀態：Draft（分析 + 設計，尚未實作）
- 日期：2026-06-24
- 相關文件：`openspec-parallel-merge-plan.md`（既有 4 階段 remediation plan）
- 範圍：`src/core/specs-apply.ts`、`src/core/archive.ts`、`src/core/parsers/requirement-blocks.ts`、`src/core/validation/validator.ts`

---

## 1. 問題陳述

當兩個 active change 同時編輯（`MODIFIED`）同一個 `### Requirement:` 區塊時，archive 時後執行的 change 會整塊覆蓋前者，**前一個 change 已寫入 main spec 的 scenario 被無聲丟棄**。整個過程：

- 無 warning
- 無 diff
- 無 conflict marker
- archive 回報「成功」

結果 source-of-truth spec 遺失了一個已上線的 scenario。

### 觀察到的失效流程（plan 文件記載的 Windsurf vs. Kilo Code 案例）

| 步驟 | 動作 | main spec 狀態 |
|------|------|----------------|
| 1 | Change A（`add-windsurf-workflows`）對 `Slash Command Configuration` 加一個 Windsurf scenario | 含 Windsurf scenario |
| 2 | Change B（`add-kilocode-workflows`）從**前 Windsurf 版**的 spec 起手，對同一 requirement 加 Kilo Code scenario | （B 尚未 archive） |
| 3 | Change A archive | main 同時含 Windsurf + 既有 scenario |
| 4 | Change B archive：`buildUpdatedSpec` 看到 `Slash Command Configuration` 的 MODIFIED block，用 B 帶來的版本整塊替換 | **Windsurf scenario 消失** |

Change B 的 delta 從來不知道 Windsurf 存在，所以它整塊覆蓋時把 Windsurf 帶走了。

### 對本專案的實際風險

本專案傘狀 spec workflow（多個 `fr-liff-*` / `fr-*` change 並行修同一 capability spec）正是高發場景。只要兩個並行 change 都 `MODIFY` 同一個 `### Requirement:`，先 archive 的一方寫入的 scenario 會在後者 archive 時被悄悄抹除。

---

## 2. 根因（指到具體檔案:行）

### 根因 1（核心）：MODIFIED 為整塊取代語義

`src/core/specs-apply.ts` 的 `buildUpdatedSpec`：

- specs-apply.ts:240-243 — 把 main spec 既有 requirement blocks 建成 `nameToBlock` map，**key = requirement name**。
- specs-apply.ts:284-298 — MODIFIED 迴圈：對每個 delta block，第 **297 行 `nameToBlock.set(key, mod)`** 直接用 delta 帶來的整塊 `raw` **取代**既有 block。沒有 scenario 級 diff，沒有把既有 scenario 與 delta scenario 做聯集。
- specs-apply.ts:311-338 — 依原順序重組 requirements section，寫回的就是被整塊取代後的內容。

→ 替換的單位是「整個 requirement」，而非「scenario」。任何不在後 archive change delta 裡的 sibling scenario 都會遺失。

### 根因 2：缺 base fingerprint，無法偵測漂移

- change 不持久化「它作者當初基於哪個版本的 requirement 內容」。
- archive 時無從得知 main spec 自 change 起手後是否已被其他 change 改過。
- 經查證 `grep -rn 'fingerprint|meta.json|baseHash|sha256' src/`：唯一命中的 `src/core/validation/gate-checker.ts:63-73 computeFingerprint` 是**另一回事**——它雜湊 change **自身**的 artifact 檔（proposal/tasks/specs）來偵測 synthesis/gate review 是否過期，**不**雜湊 main spec 的 base requirement 內容。故 plan Phase 0 對「並行 archive」的 fingerprint 防護**完全未實裝**。

### 根因 3：delta 語言只到 requirement 粒度

- requirement-blocks.ts:119-142 `parseDeltaSpec` + :172-194 `parseRequirementBlocksFromSection`：解析最細只到 `### Requirement:` 區塊，把整塊 `raw` 當不可分割單位。
- change-parser.ts:84-149 `parseSpecDeltas` 同樣以 requirement 為單位產生 Delta。
- 沒有任何 `#### Scenario` 級的 operation 概念。即使引入 scenario 解析，沒有合併策略仍會丟 sibling 編輯。

### 根因 4：完全沒有 conflict UX

- archive.ts:227-267 — 對每個 specUpdate 直接 `buildUpdatedSpec` 後寫回，無跨 change 衝突偵測、無 conflict marker、無「請先 rebase」的 gate。
- validator.ts:115-274 `validateChangeDeltaSpecs` — 只檢查**單一 change 檔案內部**一致性（section 內重複名稱、跨 section MODIFIED/REMOVED/ADDED 衝突），**不**比對 main spec 現況，也**不**比對其他 active change。
- grep `<<<<<<<` / `change sync` / `rebase` / `diff3` 全 src/ 無命中 → plan Phase 1 rebase 流程未實裝。

---

## 3. plan 文件摘要（既有提案）

`openspec-parallel-merge-plan.md` 定義的 4 階段分層解法：

| Phase | 主題 | 內容 | 實裝狀態 |
|-------|------|------|----------|
| 0 | 止血（偵測 + 護欄） | 為每個 MODIFIED/REMOVED/RENAMED 記 base requirement 內容 + SHA-256 到 `changes/<id>/meta.json`；archive 前重算 main spec 的 requirement hash，不符即 abort 要求 rebase | ❌ 未實裝 |
| 1 | 作者端 rebase | 新增 `openspec change sync <id>`：讀 base 快照 + 現況 + delta 做 per-requirement 3-way（diff3）merge；乾淨則改寫 MODIFIED block 並刷新 fingerprint，衝突則寫入 conflict marker 要求手改 | ❌ 未實裝 |
| 2 | 提高 delta 粒度 | delta 語言加 scenario 級指令（`## ADDED Scenarios` / `## MODIFIED Scenarios`）+ 穩定 scenario ID；parser 與 buildUpdatedSpec 改為合併 scenario 清單 | ❌ 未實裝 |
| 3 | 結構化 spec graph（長期） | 穩定 requirement UUID、AST/IR、OT/CRDT 保證合併結合律、與 Git 整合 | ❌ 未實裝 |

建議的核心機制三件套：**fingerprinting**（偵測漂移）、**merge strategy**（scenario 級合併）、**conflict marker**（Git 風格人工調解）。

---

## 4. 修法選項

### 選項 A — archive 前 fingerprint gating（偵測並硬擋，Phase 0 止血）

**做法**：
1. scaffold / validate change 時，對每個 `MODIFIED`/`REMOVED`/`RENAMED` 的 requirement，從當時 main spec 抓 base 內容，存 raw + SHA-256 到 `changes/<id>/meta.json`。
2. `buildUpdatedSpec` 在 specs-apply.ts:284 MODIFIED 迴圈**之前**插入比對：重算 main spec 現況該 requirement 的 hash，與 meta.json 存的 base hash 不符 → throw，archive abort，提示「main spec 已被其他 change 改動，請先 rebase」。
3. CLI 輸出指出哪些 requirement 漂移、被誰改過。

**效果**：不修復合併能力，但讓「資料遺失路徑」變成不可能——衝突時硬擋而非無聲覆蓋。

| 維度 | 評估 |
|------|------|
| Scope | 窄。集中在 specs-apply.ts + 一個 meta.json 寫入點；archive.ts 流程不變 |
| Risk | 低。純增量加 gate，不改既有 merge 行為；最壞情況是「正常 archive 被誤擋」需 escape hatch（`--accept-outdated`） |
| Reversibility | 乾淨。拔掉 gate 即回原狀；meta.json 為附加檔 |

**缺點**：使用者仍需手動 rebase；無自動合併。對「真並行」是擋而非解。

### 選項 B — scenario-level 真正 merge（Phase 2 根治）

**做法**：
1. 擴充 delta 語言與 parser（requirement-blocks.ts `parseDeltaSpec`、change-parser.ts `parseSpecDeltas`）理解 `#### Scenario` 級 operation，並引入穩定 scenario ID（顯式或雜湊）。
2. `buildUpdatedSpec` 的 MODIFIED 改為：取既有 requirement 的 scenario 清單，與 delta 的 scenario operation 做**聯集 / 取代 / 刪除**，而非整塊覆蓋。新 scenario 以決定性順序插入。
3. 只有當兩個 change 改**同一個 scenario 本體**時才落到衝突，交給 Phase 1 rebase 流程。

**效果**：多數並行更新變成可交換（commutative），根本消除「加不同 scenario 互相覆蓋」。

| 維度 | 評估 |
|------|------|
| Scope | 大。動 parser、change-parser、buildUpdatedSpec merge 核心、validator，且需既有 spec/change 的 scenario ID migration |
| Risk | 中高。改動核心合併演算法，回歸面廣；需大量 fixture 覆蓋插入順序、刪除、重命名交互 |
| Reversibility | 需 migration（注入 scenario ID + 改寫 in-flight delta），不可全可逆 |

**缺點**：工程量大、需 migration、需新 delta 格式文件與 AI 指引更新。

### 選項 C（折衷，建議落地路徑）— 先 A 止血，再漸進 B

先實作選項 A 杜絕資料遺失（小、可逆、低風險），把選項 B 列為獨立後續 RFC 分階段推進。對應 plan 的 Phase 0 → Phase 1 → Phase 2 漸進採用節奏。

---

## 5. 建議

**先採用選項 A（Phase 0 fingerprint gating）止血，選項 B（scenario merge）列為後續工程。** 理由：

1. 本 bug 是**無聲資料遺失**，止血優先於完美合併——「擋住」遠勝於「悄悄吃掉已上線 scenario」。
2. 選項 A scope 窄、可逆、風險低，能在不改既有 merge 行為下立即上線。
3. 選項 B 雖根治但 scope 大、需 migration，貿然先做風險高；待 A 穩定後再漸進。
4. 需用戶確認可接受「archive 在偵測到並行衝突時硬擋 + 提供 `--accept-outdated` 緊急 escape hatch」的 UX。

---

## 6. 實作該動哪些檔案（依選項）

### 選項 A

| 檔案 | 動作 |
|------|------|
| `src/core/specs-apply.ts` | `buildUpdatedSpec` 在 :284 MODIFIED 迴圈前加 base-hash 比對，不符即 throw；REMOVED(:270)/RENAMED(:247) 同理 |
| change scaffold/validate 路徑（呼叫端，含 `validateChangeDeltaSpecs` 附近） | 對 MODIFIED/REMOVED/RENAMED requirement 從 main spec 抓 base raw + SHA-256，寫 `changes/<id>/meta.json` |
| `src/core/archive.ts` | 把 base-hash 不符的 throw 訊息轉成清楚的「請先 rebase / 用 --accept-outdated」CLI 輸出；接 escape-hatch flag |
| `src/core/validation/validator.ts` | 可選：archive 前主動報告漂移的 requirement 清單 |
| 新增測試 fixture | 兩個 change 改同一 requirement、base 漂移情境 |

### 選項 B（後續）

| 檔案 | 動作 |
|------|------|
| `src/core/parsers/requirement-blocks.ts` | `parseDeltaSpec` / `parseRequirementBlocksFromSection` 加 `#### Scenario` 級解析 |
| `src/core/parsers/change-parser.ts` | `parseSpecDeltas` 產生 scenario 級 Delta |
| `src/core/specs-apply.ts` | `buildUpdatedSpec` MODIFIED 改為 scenario 清單合併（聯集/取代/刪除 + 決定性排序），取代 :297 整塊 set |
| `src/core/validation/validator.ts` | 加 scenario ID 唯一性、scenario 級衝突檢查 |
| migration 腳本 | 為既有 spec 注入 scenario ID、改寫 in-flight change delta |
| 文件 / AGENTS | 新 delta 格式說明、rebase 工作流、AI 指引 |

---

## 7. 待澄清 / 風險（沿用 plan 開放問題）

- 多個 change 在不同位置插 scenario 時的排序規則（`position` metadata vs. 決定性字母序 fallback）。
- 使用者刪掉 `meta.json` 的優雅失效模式（CLI 應能按需重建 fingerprint）。
- 離線作者無法 archive 前跑 sync 的緊急出口（`--accept-outdated`）。
- 歷史已 archive change 的 fingerprint 回填 migration。
