# cli-config 規範

## 目的
提供使用者友善的CLI介面，用於檢視和修改全域OpenSpec設定設置，而無需手動編輯JSON檔案。
## 要求
### 要求：命令結構

config 指令應為所有設定操作提供子命令。

#### 場景：可用子命令

- **何時** 使用者執行 `openspec config --help`
- **THEN** 顯示可用的子命令：
  - `path` - 顯示設定檔位置
  - `list` - 顯示所有目前設定
  - `get <key>` - 取得特定值
  - `set <key> <value>` - 設定一個值
  - `unset <key>` - 刪除金鑰（恢復預設）
  - `reset` - 將設定重設為預設值
  - `edit` - 在編輯器中開啟設定

### 需求：設定路徑

config 指令應顯示設定檔位置。

#### 場景：顯示設定路徑

- **何時** 使用者執行 `openspec config path`
- **然後** 列印設定檔的絕對路徑
- **並且** 以代碼 0 退出

### 需求：設定列表

config 指令應顯示所有目前組態值。

#### 場景：以人類可讀的格式列出設定

- **何時** 使用者執行 `openspec config list`
- **然後** 以類似 YAML 的格式顯示所有設定值
- **AND** 顯示帶有縮排的嵌套對象

#### 場景：將設定列為 JSON

- **何時** 使用者執行 `openspec config list --json`
- **然後** 將完整設定輸出為有效JSON
- **AND** 僅輸出 JSON（無附加文字）

### 需求：設定獲取

The config command SHALL retrieve specific configuration values.

#### 場景：取得頂級密鑰

- **何時** 使用者執行 `openspec config get <key>` 使用有效的頂級金鑰
- **然後** 僅列印原始值（無標籤或格式）
- **並且** 以代碼 0 退出

#### 場景：取得有點符號的嵌套鍵

- **何時** 使用者執行 `openspec config get featureFlags.someFlag`
- **THEN** 使用點表示法遍歷嵌套結構
- **並** 列印該路徑處的值

#### 場景：取得不存在的密鑰

- **何時** 使用者執行 `openspec config get <key>` 使用不存在的密鑰
- **然後** 不列印任何內容（空輸出）
- **並且** 使用代碼 1 退出

#### 場景：取得物件值

- **何時** 使用者執行 `openspec config get <key>` 其中值是一個對象
- **然後** 將物件列印為 JSON

### 需求：設定集

config 指令應使用自動類型強制設定組態值。

#### 場景：設定字串值

- **何時** 使用者執行 `openspec config set <key> <value>`
- **AND** 值與布林值或數字模式不匹配
- **THEN** 將值儲存為字串
- **和** 顯示確認訊息

#### 場景：設定布林值

- **何時** 使用者執行 `openspec config set <key> true` 或者 `openspec config set <key> false`
- **THEN** 將值儲存為布林值（而不是字串）
- **和** 顯示確認訊息

#### 場景：設定數值

- **何時** 使用者執行 `openspec config set <key> <value>`
- **AND** 值是有效數字（整數或浮點數）
- **THEN** 將值儲存為數字（而不是字串）

#### 場景：使用 --string 標誌強製字串

- **何時** 使用者執行 `openspec config set <key> <value> --string`
- **THEN** 將值儲存為字串，無論內容為何
- **AND** 這允許將文字“true”或“123”儲存為字串

#### 場景：設定嵌套鍵

- **何時** 使用者執行 `openspec config set featureFlags.newFlag true`
- **THEN** 如果中間物件不存在則建立它們
- **AND** 在巢狀路徑處設定值

### 要求：設定未設定

config 指令應刪除設定覆蓋。

#### 場景：取消設定現有金鑰

- **何時** 使用者執行 `openspec config unset <key>`
- **且** 金鑰存在於設定中
- **然後** 從設定檔中刪除金鑰
- **並且** 該值恢復為預設值
- **和** 顯示確認訊息

#### 場景：取消設定不存在的金鑰

- **何時** 使用者執行 `openspec config unset <key>`
- **並且** 設定中不存在該金鑰
- **THEN** 顯示訊息指示密鑰未設定
- **並且** 以代碼 0 退出

### 要求：設定重置

config 指令應將組態重設為預設值。

#### 場景：全部重置並確認

- **何時** 使用者執行 `openspec config reset --all`
- **THEN** 在繼續之前提示確認
- **並且** 如果確認，刪除設定檔或重設為預設值
- **和** 顯示確認訊息

#### 場景：使用 -y 標誌重設所有內容

- **何時** 使用者執行 `openspec config reset --all -y`
- **然後** 重置而不提示確認

#### 場景：在沒有 --all 標誌的情況下重置

