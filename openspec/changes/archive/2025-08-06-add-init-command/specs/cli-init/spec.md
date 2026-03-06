# CLI 初始化規範

## 目的

這 `openspec init` 命令應在任何專案中建立完整的 OpenSpec 目錄結構，從而能夠立即採用 OpenSpec 約定並支援多個 AI 編碼助理。

## 行為

### 進度指標

執行初始化步驟時
然後在背景靜默驗證環境（除非出現錯誤，否則不會輸出）
並使用 ora spinners 顯示進度：
- 顯示微調器：“⠋ 建立 OpenSpec 結構...”
- 然後成功：“✔ OpenSpec 結構已建立”
- 顯示微調器：“⠋ 設定 AI 工具...”
- 然後成功：“✔ AI工具已設定”

### 目錄建立

WHEN `openspec init` 被執行
然後建立以下目錄結構：
```
openspec/
├── project.md
├── README.md
├── specs/
└── changes/
    └── archive/
```

### 文件生成

該命令應生成：
- `README.md` 包含 AI 助理的完整 OpenSpec 指令
- `project.md` 帶有專案上下文模板

### AI工具設定

何時交互執行
然後提示使用者選擇要設定的 AI 工具：
- Claude 程式碼（使用 OpenSpec 標記更新/建立 CLAUDE.md）
- 遊標（未來）
- 助手（未來）

### AI工具設定詳情

當選擇 Claude 代碼時
然後建立或更新 `CLAUDE.md` 在專案根目錄中（不在 openspec/ 內）

當 CLAUDE.md 不存在時
然後建立新文件，其中 OpenSpec 內容包含在標記中：
```markdown
<!-- OPENSPEC:START -->
# OpenSpec Project

This document provides instructions for AI coding assistants on how to use OpenSpec conventions for spec-driven development. Follow these rules precisely when working on OpenSpec-enabled projects.

This project uses OpenSpec for spec-driven development. Specifications are the source of truth.

See @openspec/README.md for detailed conventions and guidelines.
<!-- OPENSPEC:END -->
```

當 CLAUDE.md 已經存在時
然後保留所有現有內容
並使用標記在文件開頭插入 OpenSpec 內容
並確保標記如果已經存在則不會重複

標記系統應：
- 使用 `<!-- OPENSPEC:START -->` 標記託管內容的開始
- 使用 `<!-- OPENSPEC:END -->` 標記託管內容的結束
- 允許 OpenSpec 更新其內容而不影響用戶自訂
- 完整保留標記以外的所有內容

為什麼要使用標記：
- 使用者可能想要保留現有的 CLAUDE.md 指令
- OpenSpec可以在未來版本中更新其說明
- OpenSpec 管理的內容和使用者管理的內容之間有清晰的界限

### 互動模式

何時執行
然後提示用戶：“您使用哪種人工智慧工具？”
並顯示帶有可用工具的單選選單：
- Claude代碼
並將已停用的選項顯示為「即將推出」（不可選擇）：
- 遊標（即將推出）
- 助手（即將推出）  
- 繼續（即將推出）

用戶導航：
- 使用箭頭鍵在選項之間移動
- 按 Enter 鍵選擇反白顯示的選項

### 安全檢查

WHEN `openspec/` 目錄已存在
然後用 ora 失敗指示器顯示錯誤：
“✖ 錯誤：OpenSpec 似乎已經初始化。使用‘openspec update’更新結構。”

當檢查初始化可行性時
然後靜默驗證目標目錄中的寫入權限
並且僅在權限不足時顯示錯誤

### 成功輸出

當初始化成功完成時
然後顯示 AI 驅動的工作流程的可操作提示：
```
✔ OpenSpec initialized successfully!

Next steps - Copy these prompts to Claude:

────────────────────────────────────────────────────────────
1. Populate your project context:
   "Please read openspec/project.md and help me fill it out
    with details about my project, tech stack, and conventions"

2. Create your first change proposal:
   "I want to add [YOUR FEATURE HERE]. Please create an
    OpenSpec change proposal for this feature"

3. Learn the OpenSpec workflow:
   "Please explain the OpenSpec workflow from openspec/README.md
    and how I should work with you on this project"
────────────────────────────────────────────────────────────
```

提示應：
- 可複製貼上以便立即與 AI 工具一起使用
- 引導使用者完成人工智慧驅動的工作流程
- 將佔位符文字（[此處的功能]）替換為實際功能

### 退出代碼

- 0：成功
- 1：一般錯誤（包括OpenSpec目錄已存在時）
- 2：權限不足（保留日後使用）
- 3：使用者取消操作（保留以供日後使用）

## 為什麼

手動建立 OpenSpec 結構很容易出錯，並且會造成採用摩擦。標準化的 init 指令可確保：
- 所有項目的結構一致
- 始終包含適當的 AI 指令文件
- 快速加入新項目
- 從一開始就明確約定