# schema-fork-命令規範

## 目的
定義 `openspec schema fork` 使用安全覆蓋控制項將現有模式複製到專案本機模式的行為。

## 要求
### 要求：模式分支複製現有模式
CLI 應提供 `openspec schema fork <source> [name]` 將現有模式複製到專案的命令 `openspec/schemas/` 目錄。

#### 場景：具有明確名稱的分叉
- **何時** 使用者執行 `openspec schema fork spec-driven my-custom`
- **那麼**系統定位 `spec-driven` 使用解析順序的模式（項目→使用者→套件）
- **並且**將所有文件複製到 `openspec/schemas/my-custom/`
- **和**更新 `name` 領域在 `schema.yaml` 到 `my-custom`
- **AND** 顯示具有來源路徑和目標路徑的成功訊息

#### 場景：具有預設名稱的分叉
- **何時** 使用者執行 `openspec schema fork spec-driven` 不指定名稱
- **那麼**系統複製到 `openspec/schemas/spec-driven-custom/`
- **和**更新 `name` 領域在 `schema.yaml` 到 `spec-driven-custom`

#### 場景：找不到來源架構
- **何時** 使用者執行 `openspec schema fork nonexistent`
- **THEN** system displays error that schema was not found
- **AND** lists available schemas
- **AND** 以非零代碼退出

### 需求：架構分叉可防止意外覆蓋
CLI 應要求確認或 `--force` 當目標模式已存在時進行標記。

#### 場景：目的地無需強制即可存在
- **何時** 使用者執行 `openspec schema fork spec-driven my-custom` 和 `openspec/schemas/my-custom/` 存在
- **THEN** 系統顯示錯誤，目的地已存在
- **和**建議使用 `--force` 覆蓋
- **AND** 以非零代碼退出

#### 場景：存在強制標誌的目的地
- **何時** 使用者執行 `openspec schema fork spec-driven my-custom --force` 且目的地存在
- **然後**系統刪除現有的目標目錄
- **AND** 將來源架構複製到目標
- **AND** 顯示成功訊息

#### 場景：互動式確認覆蓋
- **何時** 使用者執行 `openspec schema fork spec-driven my-custom` 處於互動模式且目的地存在
- **THEN**系統提示確認覆蓋
- **和** 根據用戶回應進行收益

### 要求：模式分支保留所有模式文件
CLI 應複製完整的架構目錄，包括範本、設定和任何其他檔案。

#### 場景：副本包含範本文件
- **何時** 使用者使用模板檔案分叉模式（例如， `proposal.md`, `design.md`)
- **然後** 所有範本檔案都會複製到目標位置
- **並且** 範本文件內容不變

#### 場景：複製包含嵌套目錄
- **何時** 使用者分叉具有巢狀目錄的模式（例如， `templates/specs/`)
- **那麼** 巢狀目錄結構被保留
- **並且** 所有巢狀檔案都被複製

### 需求：模式分支輸出 JSON 格式
CLI 應支援 `--json` 機器可讀輸出的標誌。

#### 場景：成功時輸出JSON
- **何時** 使用者執行 `openspec schema fork spec-driven my-custom --json`
- **那麼** 系統輸出 JSON `forked: true`, `source`, `destination`， 和 `sourcePath` 領域

#### 場景：JSON 輸出顯示來源位置
- **何時** 使用者執行 `openspec schema fork spec-driven --json`
- **那麼** JSON 輸出包括 `sourceLocation` 指示「項目」、「使用者」或「包」的字段

