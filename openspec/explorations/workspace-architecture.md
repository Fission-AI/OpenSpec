# 工作空間探索

## 情境

在簡化技能安裝的同時，我們發現了有關設定檔、設定和工作區應如何協同工作的更深層問題。本文檔記錄了我們已經決定的內容、開放的內容以及需要研究的內容。

**更新：**初步探索表明「工作空間」主要不是關於設定分層，而是關於一個更基本的問題：**當工作跨越多個模組或儲存庫時，規範和變更在哪裡？ **

---

## 第 1 部分：設定檔和設定（原始範圍）

### 我們的決定

#### 設定檔使用者體驗（簡化）

**之前（原始提案）：**
```
openspec profile set core|extended
openspec profile install <workflow>
openspec profile uninstall <workflow>
openspec profile list
openspec profile show
openspec config set delivery skills|commands|both
openspec config get delivery
openspec config list
```
8 個子指令，兩個概念（profile + config）

**之後（簡化）：**
```
openspec config profile          # interactive picker (delivery + workflows)
openspec config profile core     # preset shortcut
openspec config profile extended # preset shortcut
```
1 個帶預設的命令，一個概念

#### 互動式選擇器

```
$ openspec config profile

Delivery: [skills] [commands] [both]
                              ^^^^^^

Workflows: (space to toggle, enter to save)
[x] propose
[x] explore
[x] apply
[x] archive
[ ] new
[ ] ff
[ ] continue
[ ] verify
[ ] sync
[ ] bulk-archive
[ ] onboard
```

在一處設定交付方法和工作流程選擇。

#### 為什麼是「設定檔」（而不是「工作流程」）

設定檔作為抽象允許未來的可擴展性：
- 方法bun%dles（規範驅動、測試驅動）
- 使用者建立的設定檔
- 可分享的個人資料
- 不同方法的不同技能/指令集

### 設定分層研究

我們研究了類似的工具如何處理設定分層：

| 工具 | 模型 | 按鍵模式 |
|------|-------|-------------|
| **VSCode** | 使用者 → 工作空間 → 資料夾 | 物件合併，基元覆蓋。工作空間 = 承諾 `.vscode/` 在回購協議中 |
| **ESLint（平坦）** | 單根設定 | *故意殺死級聯* - “複雜性呈指數級爆炸” |
| **渦輪增壓** | 根+包擴展 | Per-package `turbo.json` 和 `extends: ["//"]` 用於覆蓋 |
| **Nx** | 整合與基於封裝的比較 | 兩種模式 - 共享根或每個包。很難從整合遷移。 |
| **pnpm** | 工作空間根定義範圍 | `pnpm-workspace.yaml` 在根。依賴項可以共享或按包 |
| **Claude代碼** | 全球+項目 | `~/.claude/` 對全球來說， `.claude/` 每個項目。沒有工作區追蹤。 |
| **Kiro** | 每根分佈式 | 每個資料夾都有 `.kiro/`。聚合顯示，無繼承。 |

**來自 ESLint 的關鍵見解：** ESLint 團隊明確刪除了平面設定中的級聯，因為級聯是一場複雜性的噩夢。他們的新模型：根目錄下的一個設定，使用 glob 模式來定位子目錄。

**設定檔/設定的建議：** 兩層就足夠了。
- **全域** = 使用者的預設值（`~/.config/openspec/`)
- **項目** = 倉庫等級設定（`.openspec/` 或承諾回購）

設定不需要「工作區」層。這與 Claude Code 的型號相符。

### 設定決策（針對此變更）

保持簡單：
1. 預設的全域設定檔 `openspec init`
2. `openspec init` 將目前設定檔應用於專案
3. 沒有工作區追蹤（尚）
4. 不自動同步現有項目

這是明確的，不會妨礙未來的功能。

---

## 第 2 部分：更深層的問題（規範與變革組織）

### 真正的問題

工作區問題與設定無關，而是關於在以下情況下**規範和更改生效**的情況：

