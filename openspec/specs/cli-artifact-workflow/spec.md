# cli-artifact-workflow 規範

## 目的
定義工件工作流程 CLI 行為 (`status`, `instructions`, `templates`和設定流程）用於鷹架和主動變更。

## 要求
### 要求：狀態命令

系統應顯示變更的工件完成狀態，包括鷹架（空）變更。

> **修復錯誤**：以前需要 `proposal.md` 透過存在 `getActiveChangeIds()`.

#### 場景：顯示所有狀態的狀態

- **何時** 使用者執行 `openspec status --change <id>`
- **然後** 系統會顯示每個工件以及狀態指示燈：
  - `[x]` 對於已完成的工件
  - `[ ]` 對於準備好的工件
  - `[-]` 對於被阻止的工件（列出了缺少的依賴項）

#### 場景：狀態顯示完成摘要

- **何時** 使用者執行 `openspec status --change <id>`
- **那麼** 輸出包含完成百分比和計數（例如，「2/4 工件完成」）

#### 場景：狀態JSON輸出

- **何時** 使用者執行 `openspec status --change <id> --json`
- **那麼** 系統輸出 JSON，其中包含changeName、schemaName、isComplete 和artifacts 陣列

#### 場景：狀態 JSON 包含應用程式要求

- **何時** 使用者執行 `openspec status --change <id> --json`
- **那麼**系統輸出JSON：
  - `changeName`, `schemaName`, `isComplete`, `artifacts` 大批
  - `applyRequires`：應用階段所需的工件 ID 陣列

#### 場景：腳手架變更狀態

- **何時** 使用者執行 `openspec status --change <id>` 在沒有工件的情況下進行更改
- **然後** 系統顯示所有工件及其狀態
- **和** 根工件（無依賴項）顯示為就緒 `[ ]`
- **和** 依賴工件顯示為被阻止 `[-]`

#### 場景：缺少更改參數

- **何時** 使用者執行 `openspec status` 沒有 `--change`
- **然後** 系統顯示錯誤以及可用更改列表
- **AND** 包含支架式變更（沒有proposal.md 的目錄）

#### 場景：未知變化

- **何時** 使用者執行 `openspec status --change unknown-id`
- **和**目錄 `openspec/changes/unknown-id/` 不存在
- **然後** 系統顯示一個錯誤，列出所有可用的更改目錄

### 要求：下一個神器發現

工作流程應使用 `openspec status` 輸出來決定接下來可以建立什麼，而不是單獨的下一個命令表面。

#### 場景：從狀態輸出發現下一個工件

- **何時** 使用者需要知道接下來要建立哪個工件
- **然後** `openspec status --change <id>` 識別準備好的工件 `[ ]`
- **並且** 不需要專用的「下一個指令」來繼續工作流程

### 要求：指令命令

系統應輸出用於建立工件的豐富指令，包括腳手架的變更。

#### 場景：顯示豐富的指令

- **何時** 使用者執行 `openspec instructions <artifact> --change <id>`
- **那麼**系統輸出：
  - 工件元資料（ID、輸出路徑、描述）
  - 模板內容
  - 依賴狀態（完成/缺失）
  - 解鎖的工件（完成後可用的東西）

#### 場景：指令JSON輸出

- **何時** 使用者執行 `openspec instructions <artifact> --change <id> --json`
- **那麼**系統輸出JSON符合ArtifactInstructions接口

#### 場景：未知神器

- **何時** 使用者執行 `openspec instructions unknown-artifact --change <id>`
- **然後** 系統顯示一錯誤，列出模式的有效工件 ID

#### 場景：具有未滿足的依賴關係的工件

- **何時** 使用者請求有關被封鎖工件的說明
- **然後** 系統顯示說明，並警告缺少依賴項

#### 場景：鷹架變更說明

- **何時** 使用者執行 `openspec instructions proposal --change <id>` 鷹架上的改變
- **然後** 系統輸出用於建立提案的範本和元資料
- **且** 不需要任何工件已經存在

### 要求：模板命令
系統應顯示模式中所有工件的已解析範本路徑。

#### 場景：列出具有預設架構的模板路徑
- **何時** 使用者執行 `openspec templates`
- **然後** 系統使用預設架構顯示每個工件及其解析的模板路徑

#### 場景：列出具有自訂架構的範本路徑
- **何時** 使用者執行 `openspec templates --schema tdd`
- **然後** 系統顯示指定模式的範本路徑

#### 場景：模板JSON輸出
- **何時** 使用者執行 `openspec templates --json`
- **然後** 系統輸出 JSON 將工件 ID 對應到範本路徑

#### 場景：模板解析來源
- **WHEN** displaying template paths
- **那麼** 系統指示每個模板是來自使用者覆蓋還是包內置

### 要求：新的更改命令
系統應建立新的更改目錄並進行驗證。

#### 場景：建立有效的變更
- **何時** 使用者執行 `openspec new change add-feature`
- **然後**系統建立 `openspec/changes/add-feature/` 目錄

#### 場景：更改名稱無效
- **何時** 使用者執行 `openspec new change "Add Feature"` 名稱無效
- **然後** 系統顯示驗證錯誤並提供指導

#### 場景：重複更改名稱
- **何時** 使用者執行 `openspec new change existing-change` 對於現有的更改
- **然後** 系統顯示錯誤，表示更改已存在

#### 場景：根據描述建立
- **何時** 使用者執行 `openspec new change add-feature --description "Add new feature"`
- **然後** 系統建立更改目錄，其描述在 README.md 中

### 要求：架構選擇
系統應支援工作流程指令的自訂模式選擇。

#### 場景：預設模式
- **何時** 使用者執行工作流程指令，無需 `--schema`
- **那麼**系統使用「規範驅動」模式

#### 場景：自訂架構
- **何時** 使用者執行 `openspec status --change <id> --schema tdd`
- **那麼**系統使用工件圖的指定模式

#### 場景：未知架構
- **何時** 使用者指定未知架構
- **然後** 系統顯示錯誤，列出可用的模式

### 要求：輸出格式
系統應提供一致的輸出格式。

#### 場景：彩色輸出
- **何時** 終端支援顏色
- **那麼** 狀態指示燈使用顏色：綠色（完成）、黃色（就緒）、紅色（阻止）

#### 場景：無顏色輸出
- **什麼時候** `--no-color` 使用標誌或設定 NO_COLOR 環境變量
- **THEN** 輸出使用不含 ANSI 顏色的純文字指示器

#### 場景：進度指示
- **何時** 載入更改狀態需要時間
- **然後** 系統在加載期間顯示旋轉圖標

### 要求：實驗隔離
系統應單獨執行工件工作流程指令，以便於刪除。

#### 場景：單一文件實現
- **何時** 實施工件工作流程功能
- **那麼** 所有指令都在 `src/commands/artifact-workflow.ts`

#### 場景：幫助文字標記
- **何時** 使用者執行 `--help` 在任何工件工作流程指令上
- **THEN** 幫助文字指示該指令是實驗性的

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

### 要求：工具選擇標誌

這 `artifact-experimental-setup` 命令應接受 `--tool <tool-id>` 用於指定目標 AI 工具的標誌。

#### 場景：透過flag指定工具

- **何時** 使用者執行 `openspec artifact-experimental-setup --tool cursor`
- **那麼**技能文件生成於 `.cursor/skills/`
- **AND** 指令檔是使用 Cursor 的 frontmatter 格式產生的

#### 場景：缺少工具標誌

- **何時** 使用者執行 `openspec artifact-experimental-setup` 沒有 `--tool`
- **然後** 系統顯示錯誤，要求 `--tool` 旗幟
- **AND** 在錯誤訊息中列出有效的工具 ID

#### 場景：未知工具 ID

- **何時** 使用者執行 `openspec artifact-experimental-setup --tool unknown-tool`
- **並且** 工具 ID 不在 `AI_TOOLS`
- **然後** 系統顯示錯誤，列出有效的工具 ID

#### 場景：沒有技能目錄的工具

- **何時** 使用者指定的工具沒有 `skillsDir` 設定好的
- **然後** 系統顯示錯誤，指示工具不支援技能生成

#### 場景：沒有命令適配器的工具

- **何時** 使用者指定具有以下功能的工具： `skillsDir` 但沒有註冊命令適配器
- **那麼**技能文件產生成功
- **AND** 命令產生被跳過並顯示資訊性訊息

### 需求：輸出訊息

設定命令應顯示有關生成內容的清晰輸出。

#### 場景：在輸出中顯示目標工具

- **何時** 設定命令成功執行
- **THEN** 輸出包含目標工具名稱（例如，「設定遊標...」）

#### 場景：顯示生成的路徑

- **何時** 設定指令完成
- **THEN** 輸出列出所有產生的技能檔案路徑
- **AND** 列出所有產生的命令檔案路徑（如果適用）

#### 場景：顯示跳過的命令訊息

- **WHEN** 由於缺少適配器而跳過命令生成
- **THEN** 輸出包括訊息：「命令產生已跳過 - 沒有適配器 <tool>"
