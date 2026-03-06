<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_pixel_dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/openspec_pixel_light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/openspec_pixel_light.svg" alt="OpenSpec logo" height="64">
    </picture>
  </a>
  
</p>
<p align="center">AI 編碼助理的規範驅動開發。</p>
<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="node version" src="https://img.shields.io/node/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://conventionalcommits.org"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white&style=flat-square" /></a>
</p>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

<p align="center">
  追蹤 <a href="https://x.com/0xTab">X 上的 @0xTab</a> 取得更新 · 加入 <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> 尋求協助與提問。
</p>

<p align="center">
  <sub>🧪 <strong>新的：</strong> <a href="docs/opsx.md">OPSX工作流程</a> — 模式驅動、可破解、流暢。無需更改程式碼即可迭代工作流程。</sub>
</p>

# OpenSpec

OpenSpec 將人類和人工智慧編碼助手與規範驅動的開發結合起來，以便您在編寫任何程式碼之前就要建立的內容達成一致。 **不需要 API 密鑰。 **

## 為什麼 OpenSpec？

人工智慧編碼助理功能強大，但當需求存在於聊天歷史記錄中時，它是不可預測的。 OpenSpec 新增了一個輕量級規範工作流程，可在實施之前鎖定意圖，為您提供確定性、可審查的輸出。

主要成果：
- 人類和人工智慧利益相關者在工作開始前就規格達成協議。
- 結構化變更資料夾（提案、任務和規範更新）保持範圍明確且可審核。
- 分享對建議的、活動的或存檔的內容的可見性。
- 與您已經使用的 AI 工具配合使用：支援自訂斜線命令，其他地方都使用上下文規則。

## OpenSpec 比較如何（一目了然）

- **輕量級**：簡單的工作流程，沒有 API 鍵，最少的設定。
- **棕地優先**：在 0→1 之外效果很好。 OpenSpec 將事實來源與提案分開： `openspec/specs/` （當前事實）和 `openspec/changes/` （建議的更新）。這使得跨功能的差異變得明確且易於管理。
- **變更追蹤**：提案、任務和規格增量同時存在；歸檔將批准的更新合併回規範中。
- **與規格套件和Kiro**相比：這些閃耀著全新的功能（0→1）。 OpenSpec 在修改現有行為 (1→n) 時也很出色，尤其是當更新跨越多個規範時。