- **何時** 使用者執行 `openspec config reset` 沒有 `--all`
- **THEN** 顯示錯誤指示 `--all` 是必須的
- **並且** 使用代碼 1 退出

### 需求：設定編輯

設定命令應在使用者編輯器中開啟設定檔。

#### 場景：成功開啟編輯器

- **何時** 使用者執行 `openspec config edit`
- **和** `$EDITOR` 或者 `$VISUAL` 環境變數已設定
- **然後** 在該編輯器中開啟設定檔
- **並且** 如果設定檔不存在，則使用預設值建立它
- **並且**等待編輯器關閉後再返回

#### 場景：未設定編輯器

- **何時** 使用者執行 `openspec config edit`
- **並且**都不是 `$EDITOR` 也不 `$VISUAL` 已設定
- **THEN** 顯示錯誤訊息建議設定 `$EDITOR`
- **並且** 使用代碼 1 退出

### 需求：設定檔設定流程

這 `openspec config profile` 命令應提供操作優先的互動流程，允許使用者獨立修改交付和工作流程設定。

#### 場景：目前的個人資料摘要首先出現

- **何時** 使用者執行 `openspec config profile` 在互動式終端中
- **THEN** 顯示目前狀態標題：
  - 當前交貨值
  - 帶有設定檔標籤的工作流程計數（核心或自訂）

#### 場景：操作優先選單提供可跳過的路徑

- **何時** 使用者執行 `openspec config profile` 互動地
- **那麼** 第一個提示應提供：
  - `Change delivery + workflows`
  - `Change delivery only`
  - `Change workflows only`
  - `Keep current settings (exit)`

#### 場景：發送提示標記目前選擇

- **何時** 交付選擇顯示在 `openspec config profile`
- **那麼**目前設定的交付選項應包括 `[current]` 在其標籤中
- **且** 該值應預設為預先選擇

#### 場景：無操作退出而不儲存或套用提示

- **何時** 使用者選擇 `Keep current settings (exit)` OR 做出不更改有效設定值的選擇
- **那麼**命令將列印 `No config changes.`
- **且** 不得寫入組態更改
- **並且** 不應要求將更新應用於當前項目

#### 場景：當前專案不同步時無操作警告

- **什麼時候** `openspec config profile` 退出時帶有 `No config changes.` 在 OpenSpec 專案內
- **且**專案檔與目前的全域設定檔/交付不同步
- **THEN** 顯示非阻塞警告，表示全域設定尚未套用於此項目
- **並且**包括執行指導 `openspec update` 同步專案文件

#### 場景：應用程式提示取決於實際更改

- **何時** 設定值被更改並儲存
- **並且**當前目錄是一個 OpenSpec 項目
- **然後** 提示 `Apply changes to this project now?`
- **並且** 如果確認，則執行 `openspec update` 對於當前項目

### 需求：密鑰命名約定

設定指令應使用與 JSON 結構相符的駝峰命名法鍵。

#### 場景：鍵匹配 JSON 結構

- **何時**透過 CLI 存取設定金鑰
- **那麼** 使用駝峰命名法來符合實際的 JSON 屬性名稱
- **AND** 支援巢狀存取的點表示法（例如， `featureFlags.someFlag`)

### 要求：架構驗證

config 指令應使用 zod 驗證針對設定模式的設定寫入，同時拒絕未知金鑰 `config set` 除非明確覆蓋。

#### 場景：預設拒絕未知密鑰

- **何時** 使用者執行 `openspec config set someFutureKey 123`
- **THEN** 顯示描述性錯誤訊息，指示金鑰無效
- **並且** 不要修改設定檔
- **並且** 使用代碼 1 退出

#### 場景：接受未知密鑰並覆蓋

- **何時** 使用者執行 `openspec config set someFutureKey 123 --allow-unknown`
- **THEN** 該值已成功儲存
- **並且** 以代碼 0 退出

#### 場景：無效的功能標誌值被拒絕

- **何時** 使用者執行 `openspec config set featureFlags.someFlag notABoolean`
- **然後** 顯示描述性錯誤訊息
- **並且** 不要修改設定檔
- **並且** 使用代碼 1 退出

### 要求：保留範圍標誌

設定命令應保留 `--scope` 未來可擴展性的標誌。

#### 場景：範圍標誌預設為全域

- **何時** 使用者執行任何設定命令而無需 `--scope`
- **THEN** 對全域設定進行操作（預設行為）

#### 場景：專案範圍尚未實施

- **何時** 使用者執行 `openspec config --scope project <subcommand>`
- **然後** 顯示錯誤訊息：“專案本地設定尚未實現”
- **並且** 使用代碼 1 退出
