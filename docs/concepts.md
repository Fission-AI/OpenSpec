# 概念

本指南解釋了 OpenSpec 背後的核心思想以及它們如何組合在一起。實際使用請參見 [入門](getting-started.md) 和 [工作流程](workflows.md).

## 哲學

OpenSpec is built around four principles:

```
fluid not rigid       — no phase gates, work on what makes sense
iterative not waterfall — learn as you build, refine as you go
easy not complex      — lightweight setup, minimal ceremony
brownfield-first      — works with existing codebases, not just greenfield
```

### 為什麼這些原則很重要

**流動而不是僵化。 **傳統的規範系統將您鎖定在幾個階段：首先您計劃，然後您實施，然後您就完成了。 OpenSpec 更靈活 - 您可以按照對您的工作有意義的任何順序建立工件。

**迭代而非瀑布式。 ** 需求改變。理解加深。一开始看似不错的方法在您看到代码库后可能行不通。 OpenSpec接受這個現實。

**簡單而不複雜。 **一些规范框架需要大量的设置、严格的格式或重量级的流程。 OpenSpec 不妨礙你。在幾秒鐘內初始化，立即開始工作，僅在需要時進行自訂。

**棕地優先。 ** 大多數軟體工作都不是從頭開始建構的，而是修改現有系統。 OpenSpec 基於增量的方法可以輕鬆指定對現有行為的更改，而不僅僅是描述新系統。

## 大局觀

OpenSpec 將您的工作分為兩個主要領域：

```
┌─────────────────────────────────────────────────────────────────┐
│                        openspec/                                 │
│                                                                  │
│   ┌─────────────────────┐      ┌──────────────────────────────┐ │
│   │       specs/        │      │         changes/              │ │
│   │                     │      │                               │ │
│   │  Source of truth    │◄─────│  Proposed modifications       │ │
│   │  How your system    │ merge│  Each change = one folder     │ │
│   │  currently works    │      │  Contains artifacts + deltas  │ │
│   │                     │      │                               │ │
│   └─────────────────────┘      └──────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**規格**是事實來源—它們描述了您的系統目前的行為方式。

**更改**是建議的修改 - 它們位於單獨的資料夾中，直到您準備好合併它們為止。

這種分離是關鍵。您可以並行處理多個更改，而不會發生衝突。您可以在更改影響主要規格之前對其進行檢查。當您歸檔變更時，其增量會乾淨地合併到事實來源中。

## 規格

規範使用結構化需求和場景描述系統的行為。

### 結構

```
openspec/specs/
├── auth/
│   └── spec.md           # Authentication behavior
├── payments/
│   └── spec.md           # Payment processing
├── notifications/
│   └── spec.md           # Notification system
└── ui/
    └── spec.md           # UI behavior and themes
```

按領域組織規格 - 對您的系統有意義的邏輯分組。常見模式：

- **按功能區**： `auth/`, `payments/`, `search/`
- **按組件**： `api/`, `frontend/`, `workers/`
- **透過有界上下文**： `ordering/`, `fulfillment/`, `inventory/`

### 規格格式

規格包含需求，每個需求都有場景：

```markdown
# Auth Specification

## Purpose
Authentication and session management for the application.

## Requirements

### Requirement: User Authentication
The system SHALL issue a JWT token upon successful login.

#### Scenario: Valid credentials
- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard

#### Scenario: Invalid credentials
- GIVEN invalid credentials
- WHEN the user submits login form
- THEN an error message is displayed
- AND no token is issued

### Requirement: Session Expiration
The system MUST expire sessions after 30 minutes of inactivity.

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated
- AND the user must re-authenticate
```

**關鍵要素：**

| 元素 | 目的 |
|---------|---------|
| `## Purpose` | 此規範域的高階描述 |
| `### Requirement:` | 系統必須具有的特定行為 |
| `#### Scenario:` | 實際需求的具體範例 |
| SHALL/MUST/SHOULD | RFC 2119 關鍵字指示需求強度 |

### 為什麼要以這種方式建構規格

**需求是「什麼」**－它們說明系統應該做什麼，但沒有指定實作。

**場景是「何時」**——它們提供了可以驗證的具體範例。好的場景：
- 可測試（您可以為它們編寫自動化測試）
- 涵蓋快樂路徑和邊緣情況
- 使用給定/何時/那麼或類似的結構化格式

