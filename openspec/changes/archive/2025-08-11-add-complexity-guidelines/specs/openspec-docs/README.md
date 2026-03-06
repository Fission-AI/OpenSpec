# OpenSpec 說明

本文檔為 AI 編碼助理提供如何使用 OpenSpec 約定進行規範驅動開發的說明。在處理 OpenSpec 啟用的項目時，請嚴格遵守這些規則。

## 核心原則

OpenSpec 是一個用於變革驅動開發的 AI 原生系統，其中：
- **規格**（`specs/`）反映目前建置和部署的內容
- **變化**（`changes/`）包含應更改內容的建議
- **人工智慧驅動流程** - 您產生提案，人工審核和批准
- **規格是動態文件** - 始終與部署的程式碼保持同步

## 從簡單開始

**預設為最小實作：**
- 新功能最初應少於 100 行程式碼
- 使用最簡單有效的解決方案
- 避免過早優化（未經證實需要，不進行快取、並行化或複雜模式）
- 選擇鏜削技術而不是尖端解決方案

**複雜性觸發器** - 僅當您滿足以下條件時才會增加複雜度：
- **效能資料**顯示目前解決方案太慢
- **規模需求** 具有特定數量（>1000 個用戶，>100MB 資料）
- **多個用例**需要相同的抽象
- **法規遵循**規定特定模式
- **簡單解決方案無法解決的安全威脅**

當觸發時，在變更提案中記錄具體理由。

## 目錄結構

```
openspec/
├── project.md              # Project-specific context (tech stack, conventions)
├── README.md               # This file - OpenSpec instructions
├── specs/                  # Current truth - what IS built
│   ├── [capability]/       # Single, focused capability
│   │   ├── spec.md         # WHAT the capability does and WHY
│   │   └── design.md       # HOW it's built (established patterns)
│   └── ...
├── changes/                # Proposed changes - what we're CHANGING
│   ├── [change-name]/
│   │   ├── proposal.md     # Why, what, impact (consolidated)
│   │   ├── tasks.md        # Implementation checklist
│   │   ├── design.md       # Technical decisions (optional, for complex changes)
│   │   └── specs/          # Future state of affected specs
│   │       └── [capability]/
│   │           └── spec.md # Clean markdown (no diff syntax)
│   └── archive/            # Completed changes (dated)
```

### 能力組織

**使用功能，而不是特性** - 下的每個目錄 `specs/` 代表單一、集中的責任：
- **動詞-名詞命名**： `user-auth`, `payment-capture`, `order-checkout`
- **10 分鐘規則**：每個功能都應該在 10 分鐘內被理解
- **目的單一**：如果需要「AND」來描述，則將其拆分

範例：
```
✅ GOOD: user-auth, user-sessions, payment-capture, payment-refunds
❌ BAD: users, payments, core, misc
```

## 關鍵行為規則

### 1. 始終從閱讀開始

在執行任何任務之前：
1. **閱讀相關規格** `specs/[capability]/spec.md` 瞭解當前狀態
2. **檢查待處理的更改** `changes/` 潛在衝突的目錄
3. **閱讀project.md**瞭解專案特定的約定

### 2. 何時建立變更提案

**始終為以下內容建立變更提案：**
- 新特性或功能
- 重大變更（API 變更、架構更新）
- 架構變化或新模式
- 改變行為的效能優化
- 影響身份驗證/存取模式的安全性更新
- 任何需要多個步驟或影響多個系統的更改

**跳過以下建議：**
- 修復錯誤以恢復預期行為
- 拼字錯誤、格式或評論更新
- 依賴項更新（除非損壞）
- 設定或環境變數更改
- 添加對現有行為的測試
- 文件修復

**複雜性評估：**
- 如果您的解決方案需要超過 100 行新程式碼，請證明其複雜性
- 如果新增依賴項、框架或架構模式，請記錄為什麼更簡單的替代方案不起作用
- 預設為單一文件實現，直到證明不足為止

