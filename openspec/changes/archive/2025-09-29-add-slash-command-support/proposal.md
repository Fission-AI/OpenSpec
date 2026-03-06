# 新增對編碼代理的斜線命令支援

## 概括
- 啟用 OpenSpec 為支援的編碼代理（Claude 代碼和遊標）產生和更新自訂斜線命令。
- 提供與 OpenSpec 的工作流程一致的三個斜線命令：提案（啟動更改提案）、應用程式（實施）和存檔。
- 在代理之間共享斜杠命令模板，以使未來的擴展變得簡單。

## 動機
開發人員使用不同的編碼代理和編輯器。在 OpenSpec 工作流程的工具中使用一致的斜線命令可以減少摩擦並確保觸發工作流程的標準方法。現在支援 Claude 程式碼和遊標為未來引入斜線命令功能的代理程式奠定了基礎。

## 提議
1. 期間 `openspec init`，當使用者選擇支援的工具時，為三個 OpenSpec 工作流程階段產生斜線指令設定：
   - Claude（命名空間）： `/openspec/proposal`, `/openspec/apply`, `/openspec/archive`.
   - 遊標（平面，附前綴）： `/openspec-proposal`, `/openspec-apply`, `/openspec-archive`.
   - 語意：
     - Create – scaffold a change (ID, `proposal.md`, `tasks.md`, delta specs); validate strictly.
     - Apply – implement an approved change; complete tasks; validate strictly.
     - Archive – archive after deployment; update specs if needed.
   - 每個命令文件必須嵌入來自以下來源的簡潔的分步說明： `openspec/README.md` （請參閱模板內容部分）。
2. 儲存每個工具的斜線命令檔：
   - Claude 代碼： `.claude/commands/openspec/{proposal,apply,archive}.md`
   - 游標: `.cursor/commands/{openspec-proposal,openspec-apply,openspec-archive}.md`
   - 確保建立嵌套目錄。
3. 命令檔案格式和元資料：
   - 當工具支援時，將 Markdown 與可選的 YAML frontmatter 用於工具元資料（名稱/標題、描述、類別/標籤）。
   - 僅在正文周圍放置 OpenSpec 標記，切勿在 Frontmatter 內部放置。
   - 保留可見的斜線名稱、檔案名稱和任何前面的內容 `name`/`id` 一致對齊（例如， `proposal`, `openspec-proposal`).
   - 命名空間：將它們分類在「OpenSpec」下，並優先使用唯一 ID（例如， `openspec-proposal`）以避免碰撞。
4. 集中模板：定義一次命令主體並跨工具重複使用；套用最少的每個工具包裝器（frontmatter、類別、檔案名稱）。
5. 期間 `openspec update`，僅重新整理標記內現有的斜杠命令檔案（基於每個文件）；不要建立丟失的文件或新工具。

## 設計理念
- 介紹 `SlashCommandConfigurator` 每個工具管理多個文件。
  - 暴露目標而不是單一 `configFileName` （例如。， `getTargets(): Array<{ path: string; kind: 'slash'; id: string }>`).
  - 提供 `generateAll(projectPath, openspecDir)` 對於初始化和 `updateExisting(projectPath, openspecDir)` 用於更新。
- 每個工具適配器僅添加 frontmatter 和路徑；主體來自共享模板。
- 模板存在於 `TemplateManager` 帶有幫助程序，可以從中提取簡潔、權威的片段 `openspec/README.md`.
- 更新每個文件結果的流日誌，以便用戶準確地看到重新整理了哪些斜杠文件。

### 標記放置
- 標記必須只包含 Markdown 正文內容：
  - Frontmatter（如果有）先出現。
  - 然後 `<!-- OPENSPEC:START -->` … 身體 … `<!-- OPENSPEC:END -->`.
  - 避免將標記插入 YAML 區塊以防止解析錯誤。