**RFC 2119 關鍵字**（SHALL、MUST、SHOULD、MAY）傳達意圖：
- **必須/應** — 絕對要求
- **應該** — 推薦，但也存在例外情況
- **五月** — 可選

### 規格是什麼（和不是什麼）

規範是**行為契約**，而不是實施計畫。

良好的規格內容：
- 使用者或下游系統所依賴的可觀察行為
- 輸入、輸出和錯誤條件
- 外部約束（安全性、隱私性、可靠性、相容性）
- 可以測試或明確驗證的場景

規格中避免：
- 內部類別/函數名稱
- 庫或框架選擇
- 逐步實施細節
- 詳細的執行計劃（屬於 `design.md` 或者 `tasks.md`)

快速測試：
- 如果可以在不改變外部可見行為的情況下改變實現，那麼它可能不屬於規範。

### 保持輕量化：漸進式嚴謹

OpenSpec旨在避免官僚主義。使用仍然可以驗證變更的最輕量級。

**精簡規格（預設）：**
- 簡短的行為優先要求
- 明確的範圍和非目標
- 一些具體的驗收檢查

**完整規格（針對更高風險）：**
- 跨團隊或跨儲存庫更改
- API/合約變更、遷移、安全/隱私問題
- 含糊不清的變更可能會導致昂貴的返工

大多數變更應保留在 Lite 模式下。

### 人+代理協作

在許多團隊中，人類探索並代理起草工件。預期的循環是：

1. 人類提供意圖、背景和約束。
2. 代理將其轉換為行為優先的需求和場景。
3. 代理將實作細節保留在 `design.md` 和 `tasks.md`， 不是 `spec.md`.
4. 在實施之前進行驗證以確認結構和清晰度。

這使得規範對於人類來說是可讀的，並且對於代理來說是一致的。

## 變化

更改是對系統的建議修改，打包為一個資料夾，其中包含理解和實現它所需的所有內容。

### 改變結構

```
openspec/changes/add-dark-mode/
├── proposal.md           # Why and what
├── design.md             # How (technical approach)
├── tasks.md              # Implementation checklist
├── .openspec.yaml        # Change metadata (optional)
└── specs/                # Delta specs
    └── ui/
        └── spec.md       # What's changing in ui/spec.md
```

每個更改都是獨立的。它有：
- **工件** — 捕捉意圖、設計和任務的文檔
- **Delta 規格** — 新增、修改或刪除內容的規格
- **Metadata** — optional configuration for this specific change

### 為什麼更改是資料夾

將更改打包為資料夾有幾個好處：

1. **一切都在一起。 **提案、設計、任務和規格都集中在一個地方。禁止在不同地點狩獵。

2. **並行工作。 ** 多個變更可以同時存在而不發生衝突。繼續努力 `add-dark-mode` 儘管 `fix-auth-bug` 也在進行中。

3. **清除歷史記錄。 ** 存檔後，變更將移至 `changes/archive/` 並保留其完整的上下文。您可以回顧並瞭解不僅發生了什麼變化，而且還瞭解原因。

4. **便於審查。 ** 更改資料夾很容易審查 - 打開它，閱讀提案，檢查設計，檢視規格增量。

## 文物

工件是變更中指導工作的文件。

### 工件流程

```
proposal ──────► specs ──────► design ──────► tasks ──────► implement
    │               │             │              │
   why            what           how          steps
 + scope        changes       approach      to take
```

工件相互建構。每個工件都為下一個工件提供上下文。

### 神器類型

#### 提議 （`proposal.md`)

該提案在高層次上捕捉了**意圖**、**範圍**和**方法**。

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage and match system preferences.

## Scope
In scope:
- Theme toggle in settings
- System preference detection
- Persist preference in localStorage

Out of scope:
- Custom color themes (future work)
- Per-page theme overrides

