## 0. 堆疊協調

- [ ] 0.1 重新調整此變更的最新版本 `main` 實施前
- [ ] 0.2 如果 `simplify-skill-installation` 首先合併，保留其設定/交付模型，並將此更改作為功能感知的細化應用
- [ ] 0.3 如果此變更首先合併，請確保後續變基不會重新引入「命令=刪除所有技能」規則
- [ ] 0.4 如果 `add-global-install-scope` 合併後，驗證組合範圍 × 交付 × 指揮面行為是否保持確定性

## 1. 工具命令面能力模型

- [ ] 1.1 擴充工具元資料 `src/core/config.ts` 具有可選的指揮面功能字段
- [ ] 1.2 定義支援的能力值： `adapter`, `skills-invocable`, `none`
- [ ] 1.3 將特雷標記為 `skills-invocable`
- [ ] 1.4 新增共享功能解析器（首先覆寫顯式元資料，其次根據適配器存在推斷回退）
- [ ] 1.5 增加功能解析的重點單元測試（明確覆蓋、推斷適配器、推斷無）

## 2. Init：能力感知交付計劃

- [ ] 2.1 重構 init 產生邏輯以計算每個工具的有效操作（產生/刪除技能和命令），而不是僅使用全域布林值
- [ ] 2.2 英寸 `delivery=commands`，保留/生成技能 `skills-invocable` 工具，並且不要刪除那些託管技能目錄
- [ ] 2.3 In `delivery=commands`，當任何選定的工具解決時，在寫入之前快速失敗 `none`
- [ ] 2.4 更新 init 輸出以清楚報告有效行為 `skills-invocable` 工具（用作命令介面的技能）
- [ ] 2.5 確保 init 不再為有意使用的工具報告“無適配器” `skills-invocable`
- [ ] 2.6 新增/調整初始化測試 `delivery=commands` + `trae` （保留/產生技能，無適配器錯誤），混合工具（`claude,trae`）以及每個工具的預期輸出，以及不支援的命令面的確定性故障路徑（`none`)

## 3.更新：能力感知同步與漂移偵測

- [ ] 3.1 重構更新同步邏輯以應用每個工具功能的交付行為（不是每次執行全域）
- [ ] 3.2 在 `delivery=commands`，保留/生成管理技能 `skills-invocable` 工具
- [ ] 3.3 在 `delivery=commands`，當設定的工具包括 `none` 命令面
- [ ] 3.4 更新設定檔/交付漂移偵測以避免永久漂移 `skills-invocable` 命令交付下的工具
- [ ] 3.5 確保設定工具偵測仍包括 `skills-invocable` 當管理技能存在時，命令交付下的工具
- [ ] 3.6 更新摘要輸出，以便將技能可呼叫行為報告為預期行為（不是隱含跳過/錯誤）
- [ ] 3.7 新增/調整更新測試 `delivery=commands` + 設定 Trae（保留/生成技能）、冪等二次更新（無虛假漂移循環）、混合設定工具（`claude` + `trae`），以及不支援的命令面的確定性預檢失敗（`none`)

## 4. 使用者體驗與錯誤訊息

- [ ] 4.1 新增互動式初始化相容性說明 `delivery=commands` 當選定的工具包括 `skills-invocable`
- [ ] 4.2 新增具有不相容工具 ID 的確定性非互動式錯誤文字和建議的替代方案（`both` 或者 `skills`)
- [ ] 4.3 對齊 init 和 update 措辭，使與功能相關的行為/訊息保持一致

## 5. 文件更新

- [ ] 5.1 更新 `docs/supported-tools.md` 記錄 Trae 的命令表面語義並闡明交付交互
- [ ] 5.2 更新 `docs/cli.md` 交付指南，解釋能力感知行為 `delivery=commands`
- [ ] 5.3 為「僅指令+不支援的工具」故障新增簡短的故障排除說明

## 6. 驗證

- [ ] 6.1 執行有針對性的測試： `test/core/init.test.ts` 和 `test/core/update.test.ts`
- [ ] 6.2 執行此變更中新增的任何新功能/單元測試文件
- [ ] 6.3 執行完整的測試套件（`pnpm test`）並解決迴歸問題
- [ ] 6.4 手動排煙檢查： `openspec init --tools trae` 和 `delivery=commands`
- [ ] 6.5 手動排煙檢查：混合工具（`claude,trae`） 和 `delivery=commands`
