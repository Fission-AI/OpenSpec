# 模式解析規範

## 目的
定義專案本地模式解析行為，包括優先順序（專案本地，然後使用者覆蓋，然後內建套件）和向後相容的回退 `projectRoot` 未提供。

## 要求
### 需求：專案本地模式解析

系統應從專案本地目錄（`./openspec/schemas/<name>/`）具有最高優先級，當 `projectRoot` 提供。

#### 場景：專案本地架構優先於使用者覆蓋
- **何時** 名為「my-workflow」的模式存在於 `./openspec/schemas/my-workflow/schema.yaml`
- **並且** 名為「my-workflow」的模式存在於 `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **和** `getSchemaDir("my-workflow", projectRoot)` 被稱為
- **那麼**系統應返回專案本地路徑

#### 場景：專案本地架構優先於套件內建架構
- **何時** 名為「規範驅動」的模式存在於 `./openspec/schemas/spec-driven/schema.yaml`
- **和**“規範驅動”是包內建模式
- **和** `getSchemaDir("spec-driven", projectRoot)` 被稱為
- **那麼**系統應返回專案本地路徑

#### 場景：當沒有專案本地架構時，回退到使用者覆蓋
- **何時** 不存在名為「my-workflow」的模式 `./openspec/schemas/my-workflow/`
- **並且** 名為「my-workflow」的模式存在於 `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **和** `getSchemaDir("my-workflow", projectRoot)` 被稱為
- **那麼**系統應返回使用者覆蓋路徑

#### 場景：當沒有專案本地或使用者架構時，回退到內建套件
- **何時** 不存在名為「規範驅動」的模式 `./openspec/schemas/spec-driven/`
- **且** 不存在名為「規範驅動」的模式 `~/.local/share/openspec/schemas/spec-driven/`
- **和**“規範驅動”是包內建模式
- **和** `getSchemaDir("spec-driven", projectRoot)` 被稱為
- **那麼**系統應該會回傳包的內建路徑

#### 場景：未提供projectRoot時向後相容
- **什麼時候** `getSchemaDir("my-workflow")` 被調用時沒有 `projectRoot` 範圍
- **那麼**系統應該只檢查使用者覆蓋和包內建位置
- **且**系統不應檢查項目本地位置

### 要求：專案模式目錄助手

系統應提供 `getProjectSchemasDir(projectRoot)` 傳回專案本機模式目錄路徑的函數。

#### 場景：返回正確的路徑
- **什麼時候** `getProjectSchemasDir("/path/to/project")` 被稱為
- **那麼**系統將會傳回 `/path/to/project/openspec/schemas`

### 需求：清單模式包括項目本地

當列出可用模式時，系統應包括項目本地模式，如果 `projectRoot` 提供。

#### 場景：專案本地架構出現在清單中
- **何時** 名為「team-flow」的模式存在於 `./openspec/schemas/team-flow/schema.yaml`
- **和** `listSchemas(projectRoot)` 被稱為
- **那麼** 傳回的清單應包含“team-flow”

#### 場景：專案本地架構隱藏清單中的同名使用者架構
- **何時** 專案本地和使用者覆蓋位置均存在名為「custom」的架構
- **和** `listSchemas(projectRoot)` 被稱為
- **那麼** 傳回的清單應包含「custom」一次

#### 場景：listSchemas 的向後相容性
- **什麼時候** `listSchemas()` 被調用時沒有 `projectRoot` 範圍
- **那麼**系統應僅包含使用者覆蓋和包內建模式

### 要求：架構資訊包括專案來源

系統應指示 `source: 'project'` 對於專案本地模式 `listSchemasWithInfo()` results.

#### 場景：專案本地架構顯示專案來源
- **何時** 名為「team-flow」的模式存在於 `./openspec/schemas/team-flow/schema.yaml`
- **和** `listSchemasWithInfo(projectRoot)` 被稱為
- **那麼**「團隊流程」的架構資訊應具有 `source: 'project'`

#### 場景：使用者覆蓋架構顯示使用者來源
- **何時** 名為「my-custom」的模式僅存在於 `~/.local/share/openspec/schemas/my-custom/`
- **和** `listSchemasWithInfo(projectRoot)` 被稱為
- **那麼**「my-custom」的模式資訊應該有 `source: 'user'`

