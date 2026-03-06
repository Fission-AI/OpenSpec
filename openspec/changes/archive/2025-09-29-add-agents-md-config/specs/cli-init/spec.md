## 修改後的要求
### 需求：AI工具設定
該命令應根據使用者選擇使用 OpenSpec 指令設定 AI 編碼助理。

#### 場景：提示選擇AI工具

- **何時**執行
- **然後** 提示使用者選擇要設定的 AI 工具：
  - Claude 代碼（✅ OpenSpec 自訂斜線指令可用）
  - 遊標（✅ OpenSpec 自訂斜線指令可用）
  - AGENTS.md（適用於 Codex、Amp、Copilot、...）

### 要求：AI工具設定詳細信息
此指令應使用標記系統使用 OpenSpec 特定指令正確設定選定的 AI 工具。

#### 場景：設定Claude代碼

- **何時** 選擇 Claude 代碼
- **然後** 建立或更新 `CLAUDE.md` 在專案根目錄中（不在 openspec/ 內）

#### 場景：設定AGENTS標準

- **何時** 選擇 AGENTS.md 標準
- **然後** 建立或更新 `AGENTS.md` 在專案根目錄中（不在 openspec/ 內）

#### 場景：建立新的 CLAUDE.md

- **何時** CLAUDE.md 不存在
- **然後** 建立新文件，其中 OpenSpec 內容包含在標記中：
```markdown
<!-- OPENSPEC:START -->
# OpenSpec Project

This document provides instructions for AI coding assistants on how to use OpenSpec conventions for spec-driven development. Follow these rules precisely when working on OpenSpec-enabled projects.

This project uses OpenSpec for spec-driven development. Specifications are the source of truth.

See @openspec/AGENTS.md for detailed conventions and guidelines.
<!-- OPENSPEC:END -->
```

#### 場景：建立新的 AGENTS.md

- **何時** AGENTS.md 不存在於專案根目錄中
- **然後** 使用與 CLAUDE.md 相同的範本建立新文件，其中 OpenSpec 內容包含在標記中

#### 場景：更新現有的 CLAUDE.md

- **當** CLAUDE.md 已經存在
- **然後** 保留所有現有內容
- **並且** 使用標記在檔案開頭插入 OpenSpec 內容
- **並且** 確保標記在已經存在的情況下不會重複

#### 場景：更新現有的 AGENTS.md

- **何時** AGENTS.md 已存在於專案根目錄中
- **然後** 保留所有現有內容
- **並且** 確保檔案開頭的 OpenSpec 託管區塊已重新整理而不重複標記

#### 場景：使用標記管理內容

- **何時** 使用標記系統
- **然後**使用 `<!-- OPENSPEC:START -->` 標記託管內容的開始
- **和**使用 `<!-- OPENSPEC:END -->` 標記託管內容的結束
- **AND** allow OpenSpec to update its content without affecting user customizations
- **並且** 完整保留標記之外的所有內容

為什麼要使用標記：
- 使用者可能想要保留現有的 CLAUDE.md 或 AGENTS.md 指令
- OpenSpec可以在未來版本中更新其說明
- OpenSpec 管理的內容和使用者管理的內容之間有清晰的界限
