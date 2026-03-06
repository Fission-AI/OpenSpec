## 新增要求

### 需求：架構應用區塊

系統應支援 `apply` 模式定義中的區塊控制實施開始的時間和方式。

#### 場景：帶有 apply 區塊的架構

- **何時** 模式定義 `apply` 堵塞
- **那麼**系統使用 `apply.requires` 在確定應用之前必須存在哪些工件
- **和**用途 `apply.tracks` 標識用於進度追蹤的檔案（如果沒有則為 null）
- **和**用途 `apply.instruction` 向代理人提供指導

#### 場景：沒有 apply 區塊的架構

- **何時** 模式沒有 `apply` 堵塞
- **那麼** 在應用程式可用之前，系統要求所有工件都存在
- **AND** 使用預設指令：“所有工件均已完成。繼續實作。”

### 要求：應用指令命令

系統應透過以下方式產生模式感知應用指令 `openspec instructions apply`.

#### 場景：產生應用程式指令

- **何時** 使用者執行 `openspec instructions apply --change <id>`
- **和** 所有必需的工件（每個模式的 `apply.requires`） 存在
- **那麼**系統輸出：
  - 所有現有工件的上下文文件
  - 特定於架構的說明文本
  - Progress tracking file path (if `apply.tracks` 已設定）

#### Scenario: Apply blocked by missing artifacts

- **何時** 使用者執行 `openspec instructions apply --change <id>`
- **並且**缺少所需的工件
- **THEN** 系統指示 apply 被阻止
- **AND** 列出必須先建立的工件

#### 場景：應用指令JSON輸出

- **何時** 使用者執行 `openspec instructions apply --change <id> --json`
- **那麼**系統輸出JSON：
  - `contextFiles`：現有工件的路徑數組
  - `instruction`：應用說明文本
  - `tracks`: 進度檔的路徑或 null
  - `applyRequires`：所需工件 ID 列表

## 修改後的要求

### 要求：狀態命令

系統應顯示變更的工件完成狀態，包括應用準備狀況。

#### 場景：狀態 JSON 包含應用程式要求

- **何時** 使用者執行 `openspec status --change <id> --json`
- **那麼**系統輸出JSON：
  - `changeName`, `schemaName`, `isComplete`, `artifacts` 大批
  - `applyRequires`：應用階段所需的工件 ID 陣列