1. **Monorepos**：規範或更改可能跨越多個套件/應用程式
2. **多重儲存庫**：變更可能完全跨越多個儲存庫
3. **跨職能工作**：一項功能會影響多個團隊（後端、Web、iOS、Android）

### 當前OpenSpec架構

OpenSpec 目前假設：
- 一 `openspec/` 每個儲存庫，始終位於根目錄
- CLI 不會向上移動目錄 - 預計您處於根目錄
- 更改可以觸及任何規範（無範圍）
- 單一設定適用於所有內容
- 專案內沒有「範圍」或「邊界」的概念

```
openspec/
├── specs/
│   ├── auth/spec.md           # Domain-organized specs
│   ├── payments/spec.md
│   └── checkout/spec.md
├── changes/
│   └── add-oauth/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/             # Delta specs (can touch multiple)
│           ├── auth/spec.md
│           └── checkout/spec.md
└── config.yaml
```

**這對於單一專案儲存庫來說效果很好。 **但是呢：
- 擁有 50 多個軟體包的大型單一儲存庫？
- 多重儲存庫微服務？
- 跨多個團隊的跨職能功能？

### 結帳/付款範例

想像一個支付系統：
- **後端計費團隊**：擁有付款處理
- **網路團隊**：擁有網路結帳使用者體驗
- **iOS 團隊**：擁有 iOS 結帳 UX
- **Android 團隊**：擁有 Android 結帳 UX
- **橫切**：所有客戶必須遵守的付款*合約*

**問題：**
- 共享支付合約規範在哪裡？
- 特定於平台的結帳規範在哪裡？
- 如果 iOS 規範「擴展」了共享契約，那麼它是如何表達的？
- 當合約發生變化時，下游規格如何更新？
- 誰擁有什麼？

### 核心張力

```
                    SCOPE
                      │
         Narrow       │       Broad
    (team/module)     │    (cross-cutting)
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    │  "Our team's    │   "Shared       │
    │   checkout      │    checkout     │
    │   behavior"     │    contract"    │
    │                 │                 │
────┼─────────────────┼─────────────────┼──── OWNERSHIP
    │                 │                 │
    │  Easy:          │   Hard:         │
    │  One team,      │   Multiple      │
    │  one spec       │   stakeholders  │
    │                 │                 │
    └─────────────────┴─────────────────┘
```

---

## 第 3 部分：其他網域如何解決此問題

### 研究模式

| 領域 | 共享的東西 | 具體內容 | 他們如何聯繫 |
|--------|-------------|----------------|------------------|
| **協定緩衝區** | `common/` 在根部 | `domain/service/` 每項服務 | 從常見進口 |
| **設計系統** | 設計標記、組件名稱、APIs | 平台實施 | “相同的屬性，不同的渲染” |
| **DDD** | 共享核心 | 有界上下文 | 上下文映射定義關係 |
| **RFC** | 跨領域 RFC | 團隊範圍的 RFC | 不同的審核流程 |
| **開API** | 基本模式 | 每項服務規格 | `$ref` 共享定義 |

### Protobuf Monorepo 模式

```
proto/
├── common/              # Shared, low-churn types
│   └── money.proto
│   └── address.proto
├── billing/             # Domain-specific
│   └── service.proto
└── checkout/
    └── service.proto    # Imports from common/
```

**關鍵見解：** “大多數工程組織應該將其原始文件保存在一個存儲庫中。心理開銷保持不變，而不是隨著組織規模而擴展。”

### 設計系統模式（Booking.com、Uber）

> “iOS 和 Android 之間的組件看起來可能非常不同，因為它們使用本機應用程序設計標準，但仍然在代碼中共享**相同的確切屬性**。這就是屬性如此強大的原因 - 它是每個組件的 **唯一真相來源**。”

**關鍵見解：** 共享規範定義了*契約*（屬性、行為）。平台規格定義*實現細節*（它在該平台上的外觀/工作方式）。

### DDD 有界上下文

> “一種環境，一個團隊。明確的所有權可以避免溝通不良。”