### 3. 建立變更提案

當用戶請求重大更改時：

```bash
# 1. Create the change directory
openspec/changes/[descriptive-name]/

# 2. Generate proposal.md with all context
## Why
[1-2 sentences on the problem/opportunity]

## What Changes  
[Bullet list of changes, including breaking changes]

## Impact
- Affected specs: [list capabilities that will change]
- Affected code: [list key files/systems]

# 3. Create future state specs for ALL affected capabilities
# - Store complete spec files as they will exist after the change
# - Use clean markdown without diff syntax (+/- prefixes)
# - Include all formatting and structure of the final intended state
specs/
└── [capability]/
    └── spec.md

# 4. Create tasks.md with implementation steps
## 1. [Task Group]
- [ ] 1.1 [Specific task]
- [ ] 1.2 [Specific task]

# 5. For complex changes, add design.md
[Technical decisions and trade-offs]
```

### 4. 變革生命週期

1. **建議** → 建立包含所有文件的變更目錄
2. **審核** → 使用者審核並批准提案
3. **實施** → 遵循核准的tasks.md（可以是多個PR）
4. **部署** → 使用者確認部署
5. **更新規格** → 將規格/與新的現實同步（如果更改影響系統功能）
6. **存檔** → 移至 `changes/archive/YYYY-MM-DD-[name]/`

### 5. 實施變革

實施已核准的變更時：
1. 嚴格遵循tasks.md清單
2. **在完成任務時在tasks.md中標記已完成的任務**（例如， `- [x] 1.1 Task completed`)
3. 確保程式碼符合建議的行為
4. 更新所有受影響的測試
5. **保留更改 `changes/` 目錄** - 不在實作 PR 中存檔

**多個實施 PR：**
- 可以跨多個 PR 實施更改
- 每個 PR 都應該更新tasks.md 以標記已完成的內容
- 不同的開發人員可以在不同的任務組中工作
- 範例：PR #1 完成任務 1.1-1.3，PR #2 完成任務 2.1-2.4

### 6. 部署後更新規格並存檔

**部署後建立一個單獨的 PR**：
1. 移動更改為 `changes/archive/YYYY-MM-DD-[name]/`
2. 更新相關文件 `specs/` 反映新的現實（如果需要）
3. 如果 design.md 存在，則將經過驗證的模式合併到 `specs/[capability]/design.md`

這可確保變更僅在真正完成和部署時才存檔。

### 7. 不需要規格的變更類型

一些變更僅影響開發基礎設施，不需要規範：
- 初始專案設定（package.json、tsconfig.json 等）
- 開發工具變更（linter、格式化程式、建置工具）
- CI/CD configuration
- 開發依賴

對於這些變化：
1. 實作→部署→標記任務完成→存檔
2. 完全跳過“更新規格”步驟

### 什麼值得規格？

問問自己：
- 這是使用者或其他系統與之互動的系統功能嗎？
- 它是否有需要記錄的持續行為？
- 新開發人員需要瞭解這一點才能使用該系統嗎？

如果全部否定 → 不需要規格（可能只是工具/基礎設施）

## 瞭解規格與程式碼

### 規格記錄內容​​和原因
```markdown
# Authentication Spec

Users SHALL authenticate with email and password.

WHEN credentials are valid THEN issue JWT token.
WHEN credentials are invalid THEN return generic error.

WHY: Prevent user enumeration attacks.
```

### 程式碼文檔如何
```javascript
// Implementation details
const user = await db.users.findOne({ email });
const valid = await bcrypt.compare(password, user.hashedPassword);
```

**關鍵區別**：規範捕捉了程式碼中不明顯的意圖、約束和決策。

## 常見場景

### 新功能請求
```
User: "Add password reset functionality"

You should:
1. Read specs/user-auth/spec.md
2. Check changes/ for pending auth changes
3. Create changes/add-password-reset/ with proposal
4. Wait for approval before implementing
```