### 冪等性和建立規則
- `init`：為所選工具建立所有三個檔案一次；隨後的 `init` 執行對於現有文件來說是無操作的。
- `update`：僅重新整理存在的文件；跳過丟失的文件而不建立新文件。
- 目錄建立為 `.claude/commands/openspec/` 和 `.cursor/commands/` 是設定者的責任。

### 命令命名和用戶體驗
- Claude 代碼：在斜線本身中使用命名空間以提高可讀性和分組： `/openspec/proposal`, `/openspec/apply`, `/openspec/archive`.
- 遊標：使用帶有 `openspec-` 前綴： `/openspec-proposal`, `/openspec-apply`, `/openspec-archive`。組透過 `category: OpenSpec` 當支援時。
- 一致性：對齊檔案名稱、可見斜線名稱和任何前面的內容 `id` （例如。， `id: openspec-apply`).
- 遷移：在遷移過程中不要重新命名現有命令 `update`;僅套用新命名 `init` （或透過顯式遷移步驟）。

## 開放式問題
- 驗證每個工具版本支援的確切元資料/frontmatter；如果不受支援，則省略 frontmatter 並僅發送 Markdown body。
- 確認目標版本的最終遊標指令檔位置；僅當 Cursor 不解析 frontmatter 時才回退到 Markdown。
- 評估最初三個命令之外的其他命令（例如， `/show-change`, `/validate-all`）根據用戶需求。

## 替代方案
- 每個工具的硬編碼斜線命令文字（拒絕：重複內容；增加維護）。
- 延遲遊標支援，直到其設定穩定（部分接受）：將遊標置於功能標誌後面，直到在真實環境中進行驗證。

## 風險
- 工具設定格式可能會發生變化，需要更新包裝器/frontmatter。
- 不正確的路徑或類別可能會隱藏命令；新增路徑存在檢查並清除日誌記錄。
- 標記誤用（在 frontmatter 內部）可能會破壞解析；在測試中執行放置規則。

## 未來的工作
- 支援公開斜杠命令 APIs 的其他編輯器/代理。
- 允許使用者在執行過程中自訂命令名稱和類別 `openspec init`.
- 提供專用命令重新產生斜線命令，無需執行完整 `update`.

## 文件格式範例
以下範例說明了預期的結構。如果工具不支援 frontmatter，請省略 YAML 區塊並僅保留標記 + 正文。

### Claude 代碼： `.claude/commands/openspec/proposal.md`
```markdown
---
name: OpenSpec: Proposal
description: Scaffold a new OpenSpec change and validate strictly.
category: OpenSpec
tags: [openspec, change]
---
<!-- OPENSPEC:START -->
...command body from shared template...
<!-- OPENSPEC:END -->
```

斜槓調用： `/openspec/proposal` （命名空間）

### 游標: `.cursor/commands/openspec-proposal.md`
```markdown
---
name: /openspec-proposal
id: openspec-proposal
category: OpenSpec
description: Scaffold a new OpenSpec change and validate strictly.
---
<!-- OPENSPEC:START -->
...command body from shared template...
<!-- OPENSPEC:END -->
```

斜槓調用： `/openspec-proposal` （平鋪，附前綴）

## 模板內容
模板應該簡短、可操作並且來源 `openspec/README.md` 以避免重複。每個命令主體包括：
- 護欄：如有需要，提出 1-2 個澄清問題；遵循最小複雜性規則；使用 `pnpm` 對於節點項目。
- 針對工作流程階段（提案、應用、歸檔）量身定制的步驟列表，包括嚴格的驗證命令。
- 指向的指針 `openspec show`, `openspec list`，以及驗證失敗時的故障排除提示。

## 測試策略
- 每個工具產生的檔案的黃金快照（frontmatter + 標記 + 正文）。
- 部分存在測試：如果存在 1-2 個文件， `update` 只重新整理那些，不會建立丟失的。
- 標記放置測試：確保標記永遠不會出現在 frontmatter 內；涵蓋遺失/重複的標記恢復行為。
- 記錄測試： `update` 報告斜杠命令的每個文件更新。