**關鍵見解：** 規格應該有明確的所有權。橫切關注點使用“共享內核”模式——需要協調才能更改的明確共享代碼/規範。

---

## 第 4 部分：OpenSpec 的三個模型

### 型號 A：平根（目前）

```
openspec/
├── specs/
│   ├── checkout-contract/    # Shared contract
│   ├── checkout-web/         # Web-specific
│   ├── checkout-ios/         # iOS-specific
│   ├── checkout-android/     # Android-specific
│   ├── billing/              # Backend
│   └── ... (50+ specs at root level)
└── changes/
```

**優點：**
- 簡單的心智模型
- 所有規格均集中於一處
- 無嵌套複雜性

**缺點：**
- 大規模時變得笨拙（50+目錄）
- 沒有明確的所有權訊號
- 很難看出哪些規格是相關的
- 命名約定變得至關重要（`checkout-*`)

### 模型 B：嵌套規範（域 → 平台）

```
openspec/
├── specs/
│   ├── checkout/
│   │   ├── spec.md              # Shared contract (the "interface")
│   │   ├── web/spec.md          # Web implementation spec
│   │   ├── ios/spec.md          # iOS implementation spec
│   │   └── android/spec.md      # Android implementation spec
│   └── billing/
│       └── spec.md
└── changes/
```

**優點：**
- 清晰的層次結構（頂部共享，特定嵌套）
- 相關規格位於相同位置
- 視覺效果更佳
- 所有權可以遵循結構

**缺點：**
- 更複雜的規格參考（`checkout/web` 與 `checkout`)
- 需要定義繼承/擴展語義
- iOS 規範是「擴展」基本規範，還是只是引用它？

**開放問題：** 「延伸」是什麼意思？
```yaml
# checkout/ios/spec.md
extends: ../spec.md   # Inherits all requirements?
requirements:
  - System SHALL support Apple Pay  # Adds to base?
```

### 模型 C：分散式規格（靠近程式碼）

```
monorepo/
├── services/
│   └── billing/
│       └── openspec/specs/billing/spec.md
├── clients/
│   ├── web/
│   │   └── openspec/specs/checkout/spec.md
│   ├── ios/
│   │   └── openspec/specs/checkout/spec.md
│   └── android/
│       └── openspec/specs/checkout/spec.md
└── openspec/           # Root-level for cross-cutting
    ├── specs/
    │   └── checkout-contract/spec.md   # Shared contract
    └── changes/        # Where do cross-cutting changes live?
```

**優點：**
- 規格與他們描述的程式碼很接近
- 團隊自然擁有自己的規格
- 也適用於多倉庫（每個倉庫都有自己的 `openspec/`)

**缺點：**
- 橫切規格很尷尬（它們去哪裡了？）
- 跨越多個領域的變化 `openspec/` 目錄=???
- 需要一個「工作空間」概念來聚合
- 多種的 `openspec/` 管理的根源

### 模型 D：混合（每個項目內的模型 B + 跨項目的模型 C）

使用一個 `openspec/` 每個項目的根目錄，但允許在該根目錄中嵌套規範，以實現明確的所有權和共享合約。
對於多重儲存庫工作，使用工作區清單來協調多個項目，而無需重複規範規格。

**Monorepo 形狀（單一項目，嵌套規格）：**
```
repo/
└── openspec/
    ├── specs/
    │   ├── contracts/
    │   │   └── checkout/spec.md
    │   ├── billing/
    │   │   └── spec.md
    │   └── checkout/
    │       ├── web/spec.md
    │       ├── ios/spec.md
    │       └── android/spec.md
    └── changes/
        └── add-3ds/
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                ├── contracts/checkout/spec.md
                ├── billing/spec.md
                ├── checkout/web/spec.md
                ├── checkout/ios/spec.md
                └── checkout/android/spec.md
```

