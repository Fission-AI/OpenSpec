# OpenSpec Fork 收斂盤點（upstream/main..HEAD = 40 commits）

Repo: `openspec-fork`（`origin` = stanleykao72/OpenSpec，`upstream` = Fission-AI/OpenSpec）
消費者：odoo-claude-code 的 opsx overlay 層（`openspec/plugins/odoo-lifecycle`）
決策前提：選項C — 回 upstream，只有 P3+ 需求才動 fork

## 摘要表

| 類別 | 定義 | 數量 |
|------|------|------|
| **U** 可上 upstream | 通用 fix/feature，無 Odoo 綁定 | 7 |
| **K** 必留 fork（核心 infra） | plugin/gate/pipeline/overlay 核心機制，改 core、overlay 無法自我承載 | 16 |
| **O** 可轉 overlay/plugin | Odoo/專案特化 schema 內容，可搬進 odoo-claude-code plugin | 5 |
| **M** merge/雜訊 | upstream merge、parity hash、rebase/reconcile — 收斂後自然消失 | 12 |
| 合計 | | 40 |

> 關鍵：**K=16 全是「plugin 系統本體」**（不是散落的 hack），而 O 全是「跑在 plugin 系統上的 Odoo 資料」。fork 的不可約核心 = 一套 plugin/gate/pipeline/overlay 引擎。

---

## U — 可上 upstream（7）

| sha | 說明 | 收斂動作 |
|-----|------|---------|
| `11c22d2` | `changesDir` 可設定（monorepo/vault 支援）；取代 16 處硬編 `openspec/changes` | 開 upstream PR（通用 monorepo 需求）。⚠️ 這正是 split-brain 一半的來源，見下 |
| `56f4771` | config 驗證跳過屬於他 schema 的 rules keys（#11） | 開 PR，純 bug fix |
| `2ada5c1` | `loadTemplate` 依形狀分辨 inline vs 檔名（odoo-trivial inline template 修復） | 開 PR，loader 健壯性通用 |
| `70f2958` | archive-change 用 inline delta→main 取代不存在的 `openspec-sync-specs` skill | 開 PR，修 core template 壞引用 |
| `0818116` | RFC：parallel-archive scenario-loss bug（`specs-apply.ts` 整塊覆蓋無 scenario merge）（#14） | 連同修法送 upstream issue/PR，底層 bug 是 upstream 的 |
| `13bb4e9` | ZshInstaller 測試與真實 Oh My Zsh 環境隔離 | 開 PR，通用測試健壯性 |
| `778f1a5` | `.gitignore` 加 `.actrc` | 瑣碎，可併入任一 PR 或棄 |

## K — 必留 fork：plugin/gate/pipeline/overlay 核心引擎（16）

這些改 **core src**（`src/core/plugin`、`pipeline`、`validation/gate-*`、`templates/workflows`、`artifact-graph`），overlay 層是它們的**消費者**，無法自我承載。今日狀態 = K；但這整包正是**唯一該向 upstream 提案的大東西** — upstream 若收，fork 歸零退役；不收，則 fork 就縮成這 16 個 commit 的長期薄 patch。

| sha | 說明 |
|-----|------|
| `a3a0270` | **keystone** — plugin 系統（lifecycle hooks / custom gates / bundled schemas） |
| `a037ec5` | plugin 經 `skill_overlays` 注入 skill 內容 |
| `6ba2731` | 上者 README 文件 |
| `63cae69` | verify + archive phase schema 支援（#2） |
| `34af9ac` | CLI-native 平行執行 orchestration hints（#3） |
| `a324c3c` | 自動 gate/hook 執行的 pipeline runner（#4） |
| `df81ea0` | covers 自動注入 + change-class 路由 + escape hatch（#5） |
| `1b0cc82` | schema-level quality gates + TDD steps（機制部分；含 odoo-sdd schema 資料屬 O） |
| `375ce99` | gate 合成的 content fingerprinting 偵測 staleness（#10） |
| `4c762cc` | gate schema/GateChecker/apply 的 63 支測試 |
| `c552889` | schema `default_mode` + `--sequential` flag（#7） |
| `5e0c7db` | plugin hook script 從 plugin dir 解析而非 project root（#6） |
| `fbec042` | plugin-provided schema 在 CLI 的解析修復（#8） |
| `9446dbd` | `loadTemplate` 傳入 `loadedPlugins` 給 `getSchemaDir`（#9） |
| `868e51f` | apply step 6 加 overlay-precedence 前指（P4） |
| `2757192` | 讓 plugin overlay 接管 apply/verify、移除 fork-only run/gate（#15） |

## O — 可轉 odoo-claude-code plugin（5）

