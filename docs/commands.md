# 命令

這是 OpenSpec 的斜杠命令的參考。這些命令在 AI 編碼助理的聊天介面中呼叫（例如 Claude Code、Cursor、Windsurf）。

有關工作流程模式以及何時使用每個命令，請參閱 [工作流程](workflows.md)。對於 CLI 命令，請參見 [CLI](cli.md).

## 快速參考

### 預設快速路徑 (`core` 輪廓）

| 命令 | 目的 |
|---------|---------|
| `/opsx:propose` | 一步建立變更並產生規劃工件 |
| `/opsx:explore` | 在做出改變之前仔細考慮想法 |
| `/opsx:apply` | 實施變革中的任務 |
| `/opsx:archive` | 歸檔已完成的更改 |

### 擴充工作流程指令（自訂工作流程選擇）

| 命令 | 目的 |
|---------|---------|
| `/opsx:new` | 開始新的變革鷹架 |
| `/opsx:continue` | 根據依賴關係建立下一個工件 |
| `/opsx:ff` | 快轉：立即建立所有計劃工件 |
| `/opsx:verify` | 驗證實作是否符合工件 |
| `/opsx:sync` | 將增量規格合併到主要規格中 |
| `/opsx:bulk-archive` | 一次存檔多個更改 |
| `/opsx:onboard` | 完整工作流程的指導教程 |

預設的全域設定檔是 `core`。若要啟用擴充工作流程指令，請執行 `openspec config profile`，選擇工作流程，然後執行 `openspec update` 在你的專案中。

---

## 命令參考

### `/opsx:propose`

一步建立新變更並產生規劃工件。這是預設的啟動命令 `core` profile.

**句法：**
```text
/opsx:propose [change-name-or-description]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name-or-description` | 不 | 烤肉串名稱或簡單語言變更描述 |

**它的作用：**
- 創造 `openspec/changes/<change-name>/`
- 產生實施前所需的工件（例如 `spec-driven`：提案、規格、設計、任務）
- 當更改準備就緒時停止 `/opsx:apply`

**範例：**
```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md
     ✓ specs/ui/spec.md
     ✓ design.md
     ✓ tasks.md
     Ready for implementation. Run /opsx:apply.
```

**尖端：**
- 使用它來實現最快的端到端路徑
- 如果您想要逐步控制工件，請啟用擴充工作流程並使用 `/opsx:new` + `/opsx:continue`

---

### `/opsx:explore`

在做出改變之前，仔細思考想法、調查問題並澄清要求。

**句法：**
```
/opsx:explore [topic]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `topic` | 不 | 您想要探索或調查的內容 |

**它的作用：**
- 開啟探索性對話，無需任何結構
- 研究程式碼庫以回答問題
- 比較選項和方法
- 建立可視化圖表以闡明思維
- 可以過渡到 `/opsx:propose` （預設）或 `/opsx:new` （擴充工作流程）當見解具體化時

**範例：**
```text
You: /opsx:explore

AI:  What would you like to explore?

You: How should we handle authentication for the mobile app?

AI:  Let me investigate your current auth setup...
     [Analyzes codebase]

     I see you're using session-based auth for the web app.
     For mobile, we have three main options:

     1. JWT tokens (stateless, works offline)
     2. OAuth2 (if you need third-party login)
     3. Extend current sessions (simpler, but requires connectivity)

     Your API already has CORS configured. Which direction interests you?

You: Let's go with JWT. Can we start a change for that?

AI:  Ready when you are. Run /opsx:propose add-jwt-auth to begin.
```

**尖端：**
- 當需求不明確或需要調查時使用
- 探索期間不會建立任何工件
- 適合在做出決定之前比較多種方法
- 可以讀取文件並蒐索程式碼庫

---

### `/opsx:new`

開始一個新的變革鷹架。建立更改資料夾並等待您使用以下命令產生工件 `/opsx:continue` 或者 `/opsx:ff`.

此命令是擴充工作流程集的一部分（不包含在預設的工作流程集中） `core` 輪廓）。

**句法：**
```
/opsx:new [change-name] [--schema <schema-name>]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 更改資料夾的名稱（如果未提供，則會出現提示） |
| `--schema` | 不 | 要使用的工作流程架構（預設：來自設定或 `spec-driven`) |

**它的作用：**
- 創造 `openspec/changes/<change-name>/` 目錄
- 創造 `.openspec.yaml` 更改資料夾中的元資料文件
- 顯示第一個準備建立的工件模板
- 如果未提供，則提示變更名稱和架構

**它創造了什麼：**
```
openspec/changes/<change-name>/
└── .openspec.yaml    # Change metadata (schema, created date)
```

