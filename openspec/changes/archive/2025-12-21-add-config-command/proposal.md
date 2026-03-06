## 為什麼

使用者需要一種方法來檢視和修改其全域 OpenSpec 設置，而無需手動編輯 JSON 檔案。這 `global-config` 規範提供了基礎，但沒有面向使用者的介面來與設定互動。一個專門的 `openspec config` 命令提供了可發現性和易用性。

## 有什麼變化

添加 `openspec config` 具有以下操作的子命令：

```bash
openspec config path                          # Show config file location
openspec config list [--json]                 # Show all current settings
openspec config get <key>                     # Get a specific value (raw, scriptable)
openspec config set <key> <value> [--string]  # Set a value (auto-coerce types)
openspec config unset <key>                   # Remove a key (revert to default)
openspec config reset --all [-y]              # Reset everything to defaults
openspec config edit                          # Open config in $EDITOR
```

**關鍵設計決策：**
- **鍵命名**：使用駝峰命名法來匹配 JSON 結構（例如， `featureFlags.someFlag`)
- **嵌套鍵**：支援巢狀存取的點表示法
- **類型強制**：預設自動偵測類型； `--string` 標誌強製字串存儲
- **可編寫腳本的輸出**： `get` 僅列印原始值（無標籤）以方便管道
- **Zod 驗證**：使用 zod 進行設定模式驗證和類型安全
- **面向未來**：儲備 `--scope global|project` 潛在專案本地設定的標誌

**使用範例：**
```bash
$ openspec config path
/Users/me/.config/openspec/config.json

$ openspec config list
featureFlags: {}

$ openspec config set featureFlags.enableTelemetry false
Set featureFlags.enableTelemetry = false

$ openspec config get featureFlags.enableTelemetry
false

$ openspec config list --json
{
  "featureFlags": {}
}

$ openspec config unset featureFlags.enableTelemetry
Unset featureFlags.enableTelemetry (reverted to default)

$ openspec config edit
# Opens $EDITOR with config.json
```

## 影響

- 受影響的規格：新 `cli-config` 能力
- 受影響的代碼：
  - 新的 `src/commands/config.ts`
  - 新的 `src/core/config-schema.ts` （zod 模式）
  - Update CLI entry point to register config command
- 依賴關係：需要 `global-config` 規範（已實施）