純 `schemas/odoo-*` 資料檔。plugin 系統（K）就是為了讓這些 schema 由 plugin bundle 提供 → 應搬出 fork。

| sha | 說明 | 收斂動作 |
|-----|------|---------|
| `acea753` | odoo-workflow schema + Odoo templates | 搬進 odoo-lifecycle plugin 的 bundled schemas |
| `39f5636` | odoo-workflow lifecycle addon（verify/archive yaml） | 同上 |
| `22dde36` | odoo-workflow spec template 格式強化（防 archive parse 失敗） | 同上 |
| `c0f249b` | odoo-sdd / odoo-workflow schema 對齊 PR→master 流程 | 同上 |
| `696078c` | odoo-sdd 加 archive phase（worktree-cwd parity） | 同上；`1b0cc82` 內的 odoo-sdd schema 資料一併搬 |

## M — merge/雜訊，收斂後自然消失（12）

| sha | 說明 |
|-----|------|
| `6808d07` | Merge upstream v1.4.1（247 files） |
| `e85ff58` | reconcile fork 客製 vs v1.4.1 新測試（45→0）；真實修都是 fork-parity glue |
| `54a5334` | v1.3.1 merge 後 skill-template parity hash 更新（9 個） |
| `3ae7980` | Merge v1.3.1（#12） |
| `7a66a9f` | Merge v1.3.1 進 sync branch |
| `67ff635` | Merge PR #13 tracking docs |
| `3ab9e3b` | upstream-contribution 追蹤 docs（fork 內部 openspec/changes） |
| `bbee45c` | CORE_WORKFLOWS union 後 test rename |
| `794b133` | v1.3.0 merge 後 rebase artifact 修復 |
| `2c92b77` | 從 CLI dev config 移除 Odoo plugins |
| `354c7f2` | archive add-skill-overlays + sync specs |
| `9b3818e` | CORE_WORKFLOWS verify + gate exit code 測試更新 |

---

## Split-brain（1.4.1）現況：**未修，且被 v1.4.1 merge 固化**

fork 目前**同時存在兩套 changes 路徑解析**，彼此未對齊：

- **fork 舊系統** `getChangesDir()`（讀 `openspec/config.yaml` 的 `changesDir` → 指向 vault）
  被 `change` / `gate` / `run` / `validate` / `archive` / `list` / `specs-apply` 使用 → **解析到 vault**
- **v1.4.1 新系統** `resolveCurrentPlanningHomeSync()` / `PlanningHome`（`src/core/planning-home.ts`）
  被 `workflow/instructions.ts`（apply / verify / new 的路徑）使用 → **解析到 repo-local workspace**

這正是 memory `reference-openspec-141-split-workspace` 記的「new/status 讀 repo-local、run/validate 讀 vault」。根因是 **`6808d07` 引入 v1.4.1 的 planning-home，但沒把 fork 的 `changesDir`（`11c22d2`）併進去** → 兩套解析並存。**沒有任何 commit 修掉它。**

修法歸屬：統一 workspace/changes 解析屬 **U**（upstream 自己的 planning-home 也該尊重 config 化的 changes 位置），但實務上是 fork changesDir × upstream planning-home 的碰撞，fork 必須主動收斂。建議併進 `11c22d2` 的 upstream PR 一起提。

---

## 建議收斂順序

1. **先 O（5）** — 把 `schemas/odoo-*` 搬進 odoo-claude-code 的 odoo-lifecycle plugin（bundled schemas）。fork 立刻瘦身、驗證 plugin 系統確實能 host 這些 schema。
2. **再 U（7）** — 逐個開 upstream PR（`11c22d2` + split-brain 統一解析合併成一支 workspace PR；其餘獨立）。減少長期 patch 面積。
3. **K 的抉擇（16）** — 把 plugin/gate/pipeline/overlay 引擎整理成一份 upstream RFC/PR 提案：
   - **upstream 收** → fork 歸零，直接退役改用 upstream npm 包 + odoo-lifecycle plugin。
   - **upstream 不收** → fork 縮成這 16 個 commit 的**薄 patch**，每次 release rebase；O 已外移、U 已上游、M 每次 converge 自動消失。
4. **M（12）** — 不需處理，收斂完成後自然歸零。

## Fork 退役可行性

**今日不可直接退役**：K=16 是「plugin 系統本體」，跑在 core，overlay 無法自我承載，upstream 也還沒有。
**退役條件**：K 的 upstream RFC 被接受。屆時 fork→0（U 已上游、O 已進 plugin、M 消失、K 歸零），可切回 upstream npm 包。在那之前，最務實狀態是「fork = 16-commit 薄 patch」，比現在 40 commit + 多重 merge 乾淨得多。
