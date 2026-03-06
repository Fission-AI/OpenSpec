## 情境

這 `global-config` 規範定義 OpenSpec 如何讀/寫 `config.json`，但用戶目前必須手動編輯它。此命令為該設定提供 CLI 介面。

## 目標/非目標

**目標：**
- 為設定管理提供可發現的CLI
- 支援具有機器可讀輸出的腳本
- 使用 zod 架構驗證設定更改
- 優雅地處理嵌套鍵

**非目標：**
- 專案本地設定（保留供將來通過 `--scope` 旗幟）
- 複雜查詢（JSON路徑、過濾）
- 設定檔格式遷移

## 決定

### 鍵命名：帶有有點表示法的駝峰命名法

**決定：** 鍵使用駝峰命名法來匹配 JSON 結構，並使用點表示法進行巢狀。

**理由：**
- 搭配實際的 JSON 鍵（無翻譯層）
- 點表示法直觀且廣泛使用（lodash、jq、kubectl）
- 避免支援多種外殼樣式的複雜性

**範例：**
```bash
openspec config get featureFlags              # Returns object
openspec config get featureFlags.experimental # Returns nested value
openspec config set featureFlags.newFlag true
```

### 類型強制：自動檢測 `--string` 覆蓋

**決策：** 自動解析值；提供 `--string` 強製字串儲存的標誌。

**理由：**
- 對於常見情況最直觀（`true`, `false`, `123`)
- 邊緣情況的明確覆蓋（儲存文字字串“true”）
- 遵循 npm/yarn 設定模式

**強制規則：**
| 輸入 | 儲存為 |
|-------|-----------|
| `true`, `false` | 布林值 |
| 數字字串 (`123`, `3.14`) | 數位 |
| 其他一切 | 細繩 |
| 任何值與 `--string` | 細繩 |

### 輸出格式：預設為原始

**決定：** `get` 僅列印原始值。 `list` 預設列印 YAML 類似格式，JSON 與 `--json`.

**理由：**
- 原始輸出啟用管道： `VAR=$(openspec config get key)`
- YAML-like 是人類可讀的檢查
- JSON 用於自動化/腳本編寫

### 模式驗證：具有未知字段直通的 Zod

**Decision:** Use zod for validation but preserve unknown fields per `global-config` spec.

**理由：**
- 已知欄位的類型安全
- 向前相容性（舊CLI不會破壞新設定）
- 遵循現有的 `global-config` 規格要求

### 保留標誌： `--scope`

**決定：** 保留 `--scope global|project` 但僅實施 `global` initially.

**理由：**
- 如果稍後新增專案本地設定，可以避免重大更改
- 如果有人嘗試，請清除錯誤訊息 `--scope project`

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| 點符號與包含點的鍵衝突 | 實務上很少見；文件限制 |
| 類型強制令人驚訝 | `--string` 逃生艙口；文件規則 |
| $EDITOR 未設置 | 檢查並提供有用的錯誤訊息 |

## 開放式問題

無 - 設計很簡單。
