## 修改後的要求
### 需求：AI工具設定

該命令應根據使用者選擇使用 OpenSpec 指令設定 AI 編碼助理。

#### 場景：提示選擇AI工具

- **何時** 交互執行
- **然後** 提示使用者「您使用哪些人工智慧工具？」使用多重選擇選單
- **並** 使用核取方塊列出每個可用工具：
  - Claude 程式碼（建立或重新整理 CLAUDE.md 和斜線指令）
  - 遊標（建立或重新整理 `.cursor/commands/*` 斜線指令）
  - AGENTS.md 標準（使用 OpenSpec 標記建立或重新整理 AGENTS.md）
- **並且** 在存在託管文件的工具旁邊顯示“（已設定）”，以便用戶瞭解選擇將重新整理內容
- **並且** 將禁用的工具視為“即將推出”並保持它們不可選擇
- **並且**允許在選擇一個或多個工具後按 Enter 進行確認

### 要求：AI工具設定詳細信息

此指令應使用標記系統使用 OpenSpec 特定指令正確設定選定的 AI 工具。

#### 場景：設定Claude代碼

- **何時** 選擇 Claude 代碼
- **然後** 建立或更新 `CLAUDE.md` 在專案根目錄中（不在 openspec/ 內）

#### 場景：建立新的 CLAUDE.md

- **何時** CLAUDE.md 不存在
- **然後** 建立新文件，其中 OpenSpec 內容包含在標記中：
```markdown
<!-- OPENSPEC:START -->
# OpenSpec Instructions

Instructions for AI coding assistants using OpenSpec for spec-driven development.

## TL;DR Quick Checklist
- Search existing work: `openspec spec list --long`, `openspec list`
- Decide scope: new capability vs modify existing capability
- Pick a unique `change-id`: verb-led kebab-case (`add-`, `update-`, `remove-`, `refactor-`)
- Scaffold: `proposal.md`, `tasks.md`, optional `design.md`, and spec deltas
- Validate with `openspec validate [change-id] --strict`
- Request approval before implementation
<!-- OPENSPEC:END -->
```

#### 場景：更新現有的 CLAUDE.md

- **當** CLAUDE.md 已經存在
- **然後** 保留所有現有內容
- **並且** 使用標記在檔案開頭插入 OpenSpec 內容
- **並且** 確保標記在已經存在的情況下不會重複

#### 場景：使用標記管理內容

- **何時** 使用標記系統
- **然後**使用 `<!-- OPENSPEC:START -->` 標記託管內容的開始
- **和**使用 `<!-- OPENSPEC:END -->` 標記託管內容的結束
- **AND** allow OpenSpec to update its content without affecting user customizations
- **並且** 完整保留標記之外的所有內容

### 要求：互動模式

該命令應提供一個用於 AI 工具選擇的互動式選單，並具有清晰的導航說明。

#### 場景：顯示互動式選單

- **何時**執行
- **然後** 提示使用者：“您使用哪些人工智慧工具？”
- **並且** 顯示具有可用工具的基於核取方塊的多選選單（Claude% 代碼、遊標、AGENTS.md 標準）
- **並且** 將已停用的選項顯示為「即將推出」（不可選擇）
- **和** 顯示內嵌幫助，指示空格切換選擇並按 Enter 確認

#### 場景：導航選單

- **何時** 使用者位於選單中
- **然後** 允許箭頭鍵在選項之間移動
- **並且**允許空白鍵切換突出顯示的選項
- **並且**允許按 Enter 鍵確認所有目前選擇

### 要求：成功輸出

該命令應在成功初始化後提供清晰、可操作的後續步驟。

#### 場景：顯示成功訊息

- **何時** 初始化成功完成
- **然後** 顯示成功橫幅，然後顯示針對所選工具自訂的可操作提示
- **並** 總結建立了哪些輔助文件以及重新整理了哪些輔助文件（例如， `CLAUDE.md (created)`, `.cursor/commands/openspec-apply.md (refreshed)`)
- **並且** 為每個設定的助手提供可複製貼上的入門提示，以真正的自訂指導替換佔位符文字（[您的功能]）
- **和** 當不存在特定於工具的檔案時（例如，僅選擇 AGENTS.md 標準時），請參考 AGENTS.md 相容助手

