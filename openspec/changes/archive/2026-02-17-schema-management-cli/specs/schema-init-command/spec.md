## 新增要求

### 要求：Schema init 指令建立專案本地架構
CLI 應提供 `openspec schema init <name>` 在下面建立一個新模式目錄的命令 `openspec/schemas/<name>/` 具有有效的 `schema.yaml` 文件和預設模板文件。

#### 場景：建立具有有效名稱的模式
- **何時** 使用者執行 `openspec schema init my-workflow`
- **然後**系統建立目錄 `openspec/schemas/my-workflow/`
- **並且**建立 `schema.yaml` 包含名稱、版本、描述和工件數組
- **AND** 建立工件引用的範本文件
- **AND** 顯示帶有建立路徑的成功訊息

#### 場景：拒絕無效的架構名稱
- **何時** 使用者執行 `openspec schema init "My Workflow"` （包含空格）
- **THEN** 系統顯示無效架構名稱的錯誤
- **AND** 建議使用 kebab-case 格式
- **AND** 以非零代碼退出

#### 場景：架構名稱已存在
- **何時** 使用者執行 `openspec schema init existing-schema` 和 `openspec/schemas/existing-schema/` 已經存在
- **THEN** 系統顯示架構已存在的錯誤
- **和**建議使用 `--force` 覆蓋或 `schema fork` 複製
- **AND** 以非零代碼退出

### 要求：Schema init 支援互動模式
當在沒有顯式標誌的互動式終端機中執行時，CLI 應提示模式設定。

#### 場景：互動式提示描述
- **何時** 使用者執行 `openspec schema init my-workflow` 在互動式終端中
- **THEN** 系統提示輸入模式描述
- **AND** 使用產生的描述中提供的描述 `schema.yaml`

#### 場景：工件選擇的互動式提示
- **何時** 使用者執行 `openspec schema init my-workflow` 在互動式終端中
- **然後** 系統顯示具有常見工件的多選提示（提案、規格、設計、任務）
- **和** 每個選項都包含簡短說明
- **AND** 使用產生的選定工件 `schema.yaml`

#### 場景：帶有標誌的非互動模式
- **何時** 使用者執行 `openspec schema init my-workflow --description "My workflow" --artifacts proposal,tasks`
- **THEN** 系統在不提示的情況下建立模式
- **AND** 使用標誌值進行設定

### 需求：Schema init 支援設定項目預設值
CLI 應提議將新建立的模式設為專案預設值。

#### 場景：交互設定為預設
- **何時** 使用者執行 `openspec schema init my-workflow` 在互動模式下
- **並且**用戶確認設定為預設值
- **然後**系統更新 `openspec/config.yaml` 和 `defaultSchema: my-workflow`

#### 場景：透過標誌設定為預設
- **何時** 使用者執行 `openspec schema init my-workflow --default`
- **然後**系統建立架構並更新 `openspec/config.yaml` 和 `defaultSchema: my-workflow`

#### 場景：跳過設定預設值
- **何時** 使用者執行 `openspec schema init my-workflow --no-default`
- **THEN** 系統建立模式而不修改 `openspec/config.yaml`

### 需求：架構初始化輸出 JSON 格式
CLI 應支援 `--json` 機器可讀輸出的標誌。

#### 場景：成功時輸出JSON
- **何時** 使用者執行 `openspec schema init my-workflow --json --description "Test" --artifacts proposal`
- **那麼** 系統輸出 JSON `created: true`, `path`， 和 `schema` 領域
- **AND** 不顯示互動式提示或旋轉器

#### 場景：JSON 錯誤輸出
- **何時** 使用者執行 `openspec schema init "invalid name" --json`
- **那麼** 系統輸出 JSON `error` 描述問題的字段
- **AND** 以非零代碼退出
