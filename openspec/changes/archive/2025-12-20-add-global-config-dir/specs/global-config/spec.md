## 新增要求

### 需求：全域設定目錄路徑

系統應依照 XDG 基本目錄規格以及特定於平台的回退來解析全域設定目錄路徑。

#### 場景：設定了 XDG_CONFIG_HOME 的 Unix/macOS
- **什麼時候** `$XDG_CONFIG_HOME` 環境變數設定為 `/custom/config`
- **然後** `getGlobalConfigDir()` 回報 `/custom/config/openspec`

#### 場景：Unix/macOS 沒有 XDG_CONFIG_HOME
- **什麼時候** `$XDG_CONFIG_HOME` 環境變數沒有設定
- **且** 平台為 Unix 或 macOS
- **然後** `getGlobalConfigDir()` 回報 `~/.config/openspec` （擴展為絕對路徑）

#### 場景：Windows平台
- **何時** 平台是 Windows
- **和** `%APPDATA%` 設定為 `C:\Users\User\AppData\Roaming`
- **然後** `getGlobalConfigDir()` 回報 `C:\Users\User\AppData\Roaming\openspec`

### 要求：全域設定加載

當設定檔不存在或無法解析時，系統應從組態目錄載入具有合理預設值的全域設定。

#### 場景：設定檔存在且有效
- **什麼時候** `config.json` 存在於全域設定目錄中
- **並且** 該檔案包含與設定架構相符的有效 JSON
- **然後** `getGlobalConfig()` 返回解析後的設定

#### 場景：設定檔不存在
- **什麼時候** `config.json` 全域設定目錄中不存在
- **然後** `getGlobalConfig()` 回傳預設設定
- **且** 沒有建立目錄或文件

#### 場景：設定檔無效JSON
- **什麼時候** `config.json` 存在但包含無效的 JSON
- **然後** `getGlobalConfig()` 回傳預設設定
- **並且** 警告會記錄到 stderr

### 要求：全域設定保存

系統應將全域設定儲存到 config 目錄，如果該目錄不存在則建立該目錄。

#### 場景：將設定儲存到新目錄
- **什麼時候** `saveGlobalConfig(config)` 被稱為
- **且**全域設定目錄不存在
- **然後** 目錄已建立
- **和** `config.json` 是用提供的設定編寫的

#### 場景：將設定儲存到現有目錄
- **什麼時候** `saveGlobalConfig(config)` 被稱為
- **並且**全域設定目錄已經存在
- **然後** `config.json` 已寫入（如果存在則覆蓋）

### 需求：預設設定

系統應提供在不存在設定檔時使用的預設設定。

#### 場景：預設設定結構
- **何時** 不存在設定檔
- **那麼** 預設設定包含一個空的 `featureFlags` 目的

### 需求：設定架構演變

系統應將載入的設定與預設值合併，以確保即使載入舊的設定檔，新的設定欄位也可用。

#### 場景：設定檔缺少新字段
- **什麼時候** `config.json` 存在於 `{ "featureFlags": {} }`
- **並且** 目前架構包含一個新字段 `defaultAiTool`
- **然後** `getGlobalConfig()` 回報 `{ featureFlags: {}, defaultAiTool: <default> }`
- **且** 載入的值優先於兩者中都存在的欄位的預設值

#### 場景：設定檔有額外的未知字段
- **什麼時候** `config.json` 包含不在目前模式中的字段
- **那麼** 未知欄位將保留在傳回的設定中
- **並且** 不會出現錯誤或警告
