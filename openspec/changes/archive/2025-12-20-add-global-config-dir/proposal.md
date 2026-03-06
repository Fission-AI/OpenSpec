## 為什麼

OpenSpec 目前沒有使用者層級全域設定或功能標誌的機制。隨著 CLI 的成長，我們需要一個標準位置來儲存使用者首選項、實驗功能以及其他跨專案持續存在的設定。遵循 XDG 基本目錄規範提供了一種易於理解的跨平台方法。

## 有什麼變化

- 新增新的 `src/core/global-config.ts` 模組：
  - 路徑解析遵循 XDG 基本目錄規範 (`$XDG_CONFIG_HOME/openspec/` 或後備）
  - 跨平台支援（Unix、macOS、Windows）
  - 使用合理的預設值進行延遲設定加載
  - TypeScript 設定形狀類型
- 匯出全域設定目錄路徑 getter 以供將來使用（工作流程、範本、快取）
- 初始設定架構僅支援 1-2 個設定/功能標誌

## 影響

- 受影響的規格：新 `global-config` 能力（未修改現有規格）
- 受影響的代碼：
  - 新的 `src/core/global-config.ts`
  - 更新 `src/core/index.ts` 匯出新模組