**多倉庫形狀（多個項目+工作區編排）：**
```
~/work/
├── contracts/
│   └── openspec/
│       ├── specs/checkout/spec.md
│       └── changes/add-3ds-contract/
├── billing-service/
│   └── openspec/
│       ├── specs/billing/spec.md
│       └── changes/add-3ds-billing/
├── web-client/
│   └── openspec/
│       ├── specs/checkout/spec.md
│       └── changes/add-3ds-web/
├── ios-client/
│   └── openspec/
│       ├── specs/checkout/spec.md
│       └── changes/add-3ds-ios/
└── payments-workspace/
    └── .openspec-workspace/
        ├── workspace.yaml
        └── initiatives/add-3ds/links.yaml
```

`workspace.yaml` 列出項目/根。 `links.yaml` 將一項跨領域措施對應到每個項目的變更。
規範規範保留在擁有的儲存庫中；工作區資料只是協調元資料。

**優點：**
- 清晰的所有權邊界（一個項目擁有其規範和更改）
- 共享合約可以有一個專用的所有者儲存庫（沒有重複作為事實來源）
- 適用於單一儲存庫和多重儲存庫，具有一種思維模型
- 避免繼承複雜度（關係可以從明確引用開始）
- 目前模型的增量遷移路徑

**缺點：**
- 需要新的工作區使用者體驗來進行跨儲存庫協調
- 跨儲存庫功能工作會建立多個變更 ID 來管理
- 需要合約所有權和倡議連結的約定
- 一些用戶可能期望一個全局的“大型更改”，而不是連結的每個項目更改
- 工具必須支援主規格和更改增量中的嵌套規格路徑

---

## 第 5 部分：多重儲存庫注意事項

對於多儲存庫設置，模型 C（或模型 D 的協調部分）幾乎是強制的：

```
~/work/
├── billing-service/
│   └── openspec/specs/billing/
├── web-client/
│   └── openspec/specs/checkout/
├── ios-client/
│   └── openspec/specs/checkout/
└── contracts/                    # Dedicated repo for shared specs?
    └── openspec/specs/
        └── checkout-contract/
```

### 多倉庫問題

1. **共享規範在哪裡？ **
   - 專用「合約」回購？
   - 在每個回購中重複（漂移風險）？
   - 一個倉庫是“真相來源”，其他人引用它？

2. **跨儲存庫更改發生在哪裡？ **
   - 在其中一個儲存庫中？ （感覺不對－所有權有偏見）
   - 在單獨的「工作區」儲存庫中？
   - 在 `~/.config/openspec/workspaces/my-platform/changes/`?

3. **更改如何傳播？ **
   - 更改為 `checkout-contract` 影響所有客戶端儲存庫
   - 我們需要顯式的依賴追蹤嗎？
   - 還是這是「帶外」（團隊手動協調）？

### 「工作空間」對多倉庫意味著什麼

如果我們新增工作區支援，它可能是：

> **工作空間是可以一起操作的 OpenSpec 根的集合。 **

```yaml
# ~/.config/openspec/workspaces.yaml (or similar)
workspaces:
  my-platform:
    roots:
      - ~/work/billing-service
      - ~/work/web-client
      - ~/work/ios-client
      - ~/work/contracts
    shared_context: |
      All services use TypeScript.
      API contracts follow OpenAPI 3.1.
```

這將使：
1. **跨儲存庫更改**：建立追蹤跨多個根的增量的更改
2. **聚合規格視圖**：檢視工作區中的所有規格
3. **共享上下文**：適用於所有根的上下文/規則

---

## 第 6 部分：關鍵設計問題

### 1. 規範應該是分層的（具有繼承性）嗎？

**選項A：沒有繼承，只有組織**
- 嵌套目錄純粹是組織性的
- 每個規格都是獨立的
- 關係是隱式的（命名）或手動記錄的

**選項 B：明確繼承**
```yaml
# checkout/ios/spec.md
extends: ../spec.md
requirements:
  - System SHALL support Apple Pay  # Adds to base
```
- 子規格繼承父規格要求
- 可以添加、覆蓋或擴展
- 更強大但更複雜

