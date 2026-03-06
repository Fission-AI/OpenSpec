# schema-which-command 規範

## 目的
定義 `openspec schema which` 用於報告已解析架構來源、位置和後備詳細資訊的行為。

## 要求
### 需求：顯示解析結果的架構
CLI 應提供 `openspec schema which <name>` 顯示架構從何處解析的命令。

#### 場景：架構從專案解析
- **何時** 使用者執行 `openspec schema which my-workflow` 且模式存在於 `openspec/schemas/my-workflow/`
- **那麼**系統將來源顯示為“項目”
- **AND** 顯示模式目錄的完整路徑

#### 場景：架構從使用者目錄解析
- **何時** 使用者執行 `openspec schema which my-workflow` 且模式僅存在於使用者資料目錄中
- **那麼**系統將來源顯示為“使用者”
- **AND** 顯示包括 XDG 資料目錄的完整路徑

#### 場景：架構從套件解析
- **何時** 使用者執行 `openspec schema which spec-driven` 且不存在覆蓋
- **那麼**系統將來源顯示為“套件”
- **AND** 顯示包的模式目錄的完整路徑

#### 場景：未找到架構
- **何時** 使用者執行 `openspec schema which nonexistent`
- **THEN** system displays error that schema was not found
- **AND** lists available schemas
- **AND** 以非零代碼退出

### 要求：顯示陰影資訊的架構
CLI 應指示一個模式何時以較低優先權隱藏另一個模式。

#### 場景：專案架構陰影包
- **何時** 使用者執行 `openspec schema which spec-driven` 項目和包都有 `spec-driven`
- **那麼**系統顯示項目模式處於活動狀態
- **AND** 表示它隱藏軟體包版本
- **AND** 顯示陰影包模式的路徑

#### 場景：無陰影
- **何時** 架構只存在於一個位置
- **那麼**系統不顯示陰影訊息

#### 場景：多個陰影
- **何時** 專案模式同時遮蔽使用者和套件模式
- **那麼**系統會依優先順序列出所有陰影位置

### 需求：輸出 JSON 格式的架構
CLI 應支援 `--json` 機器可讀輸出的標誌。

#### 場景：JSON輸出基本
- **何時** 使用者執行 `openspec schema which spec-driven --json`
- **那麼** 系統輸出 JSON `name`, `source`， 和 `path` 領域

#### 場景：JSON 輸出帶有陰影
- **何時** 使用者執行 `openspec schema which spec-driven --json` 且模式有陰影
- **那麼** JSON 包括 `shadows` 數組與 `source` 和 `path` 對於每個陰影模式

### 需求：支援清單模式的Schema
CLI 應支援列出所有模式及其解析來源。

#### 場景：列出所有模式
- **何時** 使用者執行 `openspec schema which --all`
- **然後**系統顯示所有按來源分組的可用模式
- **AND** 表示哪些模式會影響其他模式

#### Scenario: List in JSON format
- **何時** 使用者執行 `openspec schema which --all --json`
- **那麼** 系統輸出 JSON 數組，其中包含每個模式的解析訊息

