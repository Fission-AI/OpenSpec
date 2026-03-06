## 為什麼

OpenSpec 目前假定命令傳遞直接對應到命令適配器。該假設並不適用於所有工具。

Trae 是一個具體的例子：它透過技能條目呼叫 OpenSpec 工作流程（例如 `/openspec-new-change`）而不是適配器產生的命令檔。在這個模型中，技能是命令面。

如今，這造成了行為差距：

- `delivery=commands` 可以刪除技能
- 沒有適配器的工具會跳過命令生成
- 結果：像 Trae 這樣的選取工具最終可能沒有可呼叫的工作流程工件

這不僅僅是一個提示使用者體驗問題，因為非互動式和 CI 流程繞過了互動式指導。我們在核心生成邏輯中需要一個能力感知模型。

## 有什麼變化

### 1. 新增顯式命令面功能元資料

在工具元資料中新增可選欄位來描述工具如何公開命令：

- `adapter`：命令檔案是透過命令適配器產生的
- `skills-invocable`：技能可以直接作為命令調用
- `none`: 無 OpenSpec 指令面

字段應該是可選的。預設行為是從適配器註冊表的存在推斷出來的：具有已註冊適配器的工具解析為 `adapter`;沒有適配器註冊和沒有明確註釋的工具解析為 `none`.
功能值使用短橫線大小寫的字串標記來與序列化元資料約定保持一致。

初始顯式覆蓋：

- 特雷-> `skills-invocable`

### 2. 使交付行為具有能力感知能力

更新 `init` 和 `update` 計算每個工具的有效工件操作：

- 全球配送（`both | skills | commands`)
- 工具命令面功能

行為矩陣：

- `both`:
  - 為所有工具產生技能 `skillsDir` （包括 `skills-invocable`)
  - 僅生成命令文件 `adapter` 工具
  - `none`：無神器動作；可能會發出相容性警告
- `skills`:
  - 為所有工具產生技能 `skillsDir` （包括 `skills-invocable`)
  - 刪除適配器產生的命令文件
  - `none`：無神器動作；可能會發出相容性警告
- `commands`:
  - `adapter`：產生指令，移除技能
  - `skills-invocable`：產生（或保留，如果是最新的）技能作為命令介面；不要刪除它們
  - `none`：快速失敗並出現明顯錯誤

### 3.加入預檢驗證和更清晰的輸出

在寫入/刪除工件之前，根據交付模式驗證所選/設定的工具：

- 互動流程：確認前顯示清晰的相容性說明
- non-interactive flow: fail with deterministic error listing incompatible tools and supported alternatives

更新摘要以顯示每個工具的有效交付結果（例如，當命令模式仍然為技能呼叫工具安裝技能時）。

### 4.更新文件和測試

- 文件能力模型和交付模式下的 Trae 行為
- 確保 CLI 文件和支援的工具文件反映有效的行為
- 新增測試覆蓋範圍：
  - `init --tools trae` 和 `delivery=commands`
  - `update` Trae 設定如下 `delivery=commands`
  - 混合選擇（`claude + trae`) 跨越所有交付模式
  - 沒有命令介面的工具的明確錯誤路徑 `delivery=commands`

### 5. 與安裝範圍行為協調

當與 `add-global-install-scope`，初始化/更新計劃必須組成：

- 安裝範圍（`global | project`)
- 交貨方式（`both | skills | commands`)
- 指揮面能力（`adapter | skills-invocable | none`)

實施測試應涵蓋混合工具矩陣，以確保兩個變更都處於活動狀態時的確定性行為。

## 能力

### 新功能

- `tool-command-surface`：將工具分類為的能力模型 `adapter`, `skills-invocable`， 或者 `none` 推動交付行為

### 修改後的功能

- `cli-init`：透過預檢相容性驗證，交付處理變得具有工具功能意識
- `cli-update`：交付同步變得具有工具功能意識，具有一致的兼容性驗證和訊息傳遞
- `supported-tools-docs`：記錄非適配器工具的命令表面語義

## 影響

- `src/core/config.ts` - 新增可選的命令表面元資料和 Trae 覆蓋
- `src/core/command-generation/registry.ts` （或共享助手） - 根據適配器存在進行能力推斷
- `src/core/init.ts` - 能力感知的產生/刪除計畫+相容性驗證+摘要訊息傳遞
- `src/core/update.ts` - 能力感知同步/刪除計畫+相容性驗證+摘要訊息傳遞
- `src/core/shared/tool-detection.ts` - 包括能力感知檢測，以便 `skills-invocable` 工具仍然可檢測到 `delivery=commands`， 和 `none` 工具被排除在命令表面偽影檢測之外
- `docs/supported-tools.md` 和 `docs/cli.md` - 文件傳遞行為和相容性說明
- `test/core/init.test.ts` 和 `test/core/update.test.ts` - 新增技能呼叫行為和混合工具交付場景的覆蓋範圍

## 排序註釋

- 此更改旨在安全地堆疊 `simplify-skill-installation` 透過引入附加的、特定於功能的初始化/更新要求。
- 如果 `simplify-skill-installation` 首先合併，應該重新調整此變更的基礎，並將能力感知規則作為事實來源 `delivery=commands` 行為上 `skills-invocable` tools.
- 如果此變更首先合併，則 `simplify-skill-installation` 應重新調整分支基礎，以避免重新引入全局「僅命令意味著所有工具都沒技能」的假設。
- 如果 `add-global-install-scope` 首先合併，應該重新調整此變更的基礎，以在該變更的範圍解析路徑決策之上組成功能感知行為。
- 如果此變更首先合併， `add-global-install-scope` 應重新調整基礎以保留第 5 節的構成規則（`install scope` + `delivery mode` + `command surface capability`）而不覆蓋能力感知的命令面結果。
