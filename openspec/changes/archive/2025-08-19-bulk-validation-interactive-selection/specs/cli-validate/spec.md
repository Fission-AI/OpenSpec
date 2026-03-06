# CLI 驗證指令規範

## 新增要求

### 要求：頂級驗證命令

CLI 應提供頂級 `validate` 用於透過靈活的選擇選項驗證更改和規格的命令。

#### 場景：互動式驗證選擇

- **何時**執行 `openspec validate` 沒有參數
- **然後** 提示使用者選擇要驗證的內容（全部、變更、規格或特定項目）
- **並且** 根據選擇執行驗證
- **和** 以適當的格式顯示結果

#### 場景：非互動環境不提示

- **給定** stdin 不是 TTY 或 `--no-interactive` 提供或環境變數 `OPEN_SPEC_INTERACTIVE=0`
- **何時**執行 `openspec validate` 沒有參數
- **THEN** 不交互提示
- **並且** 列印一個有用的提示，列出可用的命令/標誌並使用代碼 1 退出

#### 場景：直接專案驗證

- **何時**執行 `openspec validate <item-name>`
- **然後** 自動偵測項目是否為變更或規格
- **並且** 驗證指定的項目
- **AND** 顯示驗證結果

### 要求：批量和過濾驗證

驗證命令應支援批次驗證（--all）和按類型過濾驗證（--changes、--specs）的標誌。

#### 場景：驗證一切

- **何時**執行 `openspec validate --all`
- **然後** 驗證 openspec/changes/ 中的所有變更（不包括存檔）
- **並** 驗證 openspec/specs/ 中的所有規格
- **並** 顯示顯示通過/失敗項目的摘要
- **並且** 如果任何驗證失敗，則以代碼 1 退出

#### 場景：批量驗證的範圍

- **何時** 驗證 `--all` 或者 `--changes`
- **然後** 包括以下所有變更提案 `openspec/changes/`
- **並且**排除 `openspec/changes/archive/` 目錄

- **何時** 驗證 `--specs`
- **那麼** 包含所有具有 `spec.md` 在下面 `openspec/specs/<id>/spec.md`

#### 場景：驗證所有更改

- **何時**執行 `openspec validate --changes`
- **然後** 驗證 openspec/changes/ 中的所有變更（不包括存檔）
- **AND** 顯示每次變更的結果
- **和** 顯示總計統計資料

#### 場景：驗證所有規格

- **何時**執行 `openspec validate --specs`
- **然後** 驗證 openspec/specs/ 中的所有規格
- **和** 顯示每個規格的結果
- **和** 顯示總計統計資料

### 要求：驗證選項和進度指示

驗證命令應支援標準驗證選項（--strict、--json）並在批次操作期間顯示進度。

#### 場景：嚴格驗證

- **何時**執行 `openspec validate --all --strict`
- **然後** 對所有項目進行嚴格驗證
- **並且** 將警告視為錯誤
- **並且** 如果任何項目有警告或錯誤則失敗

#### 場景：JSON輸出

- **何時**執行 `openspec validate --all --json`
- **THEN** 將驗證結果輸出為 JSON
- **並且**包括每個項目的詳細問題
- **並且**包括匯總統計資料

#### 場景：JSON 用於批次驗證的輸出架構

- **何時**執行 `openspec validate --all --json` （或者 `--changes` / `--specs`)
- **然後** 輸出具有以下形狀的 JSON 物件：
  - `items`：帶有欄位的物件數組 `{ id: string, type: "change"|"spec", valid: boolean, issues: Issue[], durationMs: number }`
  - `summary`： 目的 `{ totals: { items: number, passed: number, failed: number }, byType: { change?: { items: number, passed: number, failed: number }, spec?: { items: number, passed: number, failed: number } } }`
  - `version`：模式的字串標識符（例如， `"1.0"`)
- **並且** 使用代碼 1 退出（如果有） `items[].valid === false`

在哪裡 `Issue` 遵循現有的每項驗證報告形狀 `{ level: "ERROR"|"WARNING"|"INFO", path: string, message: string }`.

#### 場景：顯示驗證進度

- **何時** 驗證多個項目（--all、--changes 或 --specs）
- **然後** 顯示進度指示器或狀態更新
- **AND** 表示目前正在驗證哪個項目
- **和** 顯示通過/失敗項目的執行計數

#### 場景：效能並發限制

- **何時** 驗證多個項目
- **然後** 以有限並發執行驗證（例如，並行 4-8 個）
- **並** 確保進度指標保持回應

### 要求：項目類型檢測和歧義處理

驗證命令應處理不明確的名稱和明確類型覆蓋，以確保清晰、確定的行為。

#### 場景：透過自動類型檢測進行直接項目驗證

- **何時**執行 `openspec validate <item-name>`
- **那麼**如果 `<item-name>` 唯一匹配更改或規範，驗證該項目

#### 場景：變更名稱和規範名稱之間不明確

- **給出** `<item-name>` 既作為變更又作為規範存在
- **何時**執行 `openspec validate <item-name>`
- **然後** 列印一個歧義錯誤來解釋這兩個匹配
- **並且**建議透過 `--type change` 或者 `--type spec`，或使用 `openspec change validate` / `openspec spec validate`
- **並且** 使用代碼 1 退出而不執行驗證

#### 場景：未知項目名稱

- **何時** `<item-name>` 既不符合變更也不符合規範
- **THEN** 列印未找到的錯誤
- **並且** 顯示最近匹配的建議（如果有）
- **並且** 使用代碼 1 退出

#### 場景：明確類型覆蓋

- **何時**執行 `openspec validate --type change <item>`
- **然後**治療 `<item>` 作為更改 ID 並驗證它（跳過自動檢測）

- **何時**執行 `openspec validate --type spec <item>`
- **然後**治療 `<item>` 作為規範 ID 並驗證它（跳過自動檢測）

### 要求：互動控制

- CLI 應尊重 `--no-interactive` 禁用提示。
- CLI 應尊重 `OPEN_SPEC_INTERACTIVE=0` 全域禁用提示。
- 僅當 stdin 是 TTY 且未停用互動性時才應顯示互動提示。

#### 場景：透過標誌或環境停用提示

- **什麼時候** `openspec validate` 執行的是 `--no-interactive` 或與環境 `OPEN_SPEC_INTERACTIVE=0`
- **那麼** CLI 不應顯示互動式提示
- **並且** 應根據需要列印非互動式提示或選擇的輸出