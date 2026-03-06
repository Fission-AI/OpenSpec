## 1. 設定

- [x] 1.1 添加 `posthog-node` 打包為依賴項
- [x] 1.2 建立 `src/telemetry/` 模組目錄
- [x] 1.3 新增PostHog API關鍵設定（環境變數或嵌入）

## 2. 全域設定

- [x] 2.1 建立或擴充全域設定模組 `~/.config/openspec/config.json`
- [x] 2.2 實作保留現有組態欄位的讀/寫函數
- [x] 2.3 定義遙測設定結構（`anonymousId`, `noticeSeen`)

## 3. 核心遙測模組

- [x] 3.1 實施 `isTelemetryEnabled()` 檢查 `OPENSPEC_TELEMETRY`, `DO_NOT_TRACK`， 和 `CI` 環境變數
- [x] 3.2 實施 `getOrCreateAnonymousId()` 具有惰性 UUID 生成
- [x] 3.3 初始化 PostHog 用戶端 `flushAt: 1` 和 `flushInterval: 0`
- [x] 3.4 實施 `trackCommand(commandName, version)` 和 `$ip: null`
- [x] 3.5 實施 `shutdown()` 使用 try/catch 進行靜默故障處理

## 4. 首輪通知

- [x] 4.1 實施 `maybeShowTelemetryNotice()` 功能
- [x] 4.2 檢查 `noticeSeen` 顯示通知前標記
- [x] 4.3 顯示通知文字：“注意：OpenSpec 收集匿名使用統計資料。選擇退出：OPENSPEC_TELEMETRY=0”
- [x] 4.4 更新 `noticeSeen` 在首次顯示後的設定中

## 5.CLI整合

- [x] 5.1 添加Commander.js `preAction` 掛鉤顯示通知和追蹤命令
- [x] 5.2 添加Commander.js `postAction` 掛鉤調用關閉
- [x] 5.3 處理子命令路徑提取（例如， `change:apply`)

## 6. 測試

- [x] 6.1 測試選擇退出通過 `OPENSPEC_TELEMETRY=0`
- [x] 6.2 測試選擇退出通過 `DO_NOT_TRACK=1`
- [x] 6.3 CI環境下測試自動停用
- [x] 6.4 測試首次執行通知顯示和noticeSeen持久化
- [x] 6.5 測試匿名ID產生和持久化
- [x] 6.6 測試網路錯誤的靜默失敗（模擬 PostHog）

## 7. 文檔

- [x] 7.1 將遙測揭露部分加到README
- [x] 7.2 記錄選擇退出方法（`OPENSPEC_TELEMETRY=0`, `DO_NOT_TRACK=1`)
- [x] 7.3 記錄收集和未收集的資料
