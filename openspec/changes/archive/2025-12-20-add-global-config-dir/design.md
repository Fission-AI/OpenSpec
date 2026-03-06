## 情境

OpenSpec 需要一個用於跨平台工作並遵循既定約定的使用者級設定的標準位置。這將作為設定、功能標誌和未來工件（如工作流程或範本）的基礎。

## 目標/非目標

**目標：**
- 為全域設定提供一個明確定義的位置
- 遵循 XDG 基本目錄規範（被 CLI 工具廣泛採用）
- 支援跨平台使用（Unix、macOS、Windows）
- 保持最少的實施—只是基礎
- 啟用未來擴充（快取、狀態、工作流程）

**非目標：**
- 專案本地設定覆蓋（不在範圍內）
- 設定檔遷移工具
- 設定驗證CLI命令
- 多個設定檔

## 決定

### 路徑解析策略

**決定：** 使用具有平台回退的 XDG 基本目錄規格。

```
Unix/macOS: $XDG_CONFIG_HOME/openspec/ or ~/.config/openspec/
Windows:    %APPDATA%/openspec/
```

**理由：**
- XDG 是 CLI 工具的事實標準（由 gh、bat、ripgrep 等使用）
- 環境變數覆蓋允許使用者自訂
- Windows 使用其本機約定 (%APPDATA%) 以獲得更好的集成

**考慮的替代方案：**
- `~/.openspec/` - 簡單但混亂的主目錄
- `~/Library/Application Support/` 在 macOS 上 - 對於 CLI 工具來說太過分了

### 設定檔格式

**決定：** JSON (`config.json`)

**理由：**
- 本機 Node.js 支援（無依賴項）
- 人類可讀和可編輯
- 類型安全，TypeScript
- 符合project.md的「最小依賴」原則

**考慮的替代方案：**
- YAML - 需要依賴，編輯更容易出錯
- TOML - 在 Node.js 生態系中較不常見
- 僅環境變數 - 對於結構化設定來說太有限

### 設定模式

**決定：** 具有類型化欄位的扁平結構，從最小限度開始。

```typescript
interface GlobalConfig {
  featureFlags?: Record<string, boolean>;
}
```

**理由：**
- `featureFlags` 實現新功能的受控推出
- 具有預設值的可選欄位可避免重大更改
- 扁平化結構易於理解和擴展

### 載入策略

**決定：** 每次呼叫時從磁碟讀取，不緩存。

```typescript
export function getGlobalConfig(): GlobalConfig {
  return loadConfigFromDisk();
}
```

**理由：**
- CLI 指令是短暫的；快取增加了複雜性卻沒有任何好處
- 讀取 JSON 小檔案大約需要 1ms；開銷可以忽略不計
- 始終返回新鮮資料；沒有快取失效問題
- 更簡單的實施

### 目錄建立

**Decision:** Create directory only when saving, not when reading.

**理由：**
- 不要在讀取操作時建立空目錄
- 從不儲存設定的使用者不會有不必要的目錄
- 符合最小意外原則

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| 設定檔損壞 | 傳回解析錯誤的預設值，日誌警告 |
| 權限問題 | 儲存前檢查寫入權限，清除錯誤訊息 |
| 未來的架構變化 | 使用可選字段，如果稍後需要添加版本字段 |

## 開放式問題

無——這個提議是有意最小化的。