請參閱中的完整比較 [OpenSpec 比較如何](#how-openspec-compares).

## 它是如何運作的

```
┌────────────────────┐
│ Draft Change       │
│ Proposal           │
└────────┬───────────┘
         │ share intent with your AI
         ▼
┌────────────────────┐
│ Review & Align     │
│ (edit specs/tasks) │◀──── feedback loop ──────┐
└────────┬───────────┘                          │
         │ approved plan                        │
         ▼                                      │
┌────────────────────┐                          │
│ Implement Tasks    │──────────────────────────┘
│ (AI writes code)   │
└────────┬───────────┘
         │ ship the change
         ▼
┌────────────────────┐
│ Archive & Update   │
│ Specs (source)     │
└────────────────────┘

1. Draft a change proposal that captures the spec updates you want.
2. Review the proposal with your AI assistant until everyone agrees.
3. Implement tasks that reference the agreed specs.
4. Archive the change to merge the approved updates back into the source-of-truth specs.
```

## 入門

### 支援的人工智慧工具

<details>
<summary><strong>本機斜杠命令</strong> （點擊展開）</summary>

這些工具有內建的 OpenSpec 指令。出現提示時選擇 OpenSpec 整合。

| 工具 | 命令 |
|------|----------|
| **亞馬遜 Q 開發人員** | `@openspec-proposal`, `@openspec-apply`, `@openspec-archive` (`.amazonq/prompts/`) |
| **反重力** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.agent/workflows/`) |
| **奧吉（增幅CLI）** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.augment/commands/`) |
| **Claude代碼** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` |
| **克萊因** | 工作流程在 `.clinerules/workflows/` 目錄（`.clinerules/workflows/openspec-*.md`) |
| **CodeBuddy 代碼 (CLI)** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.codebuddy/commands/`） - 看 [文件](https://www.codebuddy.ai/cli) |
| **Codex** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` （全球的： `~/.codex/prompts`，自動安裝） |
| **繼續** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.continue/prompts/`) |
| **嚴格** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.cospec/openspec/commands/`） - 看 [文件](https://costrict.ai)|
| **壓碎** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.crush/commands/openspec/`) |
| **游標** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` |
| **工廠機器人** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.factory/commands/`) |
| **雙子座CLI** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.gemini/commands/openspec/`) |
| **GitHub 副駕駛** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.github/prompts/`) |
| **iFlow (iflow-cli)** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.iflow/commands/`) |
| **公斤代碼** | `/openspec-proposal.md`, `/openspec-apply.md`, `/openspec-archive.md` (`.kilocode/workflows/`) |
| **開放代碼** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` |
| **Qoder** | `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` (`.qoder/commands/openspec/`） - 看 [文件](https://qoder.com) |
| **Qwen代碼** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.qwen/commands/`) |
| **Roo代碼** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.roo/commands/`) |
| **風帆衝浪** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.windsurf/workflows/`) |

Kilo Code 自動發現團隊工作流程。將生成的文件保存在 `.kilocode/workflows/` 並從命令面板觸發它們 `/openspec-proposal.md`, `/openspec-apply.md`， 或者 `/openspec-archive.md`.

</details>

<details>
<summary><strong>代理.md 相容</strong> （點擊展開）</summary>

這些工具會自動讀取工作流程指令 `openspec/AGENTS.md`。如果他們需要提醒，請讓他們遵循 OpenSpec 工作流程。瞭解更多關於 [AGENTS.md 約定](https://agents.md/).

| 工具 |
|-------|
| 放大器•朱爾斯•其他 |

</details>

### 安裝並初始化

#### 先決條件
- **Node.js >= 20.19.0** - 檢查您的版本 `node --version`

#### 第 1 步：全域安裝 CLI

**選項 A：使用 npm**

```bash
npm install -g @fission-ai/openspec@latest
```

驗證安裝：
```bash
openspec --version
```

**選項 B：使用 Nix（NixOS 和 Nix 套件管理器）**

無需安裝直接運作OpenSpec：
```bash
nix run github:Fission-AI/OpenSpec -- init
```

或安裝到您的個人資料：
```bash
nix profile install github:Fission-AI/OpenSpec
```

或添加到您的開發環境中 `flake.nix`:
```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:Fission-AI/OpenSpec";
  };

  outputs = { nixpkgs, openspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ openspec.packages.x86_64-linux.default ];
    };
  };
}
```

驗證安裝：
```bash
openspec --version
```

#### 步驟 2：在您的專案中初始化 OpenSpec

導航到您的專案目錄：
```bash
cd my-project
```

執行初始化：
```bash
openspec init
```

**初始化期間會發生什麼：**
- 系統會提示您選擇任何本機支援的 AI 工具（Claude Code、CodeBuddy、Cursor、OpenCode、Qoder 等）；其他助理總是依賴共享 `AGENTS.md` 存根
- OpenSpec 會自動為您選擇的工具設定斜杠命令，並始終寫入託管的 `AGENTS.md` 在項目根部進行交接
- 一個新的 `openspec/` 目錄結構已在您的專案中建立

**設定後：**
- 主要AI工具可以觸發 `/openspec` 無需額外設定的工作流程
- 執行 `openspec list` 驗證設定並檢視任何活動更改
- 如果您的編碼助理沒有立即顯示新的斜線命令，請重新啟動它。斜杠命令在啟動時加載，
  所以新的發布確保它們出現

### 可選：填充項目上下文

後 `openspec init` 完成後，您將收到一條建議提示，以幫助填充您的專案上下文：

```text
Populate your project context:
"Please read openspec/project.md and help me fill it out with details about my project, tech stack, and conventions"
```

使用 `openspec/project.md` 定義專案級約定、標準、架構模式以及所有變更中應遵循的其他準則。

### 建立你的第一個改變

這是一個真實的範例，顯示了完整的 OpenSpec 工作流程。這適用於任何人工智慧工具。使用本機斜杠命令的人將自動識別快捷方式。

#### 1. 起草提案
首先要求你的人工智慧建立一個變更提案：

```text
You: Create an OpenSpec change proposal for adding profile search filters by role and team
     (Shortcut for tools with slash commands: /openspec:proposal Add profile search filters)

AI:  I'll create an OpenSpec change proposal for profile filters.
     *Scaffolds openspec/changes/add-profile-filters/ with proposal.md, tasks.md, spec deltas.*
