# 入門

本指南解釋了 OpenSpec 在安裝並初始化後如何相容。有關安裝說明，請參閱 [主要 README](../README.md#quick-start).

## 它是如何運作的

OpenSpec 可協助您和您的 AI 編碼助理在編寫任何程式碼之前建立內容。

**預設快速路徑（核心設定檔）：**

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

**擴充路徑（自訂工作流程選擇）：**

```text
/opsx:new ──► /opsx:ff or /opsx:continue ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

預設的全域設定檔是 `core`，其中包括 `propose`, `explore`, `apply`， 和 `archive`。您可以使用以下命令啟用擴充功能的工作流程指令 `openspec config profile` 進而 `openspec update`.

## OpenSpec 建立什麼

執行後 `openspec init`，您的專案具有以下結構：

```
openspec/
├── specs/              # Source of truth (your system's behavior)
│   └── <domain>/
│       └── spec.md
├── changes/            # Proposed updates (one folder per change)
│   └── <change-name>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # Delta specs (what's changing)
│           └── <domain>/
│               └── spec.md
└── config.yaml         # Project configuration (optional)
```

**兩個關鍵目錄：**

- **`specs/`** - 事實來源。這些規格描述了您的系統目前的行為。按域組織（例如， `specs/auth/`, `specs/payments/`).

- **`changes/`** - 提議變更。每個變更都有自己的資料夾，其中包含所有相關的工件。更改完成後，其規格會合併到主要規格中 `specs/` 目錄。

## 瞭解工件

每個更改資料夾都包含指導工作的工件：

| 工件 | 目的 |
|----------|---------|
| `proposal.md` | 「為什麼」和「什麼」——捕捉意圖、範圍和方法 |
| `specs/` | 增量規格顯示新增/修改/刪除的要求 |
| `design.md` | 「如何」—技術方法與架構決策 |
| `tasks.md` | 帶有核取方塊的實施清單 |

**工件相互建構：**

```
proposal ──► specs ──► design ──► tasks ──► implement
   ▲           ▲          ▲                    │
   └───────────┴──────────┴────────────────────┘
            update as you learn
```

當您在實施過程中瞭解更多資訊時，您可以隨時返回並完善早期的工件。

## Delta 規格運作原理

Delta 規格是OpenSpec 中的關鍵概念。它們顯示了相對於您當前規格的變化。

### 格式

增量規範使用部分來指示更改的類型：

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes of inactivity.
(Previously: 60 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

### 封存時會發生什麼

當您歸檔變更時：

1. **新增**要求附加到主要規格中
2. **修改**要求替換現有版本
3. **已刪除** 要求已從主要規格中刪除

更改資料夾移動到 `openspec/changes/archive/` 用於審計歷史記錄。

## 範例：您的第一個改變

讓我們逐步瞭解如何為應用程式添加暗模式。

### 1. 開始更改（預設）

```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!
```

如果您已啟用擴充工作流程設定檔，您也可以透過兩個步驟執行此操作： `/opsx:new` 然後 `/opsx:ff` （或者 `/opsx:continue` 逐步）。

### 2. 建立了什麼

**proposal.md** - 捕捉意圖：

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage.

## Scope
- Add theme toggle in settings
- Support system preference detection
- Persist preference in localStorage

## Approach
Use CSS custom properties for theming with a React context
for state management.
```

**specs/ui/spec.md** - Delta 顯示新要求：

```markdown
# Delta for UI

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

#### Scenario: System preference
- GIVEN a user with no saved preference
- WHEN the application loads
- THEN the system's preferred color scheme is used
```

**tasks.md** - 實施清單：

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
```

### 3. 實施

```
You: /opsx:apply

AI:  Working through tasks...
     ✓ 1.1 Created ThemeContext with light/dark state
     ✓ 1.2 Added CSS custom properties to globals.css
     ✓ 1.3 Implemented localStorage persistence
     ✓ 2.1 Created ThemeToggle component
     ...
     All tasks complete!
```

在實施過程中，如果您發現設計需要調整，只需更新工件並繼續即可。

### 4. 存檔

```
You: /opsx:archive

AI:  Archiving add-dark-mode...
     ✓ Merged specs into openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/
     Done! Ready for the next feature.
```

您的增量規格現在是主要規格的一部分，記錄您的系統如何運作。

## 驗證和審查

使用 CLI 檢查您的變更：

```bash
# List active changes
openspec list

# View change details
openspec show add-dark-mode

# Validate spec formatting
openspec validate add-dark-mode

# Interactive dashboard
openspec view
```

## 下一步

- [工作流程](workflows.md) - 常見模式以及何時使用每個命令
- [命令](commands.md) - 所有斜槓指令的完整參考
- [概念](concepts.md) - 更深入瞭解規範、變更和模式
- [客製化](customization.md) - 讓OpenSpec按照你的方式工作
