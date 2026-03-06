## 1. 核心實現

- [x] 1.1 建立 `src/core/global-config.ts` 具有路徑分辨率
  - 實施 `getGlobalConfigDir()` 遵循 XDG 規範
  - 支援 `$XDG_CONFIG_HOME` 環境變數覆蓋
  - 特定於平台的回退（Unix： `~/.config/`，Windows： `%APPDATA%`)
- [x] 1.2 為設定形狀定義TypeScript接口
  - `GlobalConfig` 帶有可選字段的接口
  - 開始最少：只是 `featureFlags?: Record<string, boolean>`
- [x] 1.3 實作預設設定載入
  - `getGlobalConfig()` - 讀取 config.json（如果存在），並與預設值合併
  - 讀取時不建立目錄/檔案（延遲初始化）
- [x] 1.4 實現設定保存
  - `saveGlobalConfig(config)` - writes config.json, creates directory if needed

## 2. 整合

- [x] 2.1 導出新模組 `src/core/index.ts`
- [x] 2.2 新增設定檔名和目錄名常數

## 3. 測試

- [x] 3.1 目前平台下手動測試路徑解析
- [x] 3.2 有/無測試 `$XDG_CONFIG_HOME` 放
- [x] 3.3 檔案不存在時測試設定載入（應返回預設值）
- [x] 3.4 單元測試 `test/core/global-config.test.ts` （18 次測試）