## Approach
Use CSS custom properties for theming with a React context
for state management. Detect system preference on first load,
allow manual override.
```

**何時更新提案：**
- 範圍變更（縮小或擴大）
- 意圖澄清（更好地理解問題）
- 方法從根本上轉變

#### 規格（增量規格 `specs/`)

Delta 規格描述了相對於當前規格的**變化**。看 [增量規格](#delta-specs) below.

#### 設計 （`design.md`)

該設計捕獲了**技術方法**和**架構決策**。

````markdown
# Design: Add Dark Mode

## Technical Approach
Theme state managed via React Context to avoid prop drilling.
CSS custom properties enable runtime switching without class toggling.

## Architecture Decisions

### Decision: Context over Redux
Using React Context for theme state because:
- Simple binary state (light/dark)
- No complex state transitions
- Avoids adding Redux dependency

### Decision: CSS Custom Properties
Using CSS variables instead of CSS-in-JS because:
- Works with existing stylesheet
- No runtime overhead
- Browser-native solution

## Data Flow
```
ThemeProvider (context)
       │
       ▼
ThemeToggle ◄──► localStorage
       │
       ▼
CSS Variables (applied to :root)
```

## File Changes
- `src/contexts/ThemeContext.tsx` (new)
- `src/components/ThemeToggle.tsx` (new)
- `src/styles/globals.css` (modified)
````

**何時更新設計：**
- 實施表明該方法行不通
- 發現更好的解決方案
- 依賴性或限制條件發生變化

#### 任務（`tasks.md`)

任務是**實施清單**－帶有核取方塊的具體步驟。

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence
- [ ] 1.4 Add system preference detection

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
- [ ] 3.3 Test contrast ratios for accessibility
```

**任務最佳實踐：**
- 將相關任務分組到標題下
- 使用分層編號（1.1、1.2 等）
- 保持任務足夠小，以便在一次會話中完成
- 完成任務後將其勾掉

## 增量規格

Delta 規格是使 OpenSpec 適用於棕地開發的關鍵概念。他們描述了**正在發生的變化**，而不是重申整個規範。

### 格式

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST support TOTP-based two-factor authentication.

#### Scenario: 2FA enrollment
- GIVEN a user without 2FA enabled
- WHEN the user enables 2FA in settings
- THEN a QR code is displayed for authenticator app setup
- AND the user must verify with a code before activation

#### Scenario: 2FA login
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented
- AND login completes only after valid OTP

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 15 minutes of inactivity.
(Previously: 30 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 15 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA. Users should re-authenticate each session.)
```

### 三角洲剖面

| 部分 | 意義 | 封存時會發生什麼 |
|---------|---------|------------------------|
| `## ADDED Requirements` | 新行為 | 附加到主要規格 |
| `## MODIFIED Requirements` | 行為改變 | 取代現有要求 |
| `## REMOVED Requirements` | 已棄用的行為 | 從主要規格中刪除 |

### 為什麼選擇 Delta 而非全規格

**清晰。 ** 增量準確地顯示了正在發生的變化。閱讀完整的規範，您必須在心裡將其與當前版本進行區分。

**避免衝突。 ** 兩個變更可以觸及同一個規格文件而不會發生衝突，只要它們修改不同的需求即可。

**審核效率。 ** 審核者看到的是變化，而不是未改變的環境。專注於重要的事情。

**棕地適應。 ** 大多數工作都會改變現有的行為。 Delta 讓修改成為一流的，而不是事後才想到的。

## 模式

模式定義工作流程的工件類型及其相依性。

### 模式如何運作

```yaml
# openspec/schemas/spec-driven/schema.yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []              # No dependencies, can create first

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]      # Needs proposal before creating

  - id: design
    generates: design.md
    requires: [proposal]      # Can create in parallel with specs

  - id: tasks
    generates: tasks.md
    requires: [specs, design] # Needs both specs and design first
```

**工件形成依賴圖：**

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

**依賴關係是推動者，不是大門。 **它們顯示了可以建立的內容，而不是接下來必須建立的內容。如果不需要，可以跳過設計。您可以在設計之前或之後建立規格 - 兩者都僅取決於提案。

### 內建模式

**spec-driven** (default)

規範驅動開發的標準工作流程：

```
proposal → specs → design → tasks → implement
```

最適合：大多數功能都可以在您希望在實施之前就規格達成一致的情況下使用。

### 自訂模式

為您的團隊工作流程建立自訂架構：

```bash
# Create from scratch
openspec schema init research-first

# Or fork an existing one
openspec schema fork spec-driven research-first
```

**自訂架構範例：**

```yaml
# openspec/schemas/research-first/schema.yaml
name: research-first
artifacts:
  - id: research
    generates: research.md
    requires: []           # Do research first

  - id: proposal
    generates: proposal.md
    requires: [research]   # Proposal informed by research

  - id: tasks
    generates: tasks.md
    requires: [proposal]   # Skip specs/design, go straight to tasks
```

