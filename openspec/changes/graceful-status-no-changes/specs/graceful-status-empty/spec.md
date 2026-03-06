## 新增要求

### 要求：當不存在任何變更時，狀態命令正常退出
這 `statusCommand` 函數應透過以下方式檢查可用的更改 `getAvailableChanges` 打電話之前 `validateChangeExists`。當沒有 `--change` 提供了選項並且不存在更改目錄，它應列印一條友好的信息訊息並以代碼 0 退出，而不是到達 `validateChangeExists` 並傳播致命錯誤。

#### 場景：不存在任何變化，文字模式
- **何時** 使用者執行 `openspec status` 沒有 `--change` 且下面不存在更改目錄 `openspec/changes/`
- **然後** CLI 列印 `No active changes. Create one with: openspec new change <name>` 到 stdout 並以代碼 0 退出

#### 場景：不存在任何更改，JSON 模式
- **何時** 使用者執行 `openspec status --json` 沒有 `--change` 並且不存在更改目錄
- **那麼** CLI 輸出 `{"changes":[],"message":"No active changes."}` 作為標準輸出有效的 JSON 並以代碼 0 退出

### 要求：保留現有狀態驗證行為
其他錯誤路徑在 `validateChangeExists` 適用於狀態命令的應繼續像以前一樣拋出錯誤。除以下命令外的命令 `status` 那個使用 `validateChangeExists` 不應受到影響。

#### 場景：存在更改但未指定 --change
- **何時** 使用者執行 `openspec status` 沒有 `--change` 並且存在一個或多個更改目錄
- **那麼** CLI 會拋出錯誤，列出可用的變更以及訊息 `Missing required option --change. Available changes: ...`

#### 場景：指定的變更不存在
- **何時** 使用者執行 `openspec status --change non-existent`
- **然後** CLI 拋出錯誤並顯示訊息 `Change 'non-existent' not found`

#### 場景：其他命令不受影響
- **何時** 使用者執行 `openspec show` 或者 `openspec instructions` 沒有 `--change` 且不存在任何變化
- **然後** CLI 拋出原始的 `No changes found` 錯誤（沒有行為改變）
