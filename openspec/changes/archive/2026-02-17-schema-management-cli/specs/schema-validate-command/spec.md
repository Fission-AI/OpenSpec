## 新增要求

### 要求：模式驗證檢查模式結構
CLI 應提供 `openspec schema validate [name]` 驗證架構設定並報告錯誤的命令。

#### 場景：驗證特定架構
- **何時** 使用者執行 `openspec schema validate my-workflow`
- **那麼** 系統使用解析順序定位模式
- **和** 驗證 `schema.yaml` 針對架構 Zod 類型
- **AND** 顯示驗證結果（有效或錯誤清單）

#### 場景：驗證所有專案架構
- **何時** 使用者執行 `openspec schema validate` 沒有名字
- **然後** 系統驗證所有模式 `openspec/schemas/`
- **AND** 顯示每個模式的結果
- 如果任何模式無效，**AND** 則以非零代碼退出

#### 場景：未找到架構
- **何時** 使用者執行 `openspec schema validate nonexistent`
- **THEN** system displays error that schema was not found
- **AND** 以非零代碼退出

### Requirement: Schema validate checks YAML syntax
如果可能，CLI 應報告 YAML 解析錯誤和行號。

#### 場景：無效的 YAML 語法
- **何時** 使用者執行 `openspec schema validate my-workflow` 和 `schema.yaml` 有語法錯誤
- **然後** 系統顯示 YAML 解析錯誤以及行號
- **AND** 以非零代碼退出

#### 場景：有效 YAML 但缺少必填字段
- **什麼時候** `schema.yaml` 有效 YAML 但缺失 `name` 場地
- **然後** 系統因缺少必填欄位而顯示 Zod 驗證錯誤
- **AND** 標識特定的缺失字段

### 要求：模式驗證檢查模板是否存在
CLI 應驗證工件引用的所有範本檔案是否存在。

#### 場景：缺少模板文件
- **何時** 工件參考 `template: proposal.md` 但模式目錄中不存在該文件
- **然後** 系統報告錯誤：“未找到工件‘proposal’的模板檔案‘proposal.md’”
- **AND** 以非零代碼退出

#### 場景：所有模板都存在
- **何時** 所有工件範本都存在
- **那麼**系統報告範本有效
- **且** 範本存在包含在驗證摘要中

### 需求：架構驗證檢查依賴關係圖
CLI 應驗證工件依賴關係形成有效的有向無環圖。

#### 場景：有效的依賴圖
- **何時** 工件依賴項形成有效的 DAG（例如，任務 → 規範 → 提案）
- **那麼**系統報告依賴關係圖有效

#### 場景：偵測到循環依賴
- **何時** 工件 A 需要 B 且工件 B 需要 A
- **那麼**系統報告循環依賴錯誤
- **AND** 識別循環中涉及的工件
- **AND** 以非零代碼退出

#### 場景：未知的依賴引用
- **何時** 工件需要 `nonexistent-artifact`
- **然後** 系統報告錯誤：“工件‘x’需要未知工件‘不存在的工件’”
- **AND** 以非零代碼退出

### 需求：架構驗證輸出 JSON 格式
CLI 應支援 `--json` 機器可讀驗證結果的標誌。

#### 場景：有效架構的 JSON 輸出
- **何時** 使用者執行 `openspec schema validate my-workflow --json` 且架構有效
- **那麼** 系統輸出 JSON `valid: true`, `name`， 和 `path` 領域

#### 場景：JSON 輸出無效架構
- **何時** 使用者執行 `openspec schema validate my-workflow --json` 且架構有錯誤
- **那麼** 系統輸出 JSON `valid: false` 和 `issues` 大批
- **並且** 每期都包括 `level`, `path`， 和 `message` 領域
- **AND** 格式與現有的匹配 `openspec validate` 輸出結構

### 要求：架構驗證支援詳細模式
CLI 應支援 `--verbose` 詳細驗證資訊的標誌。

#### 場景：詳細輸出顯示所有檢查
- **何時** 使用者執行 `openspec schema validate my-workflow --verbose`
- **然後** 系統在執行時顯示每個驗證檢查
- **AND** 顯示以下內容的通過/失敗狀態：YAML 解析、Zod 驗證、範本存在、依賴關係圖