**選項C：無繼承的引用**
```yaml
# checkout/ios/spec.md
references:
  - ../spec.md  # "See also" but no inheritance
requirements:
  - System SHALL implement checkout per checkout-contract
  - System SHALL support Apple Pay
```
- 文件的明確參考
- 沒有自動繼承
- 更簡單的語義

### 2.「共享核心」位於哪裡？

**選項 A：根層級（模型 B）**
- `openspec/specs/checkout/spec.md` 是共享內核
- 平台規格位於其之下

**選項 B：專用區域**
- `openspec/specs/_shared/checkout-contract/spec.md`
- 或者 `openspec/specs/_contracts/checkout/spec.md`
- 明確「共享」命名空間

**選項 C：單獨的儲存庫（用於多儲存庫的模型 C）**
- 一個專門的 `contracts` 或者 `specs` 回購協議
- 其他倉庫引用它

### 3. 什麼是「工作空間」與「專案」？

如果我們引入工作空間：

| 概念 | 定義 |
|---------|------------|
| **專案*​​ | 單一 OpenSpec 根（一個 `openspec/` 目錄） |
| **工作區** | 可以一起操作的項目集合 |

工作空間可以實現：
- 跨項目的聚合規格檢視
- 跨專案變更
- 跨專案共享上下文

**問題：** 我們是否需要顯式工作區跟踪，或者只是臨時多根（例如 Claude 代碼） `/add-dir`)?

### 4.OpenSpec需要瞭解依賴關係嗎？

如果 `checkout-web` 取決於 `checkout-contract`:
- OpenSpec應該知道這種關係嗎？
- 是否應該更改為 `checkout-contract` 警告下游規格？
- 或依賴追蹤「超出範圍」？

**權衡：**
- 具有依賴性追蹤：更強大的自動傳播警告
- 沒有：更簡單，團隊自己管理依賴關係

### 5. 跨領域工作應如何改變？

**對於 monorepos（模型 B）：**
- 一項更改，多個增量規格 `specs/`
- 今天已經可以使用了

**對於多重儲存庫（模型 C）：**
- 選項 A：引用多個儲存庫變更的一個“工作區變更”
- 選項 B：每個儲存庫中相互引用的單獨更改
- 選項 C：變更始終存在於一個儲存庫中，參考其他儲存庫中的規範

---

## 第 7 部分：「驚人」會是什麼樣子？

根據研究，團隊喜歡：

1. **一個值得一看的地方**（Protobuf：「精神開銷保持不變」）
2. **明確的所有權**（DDD：「一個環境，​​一個團隊」）
3. **與本機擴充共享合約**（設計系統：「相同的屬性，不同的渲染」）
4. **自動一致性**（設計系統：「設計代幣作為基礎」）
5. **認知負荷低**（不必過多考慮組織）

### 可能的北極星

**雄心勃勃：**
> OpenSpec 自動理解您的儲存庫結構，偵測橫切規範，並協助您建立流向正確位置的變更。

**更簡單：**
> 您可以隨心所欲地組織規格。 OpenSpec 就可以了。

**實際的：**
> 組織的嵌套規範。橫切的顯式依賴關係。沒有魔法。

---

## 第 8 部分：可能的前進路徑

### 對於此更改（簡化技能安裝）

現在不解決規範組織問題。保持範圍：
1. 設定檔使用者體驗簡化
2. `openspec init` 改進
3. 尚無工作區跟踪

### 未來：規範組織變革

需要探索和實施的單獨變更：

1. **決定型號 A、B、C 或 D（混合）**
2. **決定繼承語意**（或無）
3. **更新規格解析度**以處理嵌套
4. **更新更改增量**以處理巢狀規範

### 未來：多倉庫/工作空間變化

如果需要，可以單獨更改：

1. **定義工作空間概念**
2. **實施工作區追蹤**（或臨時多根）
3. **跨存儲庫更改**
4. **跨儲存庫共享上下文**

---

## 第 9 部分：規範哲學（行為優先、輕量級、代理對齊）

### OpenSpec 中的規格是什麼？

