## 為什麼

OpenSpec 目前無法瞭解該工具的使用方式。沒有分析，我們就無法：
- 瞭解哪些命令和功能對使用者最有價值
- 衡量採用和使用模式
- 做出有關產品開發的資料驅動決策

新增 PostHog 分析可以實現產品洞察，同時透過透明、選擇退出的遙測尊重用戶隱私。

## 有什麼變化

- 新增 PostHog Node.js SDK 作為依賴項
- 實施具有環境變數選擇退出的遙測系統
- 追蹤命令使用情況（僅命令名稱和版本）
- 顯示首次執行通知，告知用戶有關遙測的信息
- 將匿名 ID 儲存在全域設定中（`~/.config/openspec/config.json`)
- 尊重 `DO_NOT_TRACK` 和 `OPENSPEC_TELEMETRY=0` 環境變數
- 在 CI 環境中自動停用

## 能力

### 新功能

- `telemetry`：使用 PostHog 進行匿名使用分析。涵蓋命令追蹤、選擇退出控制和首次執行披露通知。

### 修改後的功能

- `global-config`：新增遙測狀態儲存（匿名ID，通知可見標誌）

## 影響

- **依賴項**：新增 `posthog-node` 包裹
- **Privacy**: Opt-out via env var, no personal data collected, clear disclosure
- **設定**：遙測狀態的新全域設定字段
- **網路**：非同步事件發送並退出時重新整理（新增了~100-300ms）
- **CI/CD**：遙測自動停用 `CI=true`
- **文件**：透過遙測揭露更新 README