#### 場景：包內建架構顯示包源
- **何時** “規範驅動”僅以內建套件存在
- **和** `listSchemasWithInfo(projectRoot)` 被稱為
- **那麼**「規範驅動」的架構資訊應有 `source: 'package'`

### 要求：模式命令顯示原始程式碼

這 `openspec schemas` 命令應顯示每個模式的來源。

#### 場景：顯示格式包含來源
- **何時** 使用者執行 `openspec schemas`
- **那麼** 輸出應顯示每個模式及其來源標籤（項目、使用者或套件）

### 要求：使用設定架構作為新更改的預設值

系統應使用來自的模式字段 `openspec/config.yaml` 在沒有明確建立新變更時作為預設值 `--schema` flag.

#### 場景：在沒有 --schema 標誌且設定存在的情況下建立更改
- **何時** 使用者執行 `openspec new change foo` 並且設定包含 `schema: "tdd"`
- **然後** 系統使用模式「tdd」建立更改

#### 場景：建立不帶 --schema 標誌且無設定的更改
- **何時** 使用者執行 `openspec new change foo` 並且不存在設定檔
- **然後** 系統使用預設模式「規範驅動」建立更改

#### 場景：使用明確 --schema 標誌建立更改
- **何時** 使用者執行 `openspec new change foo --schema custom` 並且設定包含 `schema: "tdd"`
- **然後**系統使用架構「自訂」建立變更（CLI 標誌覆蓋設定）

### 需求：使用更新的優先順序解析架構

系統應使用以下優先順序解析變更的架構：CLI 標誌、變更元資料、專案設定、硬編碼預設值。

#### 場景：提供了 CLI 標誌
- **何時** 使用者執行命令 `--schema custom`
- **那麼**系統使用“自訂”，無論更改元資料或設定如何

#### 場景：更改元資料指定架構
- **何時**發生變化 `.openspec.yaml` 和 `schema: bound` 並且設定有 `schema: tdd`
- **那麼**系統使用更改元資料中的“綁定”

#### 場景：只有專案設定指定 schema
- **何時** 沒有 CLI 標誌或更改元資料，但設定有 `schema: tdd`
- **那麼**系統使用專案設定中的“tdd”

#### 場景：沒有在任何地方指定模式
- **何時** 無 CLI 標誌、變更元資料或項目設定
- **那麼**系統使用硬編碼的預設“規範驅動”

### 要求：在設定中支援專案本地模式名稱

系統應允許設定模式欄位引用中定義的項目本機模式 `openspec/schemas/`.

#### 場景：設定引用專案本地架構
- **何時** 設定包含 `schema: "my-workflow"` 和 `openspec/schemas/my-workflow/` 存在
- **然後** 系統解析為專案本地架構

#### 場景：設定引用不存在的架構
- **何時** 設定包含 `schema: "nonexistent"` 且該模式不存在
- **那麼** 嘗試使用模糊匹配建議和所有有效架構清單加載架構​​時系統顯示錯誤

### 要求：為無效架構提供有用的錯誤訊息

系統應顯示模式錯誤以及模糊匹配建議、可用模式清單和修復說明。

#### 場景：模式名稱有拼字錯誤（緊密匹配）
- **何時** 設定包含 `schema: "spce-driven"` （錯字）
- **那麼** 錯誤訊息包括「您的意思是：規範驅動（內建）」作為建議

#### 場景：架構名稱沒有緊密匹配
- **何時** 設定包含 `schema: "completely-wrong"`
- **THEN** 錯誤訊息顯示所有可用內建和專案本地架構的列表

#### 場景：錯誤訊息包含修復說明
- **何時** 設定引用無效架構
- **那麼** 錯誤訊息包括“修復：編輯 openspec/config.yaml 並將‘schema: X’更改為有效的架構名稱”

#### 場景：區分內建模式與專案本地模式時發生錯誤
- **何時** 錯誤列出可用架構
- **那麼** 輸出清楚地將每個標籤標記為“內建”或“專案本地”

### 要求：保持現有變更的向後相容性

系統應繼續使用沒有項目設定的現有變更。

#### 場景：沒有設定的現有更改
- **何時** 更改是在設定功能之前建立的並且不存在設定檔
- **然後**系統使用現有邏輯解析架構（更改元資料或硬編碼預設值）

#### 場景：現有更改，稍後新增設定
- **何時** 將設定檔新增至具有現有變更的專案中
- **那麼** 現有變更繼續使用其綁定架構 `.openspec.yaml`