**範例：**
```
You: /opsx:new add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     Schema: spec-driven

     Ready to create: proposal
     Use /opsx:continue to create it, or /opsx:ff to create all artifacts.
```

**尖端：**
- 使用描述性名稱： `add-feature`, `fix-bug`, `refactor-module`
- 避免使用通用名稱，例如 `update`, `changes`, `wip`
- 架構也可以在專案設定中設定（`openspec/config.yaml`)

---

### `/opsx:continue`

建立依賴鏈中的下一個工件。一次建立一個工件以實現增量進度。

**句法：**
```
/opsx:continue [change-name]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 繼續進行哪些更改（如果未提供，則從上下文推斷） |

**它的作用：**
- 查詢工件依賴圖
- 顯示哪些工件已準備就緒，哪些工件已阻止
- 建立第一個準備好的工件
- 讀取上下文的依賴文件
- 顯示已建立後可用的內容

**範例：**
```
You: /opsx:continue

AI:  Change: add-dark-mode

     Artifact status:
     ✓ proposal    (done)
     ◆ specs       (ready)
     ◆ design      (ready)
     ○ tasks       (blocked - needs: specs)

     Creating specs...

     [Reads proposal.md, creates specs based on requirements]

     ✓ Created openspec/changes/add-dark-mode/specs/ui/spec.md

     Now available: tasks
     Run /opsx:continue to create the next artifact.
```

**尖端：**
- 當您想要在繼續之前檢視每個工件時使用
- 適合需要控制的複雜變更
- 多個工件可能同時準備就緒
- 您可以在繼續之前編輯已建立的工件

---

### `/opsx:ff`

透過工件建立快轉。立即建立所有計劃工件。

**句法：**
```
/opsx:ff [change-name]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 哪個更改為快進（如果未提供，則從上下文推斷） |

**它的作用：**
- 按依賴順序建立所有工件
- 透過待辦事項清單追蹤進度
- 當全部停止時 `apply-required` 工件已完成
- 在建立下一個工件之前讀取每個依賴項

**範例：**
```
You: /opsx:ff add-dark-mode

AI:  Fast-forwarding add-dark-mode...

     ✓ Creating proposal.md
     ✓ Creating specs/ui/spec.md
     ✓ Creating design.md
     ✓ Creating tasks.md

     All planning artifacts complete!
     Ready for implementation. Run /opsx:apply to begin.
```

**尖端：**
- 當您清楚地瞭解正在構建的內容時使用
- 快於 `/opsx:continue` 進行簡單的更改
- 之後您仍然可以編輯工件
- 適合中小型功能

---

### `/opsx:apply`

落实变革中的任务。完成任務列表，編寫程式碼並檢查項目。

**句法：**
```
/opsx:apply [change-name]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 要實施哪些變更（如果未提供，則從上下文推斷） |

**它的作用：**
- 讀 `tasks.md` 並識別未完成的任務
- 一項一項地完成任務
- 根據需要編寫程式碼、建立文件、執行測試
- 用核取方塊標記任務已完成 `[x]`

**範例：**
```
You: /opsx:apply

AI:  Implementing add-dark-mode...

     Reading tasks.md:
     - [ ] 1.1 Create ThemeContext
     - [ ] 1.2 Add CSS custom properties
     - [ ] 1.3 Implement localStorage persistence

     Working on 1.1: Create ThemeContext...
     [Creates src/context/ThemeContext.tsx]

     ✓ 1.1 Complete

     Working on 1.2: Add CSS custom properties...
     [Updates src/styles/globals.css]

     ✓ 1.2 Complete
     ...
```

**尖端：**
- 如果中斷可以從上次中斷的地方繼續
- 透過指定更改名稱用於平行更改
- 追蹤完成狀態 `tasks.md` 核取方塊

---

### `/opsx:verify`

驗證實作是否與您的變更工件相符。檢查完整性、正確性和連貫性。

**句法：**
```
/opsx:verify [change-name]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 要驗證哪些變更（如果未提供，則從上下文推斷） |

**它的作用：**
- 檢查實施品質的三個維度
- 搜尋程式碼庫以取得實作證據
- 報告分類為「嚴重」、「警告」或「建議」的問題
- 不阻止存檔，但會出現問題

**驗證尺寸：**

| 方面 | 它驗證了什麼 |
|-----------|-------------------|
| **完整性** | 所有任務已完成，所有要求已實現，並已覆蓋場景 |
| **正確性** | Implementation matches spec intent, edge cases handled |
| **連貫性** | 設計決策體現在程式碼中，模式一致 |

**範例：**
```
You: /opsx:verify

AI:  Verifying add-dark-mode...

     COMPLETENESS
     ✓ All 8 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "System preference detection" has no test coverage

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "CSS variables" but implementation uses Tailwind classes

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for system preference detection
     2. Update design.md to reflect Tailwind usage, or refactor to use CSS variables
```

