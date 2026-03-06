## 為什麼

用戶抱怨技能/命令太多（目前有 10 個），新用戶感到不知所措。我們希望簡化預設體驗，同時保留進階使用者功能和向後相容性。

目標：**讓使用者在一分鐘內獲得「頓悟時刻」**。

```text
0:00  $ openspec init
      ✓ Done. Run /opsx:propose "your idea"

0:15  /opsx:propose "add user authentication"

0:45  Agent creates proposal.md, design.md, tasks.md
      "Whoa, it planned the whole thing for me" ← AHA

1:00  /opsx:apply
```

此外，使用者對工作流程的交付方式有不同的偏好（技能、命令、兩者），但這應該是高級使用者設定，而不是新使用者考慮的事情。

## 有什麼變化

### 1. 智能預設初始化

Init 自動偵測工具並要求確認：

```text
$ openspec init

Detected tools:
  [x] Claude Code
  [x] Cursor
  [ ] Windsurf

Press Enter to confirm, or Space to toggle

Setting up OpenSpec...
✓ Done

Start your first change:
  /opsx:propose "add dark mode"
```

**沒有設定檔或交付提示。 **預設值為：
- 簡介： 核心
- 交貨方式：均

高級用戶可以透過自訂 `openspec config profile`.

### 2. 工具檢測行為

Init 掃描現有工具目錄（`.claude/`, `.cursor/`， ETC。 ）：
- **偵測到的工具（互動式）：** 顯示預先選取的核取方塊，使用者確認或調整
- **未偵測到工具（互動式）：** 提示選擇完整工具
- **非互動式 (CI)：** 自動使用偵測到的工具，如果未偵測到則失敗

### 3.修復工具選擇UX

目前的行為讓使用者感到困惑：
- 按 T​​ab 鍵確認（意外）

新行為：
- **空格** 切換選擇
- **輸入**確認

### 4. 引入設定檔

設定檔定義要安裝的工作流程：

- **核心**（預設）： `propose`, `explore`, `apply`, `archive` （4個工作流程）
- **自訂**：使用者選擇的工作流程子集

這 `propose` 工作流程是新的——它結合了 `new` + `ff` 到建立變更並產生所有工件的單一命令中。

### 5. 改善提案使用者體驗

`/opsx:propose` 應該透過解釋它正在做什麼來自然地吸引用戶：

```text
I'll create a change with 3 artifacts:
- proposal.md (what & why)
- design.md (how)
- tasks.md (implementation steps)

When ready to implement, run /opsx:apply
```

這說明了大多數用戶不需要單獨的入職培訓。

### 6. 引入交付設定

交付控制工作流程的安裝方式：

- **兩者**（預設）：技能和命令
- **技能**：僅技能
- **命令**：僅命令

儲存在現有的全域設定中（`~/.config/openspec/config.json`）。初始化期間不提示。

### 7. 新CLI命令

```shell
# Profile configuration (interactive picker for delivery + workflows)
openspec config profile          # interactive picker
openspec config profile core     # preset shortcut (core workflows, preserves delivery)
```

互動式選擇器允許使用者在一處設定交付方法和工作流程選擇：

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

### 8. 向後相容和遷移

**現有使用者保留目前設定。 ** 當 `openspec update` 在具有現有工作流程的專案上執行，並且沒有 `profile` 在全域設定中，它執行一次性遷移：

1. 掃描專案中所有工具目錄中已安裝的工作流程文件
2. 寫 `profile: "custom"`, `delivery: "both"`, `workflows: [<detected>]` 到全域設定
3. 重新整理模板但不新增或刪除任何工作流程
4. 顯示：“已遷移：具有 N 個現有工作流程的自訂設定檔”

遷移後，後續 `init` 和 `update` 命令尊重遷移的設定。

**關鍵行為：**
- 現有使用者的工作流程完全按原樣保留（不 `propose` 自動添加）
- 兩個都 `init` （重新初始化）和 `update` 如果未設定設定檔，則觸發現有項目的遷移
- `openspec init` 在 **新** 專案（沒有現有工作流程）上使用全域設定，預設為 `core`
- `init` 使用自訂設定檔直接套用設定的工作流程（無設定檔確認提示）
- `init` 驗證 `--profile` 值（`core` 或者 `custom`) 以及無效輸入的錯誤
- 遷移訊息提及 `propose` 並建議 `openspec config profile core` 選擇加入
- 遷移後，使用者可以選擇加入 `core` 個人資料透過 `openspec config profile core`
- 工作流程範本有條件地僅引用「後續步驟」指南中已安裝的工作流程
- 應用程式交付變更：切換到 `skills` 刪除命令文件，切換到 `commands` 刪除技能文件
- Re-running `init` 對現有專案應用交付清理（刪除不再與交付相符的檔案）
- `update` 即使模板版本已經是最新版本，也會將設定檔/交付偏差視為需要更新
- `update` 將僅命令安裝視為已設定的工具
- 所有工作流程仍然可以透過自訂設定檔使用

## 能力

### 新功能

- `profiles`：工作流程設定檔（核心、自訂）、交付首選項、全域設定儲存、互動式選擇器
- `propose-workflow`：建立變更+產生所有工件的組合工作流程

### 修改後的功能

- `cli-init`：智慧預設設置，具有工具自動檢測、基於設定檔的技能/命令生成
- `cli-update`：設定檔支援、交付變更、現有用戶的一次性遷移

## 影響

### 新文件
- `src/core/templates/workflows/propose.ts` - 新的提案工作流程模板
- `src/core/profiles.ts` - 設定檔定義和邏輯
- `src/core/available-tools.ts` - 偵測使用者從目錄中擁有哪些人工智慧工具

### 修改文件
- `src/core/init.ts` - 智慧預設、自動偵測、工具確認
- `src/core/config.ts` - 新增設定檔和交付類型
- `src/core/global-config.ts` - 將設定檔、交付、工作流程欄位新增至架構中
- `src/core/shared/skill-generation.ts` - 依個人資料過濾，尊重交付
- `src/core/shared/tool-detection.ts` - 更新 SKILL_NAMES 和 COMMAND_IDS 以包含建議
- `src/commands/config.ts` - 添加 `profile` 帶有互動式選擇器的子命令
- `src/core/update.ts` - 新增設定檔/交付支援、交付變更的檔案刪除
- `src/prompts/searchable-multi-select.ts` - 修復鍵綁定（空白/輸入）

### 全域設定模式擴充
```json
// ~/.config/openspec/config.json (extends existing)
{
  "telemetry": { ... },          // existing
  "featureFlags": { ... },       // existing
  "profile": "core",             // NEW: core | custom
  "delivery": "both",            // NEW: both | skills | commands
  "workflows": ["propose", ...]  // NEW: only if profile: custom
}
```

## 設定檔參考

| 輪廓 | 工作流程 | 描述 |
|---------|-----------|-------------|
| 核 | 提出、探索、應用、歸檔 | 為大多數使用者簡化流程（預設） |
| 風俗 | user-defined | 透過以下方式準確選擇您需要的內容 `openspec config profile` |
