## 新增要求

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
