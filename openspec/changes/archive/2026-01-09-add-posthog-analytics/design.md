## 情境

OpenSpec 需要使用情況分析來瞭解採用情況並為產品決策提供資訊。 PostHog 提供了一個適合開源專案的注重隱私的分析平台。

## 目標/非目標

**目標：**
- 追蹤每日/每週/每月的活躍使用情況
- 瞭解指令使用模式
- 保持最少的實施並尊重隱私
- 以最小的摩擦實現選擇退出

**非目標：**
- 詳細的錯誤追蹤或診斷
- 使用者識別或分析
- 複雜的事件層次結構
- 用於遙測管理的完整 CLI 命令（env var 目前足夠）

## 決定

### 選擇退出模型

**決定：** 預設啟用遙測，透過環境變數選擇退出。

```bash
OPENSPEC_TELEMETRY=0    # Disable telemetry
DO_NOT_TRACK=1          # Industry standard, also respected
```

自動停用時 `CI=true` 被檢測到。

**理由：**
- 選擇加入通常會產生約 3% 的參與度——對於有意義的資料來說還不夠
- 瞭解使用模式需要統計上顯著的樣本量
- 環境變數選擇退出簡單且立即
- 尊重 `DO_NOT_TRACK` 遵循行業慣例

**考慮的替代方案：**
- 僅選擇加入 - 用於產品決策的資料不足
- 設定檔設定 - 更複雜，環境變數足以滿足 MVP
- 滿的 `openspec telemetry` 命令 - 如果用戶請求可以稍後添加

### 活動設計

**決定：** 具有最少屬性的單一事件類型。

```typescript
{
  event: 'command_executed',
  properties: {
    command: 'init',      // Command name only
    version: '1.2.3'      // OpenSpec version
  }
}
```

**理由：**
- 回答核心問題：使用量有多大、哪些指令流行
- PostHog 根據一段時間內的匿名使用者計數得出 DAU/WAU/MAU
- 沒有爭論、路徑或內容——乾淨的隱私故事
- 披露通知中易於解釋

**未追蹤：**
- 命令參數
- 文件路徑或內容
- 錯誤訊息或堆疊追蹤
- 項目名稱或規格內容
- IP 位址（`$ip: null` 明確設定）

### 匿名ID

**決定：** 隨機 UUID，在第一次遙測發送時延遲生成，儲存在全域設定中。

```typescript
// ~/.config/openspec/config.json
{
  "telemetry": {
    "anonymousId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

**理由：**
- 隨機 UUID 與人無關－無法逆轉
- 儲存在設定中，因此相同的使用者 = 跨會話的相同 ID（DAU/WAU/MAU 需要）
- 延遲產生意味著如果使用者在第一個命令之前選擇退出，則不會建立 ID
- 使用者可以刪除設定來重置身份

**考慮的替代方案：**
- 機器派生的哈希（主機名稱、MAC） - 感覺具有侵入性，類似於指紋
- 每個會話 UUID - 完全破壞使用者計數指標

### SDK設定

**決定：** PostHog Node SDK 具有立即重新整理、退出時關閉的功能。

```typescript
const posthog = new PostHog(API_KEY, {
  flushAt: 1,        // Send immediately, don't batch
  flushInterval: 0   // No timer-based flushing
});

// Before CLI exits
await posthog.shutdown();
```

**理由：**
- CLI進程是短暫的；批次會遺失事件
- `flushAt: 1` 確保每個事件立即發送
- `shutdown()` 確保進程退出前重新整理
- 退出時間增加約 100-300 毫秒 — 對於典型的 CLI 工作流程來說可以忽略不計

**錯誤處理：**
- 網路故障默默地被忽略（遙測不應中斷CLI）
- `shutdown()` 包裹在 try/catch 中

### 掛鉤位置

**決定：** Commander.js `preAction` 和 `postAction` hooks.

```typescript
program
  .hook('preAction', (thisCommand) => {
    maybeShowTelemetryNotice();
    trackCommand(thisCommand.name(), VERSION);
  })
  .hook('postAction', async () => {
    await shutdown();
  });
```

**理由：**
- 集中式－所有遙測邏輯都集中在一個地方
- 自動 - 無需更改程式碼即可追蹤新命令
- 乾淨的分離－指令處理程序不瞭解遙測技術

**子命令處理：**
- 追蹤嵌套命令的完整命令路徑（例如， `change:apply`)

### 首輪通知

**決定：** 第一個指令的一行，在設定中儲存「已看到」標誌。

```
Note: OpenSpec collects anonymous usage stats. Opt out: OPENSPEC_TELEMETRY=0
```

**理由：**
- 第一個命令（不僅僅是 `init`) 確保通知始終可見
- 非阻塞－無提示，僅提供資訊
- 一行字可見但不侵擾
- 在設定中儲存“seen”可防止重複顯示

**首次執行後的設定：**
```json
{
  "telemetry": {
    "anonymousId": "...",
    "noticeSeen": true
  }
}
```

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| 用戶更喜歡選擇加入 | 明確揭露、輕鬆選擇退出、收集內容透明 |
| GDPR 擔憂 | 沒有個人資料，沒有IP，用戶可以刪除設定 |
| CLI 退出速度減慢約 200 毫秒 | 對於大多數工作流程來說可以忽略不計；如果需要可以最佳化 |
| PostHog 中斷影響 CLI | 超時即發即棄；失敗是無聲的 |

## 開放式問題

無——設計有意做到極簡。可根據使用者回饋添加未來的增強功能（專用指令、工作流程追蹤）。
