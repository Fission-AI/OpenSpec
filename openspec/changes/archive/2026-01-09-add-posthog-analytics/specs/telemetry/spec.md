## 新增要求

### Requirement: Command execution tracking
系統應發送一個 `command_executed` 當任何 CLI 命令執行時，向 PostHog 發送事件，僅包括命令名稱和 OpenSpec 版本作為屬性。

#### 場景：標準命令執行
- **何時** 使用者執行任何 openspec 指令
- **然後**系統發送一個 `command_executed` 事件與 `command` 和 `version` 特性

#### 場景：子命令執行
- **何時** 使用者執行巢狀命令，例如 `openspec change apply`
- **然後**系統發送一個 `command_executed` 具有完整命令路徑的事件（例如， `change:apply`)

### 要求：保護隱私的活動設計
系統不得在遙測事件中包含指令參數、檔案路徑、項目名稱、規格內容、錯誤訊息或 IP 位址。

#### 場景：帶參數的命令
- **何時** 使用者執行 `openspec init my-project --force`
- **那麼** 遙測事件僅包含 `command: "init"` 和 `version: "<version>"` 沒有參數

#### 場景：IP位址排除
- **何時** 系統發送遙測事件
- **那麼** 事件明確設定 `$ip: null` 防止IP追蹤

### 要求：環境變數選擇退出
系統應在以下情況下停用遙測： `OPENSPEC_TELEMETRY=0` 或者 `DO_NOT_TRACK=1` 環境變數已設定。

#### 場景：OPENSPEC_TELEMETRY 選擇退出
- **什麼時候** `OPENSPEC_TELEMETRY=0` 是在環境中設定的
- **那麼** 系統不發送遙測事件

#### 場景：DO_NOT_TRACK 選擇退出
- **什麼時候** `DO_NOT_TRACK=1` 是在環境中設定的
- **那麼** 系統不發送遙測事件

#### 場景：環境變數優先
- **何時** 用戶之前使用過 CLI（設定存在）
- **和** 用戶設定 `OPENSPEC_TELEMETRY=0`
- **那麼** 無論設定狀態如何，遙測都會被停用

### 要求：CI環境自動停用
系統應在以下情況下自動停用遙測： `CI=true` 偵測到環境變數。

#### 場景：CI環境偵測
- **什麼時候** `CI=true` 是在環境中設定的
- **那麼** 系統不發送遙測事件

#### 場景：CI 明確啟用
- **什麼時候** `CI=true` 已設定
- **和** `OPENSPEC_TELEMETRY=1` 被明確設定
- **那麼** 遙測仍然處於停用狀態（CI 優先考慮隱私）

### 要求：首次執行遙測通知
在發送任何遙測資料之前，系統應在第一次執行指令時顯示單行遙測揭露通知。

#### 場景：第一次執行指令
- **何時** 使用者執行第一個 openspec 指令
- **並且** 遙測已啟用
- **然後** 系統顯示：“注意：OpenSpec 收集匿名使用統計資料。選擇退出：OPENSPEC_TELEMETRY=0”

#### 場景：後續命令執行
- **何時** 用戶已經看到通知（noticeSeen：設定中為 true）
- **那麼**系統不顯示通知

#### 場景：遙測前通知
- **何時** 顯示首次執行通知
- **那麼** 通知會在發送任何遙測事件之前出現

### 要求：匿名用戶識別
系統應在第一次遙測發送時產生一個隨機 UUID 作為匿名標識符，儲存在全域設定中。

#### 場景：第一次遙測事件
- **何時** 發送第一個遙測事件
- **且** 設定中不存在anonymousId
- **然後** 系統產生一個隨機 UUID v4 並將其儲存在設定中

#### 場景：持久身份
- **何時** 使用者跨會話執行多個命令
- **那麼** 相同的anonymousId 用於所有事件

#### 場景：具有選擇退出的惰性生成
- **何時** 使用者在執行任何命令之前選擇退出
- **那麼** 不會產生或儲存任何anonymousId

### 需求：立即發送事件
系統應立即發送遙測事件而不進行批次處理，使用 `flushAt: 1` 和 `flushInterval: 0` configuration.

#### 場景：事件傳輸時序
- **何時** 命令執行
- **然後** 遙測事件立即發送，而不是排隊進行批量傳輸

### 要求：正常關閉
系統應調用 `posthog.shutdown()` 在 CLI 退出之前確保重新整理待處理事件。

#### 場景：正常退出
- **何時** 命令成功完成
- **然後** 系統等待 `shutdown()` 退出前

#### 場景：錯誤退出
- **何時** 命令因錯誤而失敗
- **THEN** the system still awaits `shutdown()` 退出前

### 需求：靜默故障處理
The system SHALL silently ignore telemetry failures without affecting CLI functionality.

#### 場景：網路故障
- **WHEN** the telemetry request fails due to network error
- **那麼** CLI 指令正常完成，沒有錯誤訊息

#### 場景：PostHog 中斷
- **何時** PostHog 服務不可用
- **那麼** CLI 指令正常完成，沒有錯誤訊息

#### 場景：關機失敗
- **什麼時候** `shutdown()` 失敗或超時
- **然後** CLI 正常退出，沒有錯誤訊息