### 錯誤修復
```
User: "Getting null pointer error when bio is empty"

You should:
1. Check if spec says bios are optional
2. If yes → Fix directly (it's a bug)
3. If no → Create change proposal (it's a behavior change)
```

### 基礎設施設置
```
User: "Initialize TypeScript project"

You should:
1. Create change proposal for TypeScript setup
2. Implement configuration files (PR #1)
3. Mark tasks complete in tasks.md
4. After deployment, create separate PR to archive
   (no specs update needed - this is tooling, not a capability)
```

## 工作流程總結

1. **接收請求** → 確定是否需要變更提案
2. **讀取目前狀態** → 檢查規格和待定更改
3. **建立提案** → 產生完整的變更文檔
4. **獲得批准** → 使用者審查提案
5. **實施** → 遵循已批准的任務，在tasks.md中標記已完成的項目
6. **部署** → 使用者部署實施
7. **存檔 PR** → 建立單獨的 PR 以便：
   - 將更改移至存檔
   - 如果需要更新規格
   - 將更改標記為完成

## 公關工作流程範例

### 單一開發者，簡單的改變
```
PR #1: Implementation
- Implement all tasks
- Update tasks.md marking items complete
- Get merged and deployed

PR #2: Archive (after deployment)
- Move changes/feature-x/ → changes/archive/2025-01-15-feature-x/
- Update specs if needed
```

### 多個開發人員，複雜的變更
```
PR #1: Alice implements auth components
- Complete tasks 1.1, 1.2, 1.3
- Update tasks.md marking these complete

PR #2: Bob implements UI components  
- Complete tasks 2.1, 2.2
- Update tasks.md marking these complete

PR #3: Alice fixes integration issues
- Complete remaining task 1.4
- Update tasks.md

[Deploy all changes]

PR #4: Archive
- Move to archive with deployment date
- Update specs to reflect new auth flow
```

### 關鍵規則
- **切勿在實作 PR 中存檔** - 變更在部署前不會完成
- **始終更新tasks.md** - 顯示準確的進度
- **每次變更一個存檔 PR** - 明確的完成邊界
- **存檔 PR 包括規格更新** - 保持規格最新

## 能力組織最佳實踐

### 命名能力
- 使用**動詞-名詞**模式： `user-auth`, `payment-capture`, `order-checkout`
- 具體一點： `payment-capture` 不僅 `payments`
- 保持扁平：避免功能內嵌套功能
- 單一焦點：如果需要「AND」來描述，就拆分它

### 何時拆分能力
當你有以下情況時拆分：
- 多個不相關的API端點
- 不同的使用者角色或參與者
- 單獨的部署注意事項
- 獨立的進化路徑

#### 能力邊界指南
- 您會單獨導入這些嗎？ → 獨立的功能
- 不同的部署節奏？ → 獨立的功能
- 不同的球隊擁有它們？ → 獨立的功能
- 共享資料模型就可以了，共享業務邏輯意味著結合起來

範例：
- 使用者驗證（登入/登出）與使用者會話（令牌管理）→ 單獨
- 付款捕獲與付款退款 → 單獨（不同的工作流程）
- 使用者設定檔與使用者設定→組合（相同的資料模型，相同的擁有者）

### 跨領域的關注點
對於系統範圍的策略（速率限制、錯誤處理、安全性），將其記錄在：
- `project.md` 用於專案範圍的會議
- 在適用的相關功能規格內
- 或者如果足夠複雜，則建立專用功能（例如， `api-rate-limiting/`)

### 組織良好的功能範例
```
specs/
├── user-auth/              # Login, logout, password reset
├── user-sessions/          # Token management, refresh
├── user-profile/           # Profile CRUD operations
├── payment-capture/        # Processing payments
├── payment-refunds/        # Handling refunds
└── order-checkout/         # Checkout workflow
```

有關詳細指導，請參閱 [能力組織指南](../docs/capability-organization.md).

## 常見場景和說明

### 決策模糊性：錯誤與行為改變