```

#### 2. 驗證和審查
檢查變更是否已正確建立並審核提案：

```bash
$ openspec list                             # Confirm the change folder exists
$ openspec validate add-profile-filters     # Validate spec formatting
$ openspec show add-profile-filters         # Review proposal, tasks, and spec delta
```

#### 3. 完善規格
迭代規範，直到它們滿足您的需求：

```text
You: Can you add acceptance criteria for the role and team filters?

AI:  I'll update the spec delta with scenarios for role and team filters.
     *Edits openspec/changes/add-profile-filters/specs/profile/spec.md and tasks.md.*
```

#### 4. 實施變革
一旦規格看起來不錯，就開始實施：

```text
You: The specs look good. Let's implement this change.
     (Shortcut for tools with slash commands: /openspec:apply add-profile-filters)

AI:  I'll work through the tasks in the add-profile-filters change.
     *Implements tasks from openspec/changes/add-profile-filters/tasks.md*
     *Marks tasks complete: Task 1.1 ✓, Task 1.2 ✓, Task 2.1 ✓...*
```

#### 5. 歸檔已完成的變更
實施完成後，歸檔變更：

```text
AI:  All tasks are complete. The implementation is ready.

You: Please archive the change
     (Shortcut for tools with slash commands: /openspec:archive add-profile-filters)

AI:  I'll archive the add-profile-filters change.
    *Runs: openspec archive add-profile-filters --yes*
     ✓ Change archived successfully. Specs updated. Ready for the next feature!
```

或在終端機中自己執行命令：
```bash
$ openspec archive add-profile-filters --yes  # Archive the completed change without prompts
```

**注意：** 具有本機斜杠指令的工具（Claude Code、CodeBuddy、Cursor、Codex、Qoder、RooCode）可以使用所示的捷徑。所有其他工具都可處理自然語言請求，以「建立 OpenSpec 提案」、「套用 OpenSpec 變更」或「存檔變更」。

## 命令參考

```bash
openspec list               # View active change folders
openspec view               # Interactive dashboard of specs and changes
openspec show <change>      # Display change details (proposal, tasks, spec updates)
openspec validate <change>  # Check spec formatting and structure
openspec archive <change> [--yes|-y]   # Move a completed change into archive/ (non-interactive with --yes)
```

## 範例：AI 如何建立 OpenSpec 文件

當您要求人工智慧助理「新增雙重認證」時，它會建立：

```
openspec/
├── specs/
│   └── auth/
│       └── spec.md           # Current auth spec (if exists)
└── changes/
    └── add-2fa/              # AI creates this entire structure
        ├── proposal.md       # Why and what changes
        ├── tasks.md          # Implementation checklist
        ├── design.md         # Technical decisions (optional)
        └── specs/
            └── auth/
                └── spec.md   # Delta showing additions
```

### AI 產生的規範（建立於 `openspec/specs/auth/spec.md`):

```markdown
# Auth Specification

## Purpose
Authentication and session management.

## Requirements
### Requirement: User Authentication
The system SHALL issue a JWT on successful login.

#### Scenario: Valid credentials
- WHEN a user submits valid credentials
- THEN a JWT is returned
```

### AI 產生的變化增量（建立於 `openspec/changes/add-2fa/specs/auth/spec.md`):

```markdown
# Delta for Auth

## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- WHEN a user submits valid credentials
- THEN an OTP challenge is required
```

### AI 產生的任務（建立於 `openspec/changes/add-2fa/tasks.md`):

```markdown
## 1. Database Setup
- [ ] 1.1 Add OTP secret column to users table
- [ ] 1.2 Create OTP verification logs table

## 2. Backend Implementation  
- [ ] 2.1 Add OTP generation endpoint
- [ ] 2.2 Modify login flow to require OTP
- [ ] 2.3 Add OTP verification endpoint

## 3. Frontend Updates
- [ ] 3.1 Create OTP input component
- [ ] 3.2 Update login flow UI
```

**重要提示：** 您無需手動建立這些文件。您的人工智慧助理會根據您的要求和現有程式碼庫產生它們。

## 瞭解 OpenSpec 文件

### 德爾塔格式

增量是顯示規格變化的“補丁”：

- **`## ADDED Requirements`** - 新功能
- **`## MODIFIED Requirements`** - 改變了行為（包括完整更新的文字）
- **`## REMOVED Requirements`** - 已棄用的功能