看 [客製化](customization.md) 有關建立和使用自訂架構的完整詳細資訊。

## 檔案

存檔透過將其增量規範合併到主要規範中並保留歷史變更來完成變更。

### 存檔時會發生什麼

```
Before archive:

openspec/
├── specs/
│   └── auth/
│       └── spec.md ◄────────────────┐
└── changes/                         │
    └── add-2fa/                     │
        ├── proposal.md              │
        ├── design.md                │ merge
        ├── tasks.md                 │
        └── specs/                   │
            └── auth/                │
                └── spec.md ─────────┘


After archive:

openspec/
├── specs/
│   └── auth/
│       └── spec.md        # Now includes 2FA requirements
└── changes/
    └── archive/
        └── 2025-01-24-add-2fa/    # Preserved for history
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── auth/
                    └── spec.md
```

### 存檔流程

1. **合併增量。 ** 每個增量規格部分（新增/修改/刪除）都套用於對應的主規範。

2. **移至存檔。 ** 更改資料夾移至 `changes/archive/` 帶有用於時間順序的日期前綴。

3. **保留上下文。 ** 所有工件在存檔中都保持完整。您始終可以回顧過去以瞭解為何進行更改。

### 為什麼存檔很重要

**乾淨的狀態。 **主動變化（`changes/`) 僅顯示正在進行的工作。已完成的工作將會移開。

**審計追蹤。 ** 存檔保留了每次更改的完整背景 - 不僅僅是更改的內容，還有解釋原因的提案、解釋如何更改的設計以及顯示已完成工作的任務。

**規範演進。 ** 隨著變更的歸檔，規範會有機成長。每個檔案都會合併其增量，並隨著時間的推移建立一個全面的規範。

## 這一切是如何結合在一起的

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENSPEC FLOW                                   │
│                                                                              │
│   ┌────────────────┐                                                         │
│   │  1. START      │  /opsx:propose (core) or /opsx:new (expanded)          │
│   │     CHANGE     │                                                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  2. CREATE     │  /opsx:ff or /opsx:continue (expanded workflow)         │
│   │     ARTIFACTS  │  Creates proposal → specs → design → tasks              │
│   │                │  (based on schema dependencies)                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  3. IMPLEMENT  │  /opsx:apply                                            │
│   │     TASKS      │  Work through tasks, checking them off                  │
│   │                │◄──── Update artifacts as you learn                      │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  4. VERIFY     │  /opsx:verify (optional)                                │
│   │     WORK       │  Check implementation matches specs                     │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐     ┌──────────────────────────────────────────────┐   │
│   │  5. ARCHIVE    │────►│  Delta specs merge into main specs           │   │
│   │     CHANGE     │     │  Change folder moves to archive/             │   │
│   └────────────────┘     │  Specs are now the updated source of truth   │   │
│                          └──────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**良性循環：**

1. 規範描述了當前的行為
2. 變更建議修改（作為增量）
3. 實施使改變成為現實
4. 存檔將增量合併到規格中
5. 規範現在描述了新的行為
6. 下次更改基於更新的規格

## 詞彙表

| 學期 | 定義 |
|------|------------|
| **工件** | 變更中的文件（提案、設計、任務或增量規格） |
| **檔案** | 完成變更並將其增量合併到主要規範的流程 |
| **改變** | 對系統的建議修改，打包為包含工件的資料夾 |
| **增量規格** | 描述相對於目前規範的變更（新增/修改/刪除）的規範 |
| **領域** | 規格的邏輯分組（例如， `auth/`, `payments/`) |
| **要求** | 系統必須具有的特定行為 |
| **設想** | 需求的具體範例，通常採用給定/何時/然後格式 |
| **架構** | 工件類型及其相依性的定義 |
| **規格** | 描述系統行為的規範，包含需求與場景 |
| **真相來源** | 這 `openspec/specs/` 目錄，包含目前商定的行為 |

## 下一步

- [入門](getting-started.md) - 實用的第一步
- [工作流程](workflows.md) - 常見模式以及何時使用每種模式
- [命令](commands.md) - 完整指令參考
- [客製化](customization.md) - 建立自訂模式並設定您的項目
