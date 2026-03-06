## 新增要求

### 需求：更改元資料

系統應儲存並驗證每次變更的元資料 `.openspec.yaml` 使用 Zod 模式的檔案。

#### 場景：使用新變更建立的元資料文件

- **何時** 使用者執行 `openspec new change add-feature --schema tdd`
- **然後**系統建立 `.openspec.yaml` 在更改目錄中
- **並且**該文件包含 `schema: tdd` 和 `created: <YYYY-MM-DD>`

#### 場景：讀取時驗證元資料

- **何時**系統讀取 `.openspec.yaml`
- **和** `schema` 字段引用未知架構
- **然後** 系統顯示驗證錯誤，列出可用模式

#### 場景：元資料架構驗證

- **什麼時候** `.openspec.yaml` 包含無效的 YAML 或缺少必填字段
- **然後** 系統顯示 Zod 驗證錯誤及其詳細信息

#### 場景：缺少元資料文件

- **何時**更改目錄沒有 `.openspec.yaml` 文件
- **然後** 系統回退到預設模式（`spec-driven`)

## 修改後的要求

### 要求：新的更改命令

系統應使用驗證和可選模式元資料建立新的變更目錄。

#### 場景：建立有效的變更

- **何時** 使用者執行 `openspec new change add-feature`
- **然後**系統建立 `openspec/changes/add-feature/` 目錄
- **並且**建立 `.openspec.yaml` 和 `schema: spec-driven` (預設)

#### 場景：使用架構建立更改

- **何時** 使用者執行 `openspec new change add-feature --schema tdd`
- **然後**系統建立 `openspec/changes/add-feature/` 目錄
- **並且**建立 `.openspec.yaml` 和 `schema: tdd`

#### 場景：建立時架構無效

- **何時** 使用者執行 `openspec new change add-feature --schema unknown`
- **然後** 系統顯示錯誤，列出可用的模式
- **AND** 不會建立更改目錄

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

系統應支援工作流程指令的自訂模式選擇，並自動偵測變更元資料。

#### 場景：從元資料自動偵測架構

- **何時** 使用者執行 `openspec status --change <id>` 沒有 `--schema`
- **並且**更改已 `.openspec.yaml` 和 `schema: tdd`
- **那麼**系統使用 `tdd` 圖式

#### 場景：明確架構覆蓋元資料

- **何時** 使用者執行 `openspec status --change <id> --schema spec-driven`
- **並且**更改已 `.openspec.yaml` 和 `schema: tdd`
- **那麼**系統使用 `spec-driven` （顯式標誌獲勝）

#### 場景：預設架構回退

- **何時** 使用者執行工作流程指令，無需 `--schema`
- **並且**更改沒有 `.openspec.yaml` 文件
- **那麼**系統使用「規範驅動」模式

#### 場景：透過標誌自訂模式

- **何時** 使用者執行 `openspec status --change <id> --schema tdd`
- **那麼**系統使用工件圖的指定模式

#### 場景：未知架構

- **何時** 使用者指定未知架構
- **然後** 系統顯示錯誤，列出可用的模式