**尖端：**
- 在歸檔之前執行以儘早發現不匹配情況
- 警告不會阻止存檔，但會指示潛在問題
- 適合在提交之前審查人工智慧的工作
- 可以揭示工件和實現之間的偏差

---

### `/opsx:sync`

**可選命令。 ** 將變更中的增量規格合併到主要規格中。如果需要，存檔將提示同步，因此您通常不需要手動執行此操作。

**句法：**
```
/opsx:sync [change-name]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 要同步的變更（如果未提供，則從上下文推斷） |

**它的作用：**
- 從變更資料夾讀取增量規格
- 解析 ADDED/MODIFIED/REMOVED/RENAMED 部分
- 將變更合併到主要內容中 `openspec/specs/` 目錄
- 保留增量中未提及的現有內容
- 不存檔更改（保持活動狀態）

**範例：**
```text
You: /opsx:sync

AI:  Syncing add-dark-mode delta specs...

     Reading: openspec/changes/add-dark-mode/specs/ui/spec.md
     Target:  openspec/specs/ui/spec.md

     Changes to apply:
     ✓ ADDED: Theme Selection requirement (2 scenarios)
     ✓ ADDED: Accessibility requirement (1 scenario)

     Merging...
     ✓ openspec/specs/ui/spec.md updated

     Change remains active. Run /opsx:archive when ready to complete.
```

**何時手動使用：**

| 設想 | 使用同步？ |
|----------|-----------|
| 長期執行的更改，在存檔之前需要主要規範 | 是的 |
| 多個並行更改需要更新的基本規格 | 是的 |
| 想要單獨預覽/檢查合併 | 是的 |
| 快速更改，直接存檔 | 否（存檔處理） |

**尖端：**
- 同步是智慧的，而不是複製貼上
- 可以將場景新增至現有需求而無需重複
- 同步後變更保持活動狀態（未存檔）
- 大多數用戶永遠不需要直接呼叫它 - 如果需要的話會出現存檔提示

---

### `/opsx:archive`

歸檔已完成的變更。 Finalizes the change and moves it to the archive folder.

**句法：**
```
/opsx:archive [change-name]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-name` | 不 | 要存檔的變更（如果未提供，則從上下文推斷） |

**它的作用：**
- 檢查工件完成狀態
- 檢查任務完成情況（如果未完成則發出警告）
- 如果尚未同步，則提供同步增量規格
- 將更改資料夾移至 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- 保留審計追蹤的所有工件

**範例：**
```text
You: /opsx:archive

AI:  Archiving add-dark-mode...

     Artifact status:
     ✓ proposal.md exists
     ✓ specs/ exists
     ✓ design.md exists
     ✓ tasks.md exists (8/8 tasks complete)

     Delta specs: Not yet synced
     → Sync now? (recommended)

You: Yes

AI:  ✓ Synced specs to openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/

     Change archived successfully.
```

**尖端：**
- 存檔不會阻止未完成的任務，但會發出警告
- Delta 規格可以在存檔期間或之前同步
- 存檔的更改將保留以供歷史記錄
- 使用 `/opsx:verify` 首先發現問題

---

### `/opsx:bulk-archive`

一次存檔多個已完成的變更。處理變更之間的規範衝突。

**句法：**
```
/opsx:bulk-archive [change-names...]
```

**參數：**
| 爭論 | 必需的 | 描述 |
|----------|----------|-------------|
| `change-names` | 不 | 存檔的具體變更（如果沒有提供則提示選擇） |

**它的作用：**
- 列出所有已完成的更改
- 歸檔前驗證每個更改
- 檢測變更之間的規範衝突
- 透過檢查實際實施的內容來解決衝突
- 按時間順序歸檔

**範例：**
```
You: /opsx:bulk-archive

AI:  Found 3 completed changes:
     - add-dark-mode (8/8 tasks complete)
     - fix-login-bug (3/3 tasks complete)
     - update-footer (2/2 tasks complete)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will merge in chronological order:
     1. add-dark-mode (created Jan 20)
     2. update-footer (created Jan 22)

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-bug
     ✓ Archived update-footer
     Specs merged: add-dark-mode → update-footer