**格式要求：**
- 使用 `### Requirement: <name>` 對於標題
- 每個需求至少需要一個 `#### Scenario:` 堵塞
- 在要求文本中使用 SHALL/MUST

## OpenSpec 比較如何

### 與規格套件
OpenSpec的兩層模型（`openspec/specs/` 對於目前的真相來說， `openspec/changes/` 對於建議的更新）將狀態和差異分開。當您修改現有功能或觸及多個規格時，此比例會縮放。 spec-kit 對於 greenfield/0→1 來說很強大，但為跨規範更新和不斷發展的功能提供的結構較少。

### 與 Kiro.dev
OpenSpec 將一項功能的每個變更分組到一個資料夾中（`openspec/changes/feature-name/`），可以輕鬆地一起追蹤相關規格、任務和設計。 Kiro 將更新傳播到多個規範資料夾，這可能會使功能追蹤變得更加困難。

### 與無規格對比
如果沒有規範，人工智慧編碼助理會根據模糊的提示產生程式碼，通常會缺少需求或添加不需要的功能。 OpenSpec 透過在編寫任何程式碼之前就所需的行為達成一致來帶來可預測性。

## 團隊採用

1. **初始化OpenSpec** – 執行 `openspec init` 在你的倉庫中。
2. **從新功能開始** – 要求您的人工智慧捕捉即將到來的工作作為變更建議。
3. **逐步成長** – 每次變更都會歸檔到記錄您的系統的即時規格中。
4. **保持靈活性** – 不同的隊友可以使用 Claude Code、CodeBuddy、Cursor 或任何 AGENTS.md 相容工具，同時分享相同的規格。

執行 `openspec update` 每當有人切換工具時，您的代理就會取得最新的指令和斜線命令綁定。

## 更新 OpenSpec

1. **升級包**
   ```bash
   npm install -g @fission-ai/openspec@latest
   ```
2. **重新整理代理說明**
   - 執行 `openspec update` 在每個專案內部重新產生人工智慧指導並確保最新的斜線命令處於活動狀態。

## 實驗特點

<details>
<summary><strong>🧪 OPSX：流暢、迭代的工作流程</strong> （僅限 Claude 代碼）</summary>

**為什麼存在：**
- 標準工作流程已被鎖定 - 您無法調整說明或自訂
- 當AI輸出不好時，你無法自行改善提示
- 每個人的工作流程相同，無法符合您團隊的工作方式

**有什麼不同：**
- **可破解** — 自行編輯範本和模式，立即測試，無需重建
- **粒度** - 每個工件都有自己的說明，並單獨測試和調整
- **可自訂** — 定義您自己的工作流程、工件和依賴項
- **流體** — 無階段門，隨時更新任何工件

```
You can always go back:

  proposal ──→ specs ──→ design ──→ tasks ──→ implement
     ▲           ▲          ▲                    │
     └───────────┴──────────┴────────────────────┘
```

| 命令 | 它的作用 |
|---------|--------------|
| `/opsx:new` | 開始新的改變 |
| `/opsx:continue` | 建立下一個工件（基於已準備好的內容） |
| `/opsx:ff` | 快轉（同時所有計劃工件） |
| `/opsx:apply` | 實施任務，根據需要更新工件 |
| `/opsx:archive` | 完成後存檔 |

**設定:** `openspec experimental`

[完整文檔 →](docs/opsx.md)

</details>

<details>
<summary><strong>遙測</strong> – OpenSpec 收集匿名使用統計資料（選擇退出： <code>OPENSPEC_TELEMETRY=0</code>)</summary>

我們僅收集命令名稱和版本來瞭解使用模式。沒有參數、路徑、內容或 PII。在 CI 後自動停用。

**選擇退出：** `export OPENSPEC_TELEMETRY=0` 或者 `export DO_NOT_TRACK=1`

</details>

## 貢獻

- 安裝依賴項： `pnpm install`
- 建造： `pnpm run build`
- 測試： `pnpm test`
- 本地開發CLI： `pnpm run dev` 或者 `pnpm run dev:cli`
- 常規提交（一行）： `type(scope): subject`

<details>
<summary><strong>維護者和顧問</strong></summary>

看 [MAINTAINERS.md](MAINTAINERS.md) 檢視幫助指導專案的核心維護者和顧問的清單。

</details>

## 執照

MIT