對於OpenSpec，規範應被視為**邊界處可驗證的行為契約**：
- 用戶、整合商或運營商可以觀察和依賴什麼
- 可以透過測試、檢查或明確審查來驗證什麼
- 即使內部實施發生變化，什麼也應該保持穩定

### 規格應該包含什麼，不應該包含什麼

**包括：**
- 可觀察的行為和結果
- 介面/資料契約（輸入、輸出、錯誤條件）
- 外部重要的非功能性限制（隱私、安全性、可靠性）
- 相容性保證下游消費者依賴

**避免：**
- 內部實作細節（類別名稱、庫選擇、控制流程）
- 可以在不影響行為的情況下改變工具機制
- 分步執行計劃（屬於任務/設計）

### 保持嚴格比例（以避免官僚主義）

使用漸進的嚴格性：

1. **精簡規格（大多數更改的預設）**
   - 簡短的行為要點、清晰的範圍和驗收檢查
2. **完整規格（僅適用於高風險或跨境工作）**
   - 針對 API 中斷、遷移、安全/隱私或跨團隊/回購更改的更深入的合約詳細信息

這使得日常使用變得輕量級，同時在失敗代價高昂的情況下保持清晰。

### 人類探索 -> 代理編寫的規範

OpenSpec 通常是代理根據人類探索編寫的。為了使其可靠：

- 人類透過探索提供意圖、約束和範例
- 代理將其轉化為簡潔、行為優先的需求和場景
- 代理將實施細節保留在設計/任務中，而不是規範中
- 驗證檢查加強結構和可測試性

簡而言之：人類塑造意圖；代理人簽訂一致的、可驗證的合約。

### 這種哲學應該存在於何處

為了避免在探索筆記中丟失這一點，請將其編入：
1. `docs/concepts.md` 用於面向人的框架
2. `openspec/specs/openspec-conventions/spec.md` 用於規範規範約定
3. `openspec/specs/docs-agent-instructions/spec.md` 用於代理指令創作規則

---

## 概括

| 問題 | 地位 | 筆記 |
|----------|--------|-------|
| 使用者體驗簡介 | 決定了 | `openspec config profile` 帶預設 |
| 設定分層 | 決定了 | 兩層：全域+項目（無工作區層） |
| 規格組織 | 打開 | 正在考慮的四種車型（包括混合動力車型 D） |
| 規格理念 | 方向設定 | 行為優先的合約、漸進的嚴謹性和與代理商一致的創作 |
| 規格繼承 | 打開 | 繼承、引用、無繼承 |
| 多倉庫支援 | 打開 | 工作空間概念待定 |
| 依賴性追蹤 | 打開 | 最初可能超出範圍 |

### 關鍵見解

「工作空間」問題其實是兩個獨立的問題：
1. **設定/設定檔範圍** → 透過全域+專案解決（不需要工作空間）
2. **規範/變更組織** → 未解決，需要更深入的設計工作

這些應該是單獨的改變和單獨的探索。

---

## 參考

- [VSCode 設定優先權](https://code.visualstudio.com/docs/configure/settings)
- [Monorepos 討論中的 ESLint 平面設定](https://github.com/eslint/eslint/discussions/16960)
- [Turborepo 套件設定](https://turborepo.dev/docs/reference/package-configurations)
- [pnpm 工作區](https://pnpm.io/workspaces)
- [Claude 代碼設定](https://code.claude.com/docs/en/settings)
- [Kiro 多根工作區](https://kiro.dev/docs/editor/multi-root-workspaces/)
- [DDD 有界上下文](https://martinfowler.com/bliki/BoundedContext.html)
- [Protobuf Monorepo 模式](https://www.lesswrong.com/posts/xts8dC3NeTHwqYgCG/keep-your-protos-in-one-repo)
- [Booking.com多平台設計系統](https://booking.design/how-we-built-our-multi-platform-design-system-at-booking-com-d7b895399d40)
- [InnerSource RFC 模式](https://patterns.innersourcecommons.org/p/transparent-cross-team-decision-making-using-rfcs)