```

**尖端：**
- 適合併行工作流程
- 衝突解決是代理的（檢查程式碼庫）
- 更改按建立順序存檔
- 覆蓋規範內容之前提示

---

### `/opsx:onboard`

引導入職完成完整的 OpenSpec 工作流程。使用实际代码库的交互式教程。

**句法：**
```
/opsx:onboard
```

**它的作用：**
- Walks through a complete workflow cycle with narration
- 掃描您的程式碼庫以尋找真正的改進機會
- Creates an actual change with real artifacts
- 實施實際工作（小的、安全的改變）
- 歸檔已完成的更改
- 解釋每一步發生的情況

**階段：**
1. 歡迎和程式碼庫分析
2. 尋找改進機會
3. 建立變更（`/opsx:new`)
4. 撰寫提案
5. 建立規格
6. 編寫設計
7. 建立任務
8. 實施任務（`/opsx:apply`)
9. 驗證實施情況
10. 歸檔變更
11. 摘要與後續步驟

**範例：**
```
You: /opsx:onboard

AI:  Welcome to OpenSpec!

     I'll walk you through the complete workflow using your actual codebase.
     We'll find something small to improve, create a proper change for it,
     implement it, and archive it.

     Let me scan your codebase for opportunities...

     [Analyzes codebase]

     I found a few things we could work on:
     1. Add input validation to the contact form
     2. Improve error messages in the auth flow
     3. Add loading states to async buttons

     Which interests you? (or suggest something else)
```

**尖端：**
- 最適合新用戶學習工作流程
- 使用真實程式碼，而不是玩具範例
- 創造一個真正的改變，你可以保留或放棄
- 需要 15-30 分鐘才能完成

---

## AI Tool 的命令語法

不同的 AI 工具使用的命令語法略有不同。使用與您的工具相符的格式：

| 工具 | 語法範例 |
|------|----------------|
| Claude代碼 | `/opsx:propose`, `/opsx:apply` |
| 游標 | `/opsx-propose`, `/opsx-apply` |
| 風帆衝浪 | `/opsx-propose`, `/opsx-apply` |
| 副駕駛 (IDE) | `/opsx-propose`, `/opsx-apply` |
| 特雷 | 基於技能的調用，例如 `/openspec-propose`, `/openspec-apply-change` （沒有生成 `opsx-*` 命令檔） |

不同工具的意圖是相同的，但命令的顯示方式可能因整合而異。

> **注意：** GitHub 副駕駛命令（`.github/prompts/*.prompt.md`）僅在 IDE 擴充功能（VS Code、JetBrains、Visual Studio）中可用。 GitHub Copilot CLI 目前不支援自訂提示檔 — 請參閱 [支援的工具](supported-tools.md) 瞭解詳細資訊和解決方法。

---

## 舊命令

這些命令使用較舊的「一次性」工作流程。它們仍然有效，但建議使用 OPSX 命令。

| 命令 | 它的作用 |
|---------|--------------|
| `/openspec:proposal` | 一次建立所有工件（提案、規格、設計、任務） |
| `/openspec:apply` | 實施變革 |
| `/openspec:archive` | 存檔更改 |

**何時使用舊命令：**
- 使用舊工作流程的現有項目
- 不需要增量建立工件的簡單更改
- 偏好全有或全無的方法

**遷移到 OPSX：**
可以使用 OPSX 指令繼續進行舊版變更。工件結構是相容的。

---

## 故障排除

### “未找到變更”

該命令無法識別要處理哪個變更。

**解決方案：**
- 明確指定更改名稱： `/opsx:apply add-dark-mode`
- 檢查更改資料夾是否存在： `openspec list`
- 驗證您位於正確的專案目錄中

### “沒有準備好文物”

所有工件要么完整，要么因缺少依賴項而受阻。

**解決方案：**
- 執行 `openspec status --change <name>` 看看是什麼阻礙了
- 檢查所需的工件是否存在
- 首先建立缺失的依賴項

### “未找到架構”

指定的架構不存在。

**解決方案：**
- 列出可用模式： `openspec schemas`
- 檢查模式名稱的拼寫
- 如果是自訂架構，則建立架構： `openspec schema init <name>`

### 無法辨識指令

AI 工具無法辨識 OpenSpec 指令。

**解決方案：**
- 確保 OpenSpec 已初始化： `openspec init`
- 恢復技能： `openspec update`
- 檢查一下 `.claude/skills/` 目錄存在（對於 Claude 代碼）
- 重新啟動您的 AI 工具以學習新技能

### 工件未正確生成

人工智慧會創造不完整或不正確的工件。

**解決方案：**
- 新增項目上下文 `openspec/config.yaml`
- 新增每個工件的規則以獲取具體指導
- 在變更描述中提供更多詳細信息
- 使用 `/opsx:continue` 而不是 `/opsx:ff` 為了更多的控制

---

## 下一步

- [工作流程](workflows.md) - 常見模式以及何時使用每個命令
- [CLI](cli.md) - 用於管理和驗證的終端命令
- [客製化](customization.md) - 建立自訂架構和工作流程