當規格缺失或不明確時：
- 如果不存在規範 → 將目前代碼行為視為隱式規範，則需要建議
- 如果規格是 VAGUE → 需要提案在修復的同時澄清規格
- 如果代碼和規範不同意 → 規範是事實，則代碼有錯誤（無需提案即可修復）
- 如果不確定 → 預設建立提案（更安全的選項）

例子：
```
User: "The API returns 404 for missing users but should return 400"
AI: Is this a bug (spec says 400) or behavior change (spec says 404)?
```

### 當你不知道範圍時
先探索一下就可以了！告訴使用者您需要調查，然後建立一份知情提案。

### 探索階段（需要時）

在建立提案之前，您可能需要在以下情況下進行探索：
- 用戶請求模糊或等級較高
- 存在多種實施方法
- 不看代碼範圍不清楚

探索清單：
1. 告訴用戶您需要先探索
2. 使用 Grep/Read 瞭解目前狀態
3. 根據調查結果建立初步提案
4. 根據用戶回饋進行優化

例子：
```
User: "Add caching to improve performance"
AI: "Let me explore the codebase to understand the current architecture and identify caching opportunities."
[After exploration]
AI: "Based on my analysis, I've identified three areas where caching would help. Here's my proposal..."
```

### 不存在規格時
將目前程式碼視為隱式規範。您的提案應記錄當前狀態和提議的變更。

### 當有疑問時
預設建立提案。跳過不必要的提案比修復未記錄的更改更容易。

### AI 工作流程調整

使用 OpenSpec 進行任務追蹤：
- 與實施分開追蹤探索任務
- 隨時記錄提案建立步驟
- 在提案獲得批准之前，將實施任務分開

鼓勵並行運作：
- 同時讀取多個規格
- 一次檢查多個待處理的更改
- 大量相關搜尋以提高效率

進度溝通：
- “探索程式碼庫以瞭解範圍......”
- “根據調查結果建立提案......”
- “實施批准的變更…”

### 對於人工智慧助理
- **偏向簡單性** - 提出可行的最小解決方案
- 在求婚之前充分使用你的探索工具
- 大量操作提高效率
- 傳達您的進展
- 根據發現修改提案是可以的
- **問題複雜性** - 如果您的解決方案感覺很複雜，請先簡化

## 邊緣情況處理

### 多功能變化
建立一項提案：
- 列出所有受影響的功能
- 顯示每個功能的變化
- 有統一的任務清單
- 獲得整體批准

### 過時的規格
如果規格明顯過時：
1. 建立提案以更新規格以符合現實
2. 在單獨的提案中實施新功能
3. 或將兩者合併到一份提案中，並有明確的部分

### 緊急修復
對於關鍵的生產問題：
1. 宣布：“這是緊急修復”
2. 立即實施修復
3. 建立追溯提案
4. 部署後更新規格
5. 存檔中帶有 [EMERGENCY] 標籤

### 純粹的重構
不需要提案：
- 程式碼格式/風格
- 內部重構（同API）
- 效能優化（相同行為）
- 為非類型化程式碼新增類型

需要提案：
- API 更改（即使相容）
- 資料庫結構定義更改
- 架構變化
- 新的依賴項

### 可觀察性的補充
不需要提案：
- 新增日誌語句
- 新指標/軌跡
- 偵錯新增
- 錯誤追蹤

如果滿足以下條件，則需要提案：
- 更改日誌格式/結構
- 新增新的監控服務
- 更改記錄的內容（隱私）

## 記住

- 您是流程驅動者 - 自動化文件負擔
- 規格必須始終反映部署的實際情況
- 改變是提議的，而不是強加的
- 影響分析可以防止意外
- **簡單就是力量** - 只需降價文件，最少的解決方案
- 從簡單開始，只有在合理的情況下才會增加複雜性

透過遵循這些約定，您可以實現真正的規範驅動開發，其中文件保持最新、更改可追蹤、並且演變是有意的。